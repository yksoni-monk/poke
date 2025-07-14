import numpy as np
import json
import os
from PIL import Image, ImageEnhance
import requests
from io import BytesIO
import torch
from transformers import CLIPProcessor, CLIPModel
import hashlib
import pickle
import pandas as pd
from pathlib import Path

# Create cache directory
CACHE_DIR = Path("embedding_cache")
CACHE_DIR.mkdir(exist_ok=True)

class ImageEmbeddingModel:
    """Singleton class to manage CLIP model and processor."""
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            # Force CPU to save memory
            cls._instance.device = torch.device("cpu")
            # Use smaller model for memory efficiency
            cls._instance.model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32").to(cls._instance.device)
            cls._instance.processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32", use_fast=False)
            cls._instance.cache_dir = CACHE_DIR
            cls._instance.embedding_file = os.path.join(cls._instance.cache_dir, "embeddings.npy")
            cls._instance.metadata_file = os.path.join(cls._instance.cache_dir, "image_metadata.json")
        return cls._instance

def preprocess_image(image):
    """
    Preprocess image for CLIP: crop borders, resize, and sharpen.

    Args:
        image (PIL.Image.Image): Input image.

    Returns:
        PIL.Image.Image: Preprocessed image.
    """
    # Convert to RGB
    image = image.convert("RGB")
    
    # Crop 10% from each edge
    width, height = image.size
    left = width * 0.1
    top = height * 0.1
    right = width * 0.9
    bottom = height * 0.9
    image = image.crop((left, top, right, bottom))
    
    # Resize to 224x224 (CLIP input size)
    image = image.resize((224, 224), Image.Resampling.LANCZOS)
    
    # Apply slight sharpening
    enhancer = ImageEnhance.Sharpness(image)
    image = enhancer.enhance(1.5)  # Moderate sharpening
    
    return image

def get_image_embedding(image_content, use_cache=True):
    """
    Get image embedding using CLIP model locally with optional caching.

    Args:
        image_content (PIL.Image.Image): Input image as a PIL Image object.
        use_cache (bool): Whether to use caching for embeddings.

    Returns:
        numpy.ndarray: Normalized 1D embedding (768D for CLIP), or None if invalid.
    """
    if not isinstance(image_content, Image.Image):
        raise ValueError("image_content must be a PIL Image object")

    try:
        clip = ImageEmbeddingModel()
        model = clip.model
        processor = clip.processor
        device = clip.device

        if use_cache:
            img_bytes = BytesIO()
            image_content.save(img_bytes, format="PNG")
            cache_key = hashlib.sha256(img_bytes.getvalue()).hexdigest()
            cache_path = os.path.join(clip.cache_dir, f"{cache_key}.pkl")

            if os.path.exists(cache_path):
                with open(cache_path, 'rb') as f:
                    embedding = pickle.load(f)
                    if np.any(np.isnan(embedding)) or np.any(np.isinf(embedding)):
                        os.remove(cache_path)
                    else:
                        return embedding

        image = preprocess_image(image_content)
        inputs = processor(images=image, return_tensors="pt", padding=True).to(device)

        with torch.no_grad():
            image_features = model.get_image_features(**inputs)

        norm = image_features.norm(dim=1, keepdim=True)
        if norm == 0:
            print("Warning: Zero-norm embedding detected, skipping.")
            return None
        image_features = image_features / norm

        embedding = image_features[0].cpu().numpy().astype(np.float32)
        if np.any(np.isnan(embedding)) or np.any(np.isinf(embedding)):
            print("Warning: Invalid embedding (NaN/inf), skipping.")
            return None

        if use_cache:
            with open(cache_path, 'wb') as f:
                pickle.dump(embedding, f)

        return embedding

    except Exception as e:
        print(f"Error computing embedding: {e}")
        return None

def embedding_image_similarity(image_path):
    """
    Perform similarity search to find the top 10 matching card IDs using NumPy.

    Args:
        image_path (str): Path to the query image (local path or URL).

    Returns:
        list: Top 10 matching card IDs from the database.
    """
    clip = ImageEmbeddingModel()
    embedding_file = clip.embedding_file
    print(f"Embedding file: {embedding_file}")
    metadata_file = clip.metadata_file
    print(f"Metadata file: {metadata_file}")

    if not os.path.exists(embedding_file) or not os.path.exists(metadata_file):
        raise FileNotFoundError("Embeddings or metadata file not found.")

    # Load embeddings in chunks to save memory
    embeddings = np.load(embedding_file, mmap_mode='r').astype('float32')
    with open(metadata_file, 'r') as f:
        image_metadata = json.load(f)

    if len(embeddings) != len(image_metadata):
        raise ValueError("Mismatch between number of embeddings and metadata entries.")

    # Filter out invalid embeddings (process in chunks)
    # Each embedding is 512D float32 = 2KB, so 100 embeddings = 200KB
    chunk_size = 100
    valid_indices = []
    for i in range(0, len(embeddings), chunk_size):
        end_idx = min(i + chunk_size, len(embeddings))
        chunk = embeddings[i:end_idx]
        valid_mask = ~np.any(np.isnan(chunk) | np.isinf(chunk), axis=1)
        valid_indices.extend([j for j in range(i, end_idx) if valid_mask[j - i]])
    
    if len(valid_indices) != len(embeddings):
        print(f"Warning: {len(embeddings) - len(valid_indices)} invalid embeddings found, filtering them out.")
        embeddings = embeddings[valid_indices]
        image_metadata = [image_metadata[i] for i in valid_indices]

    try:
        if image_path.startswith(('http://', 'https://')):
            response = requests.get(image_path, timeout=10)
            response.raise_for_status()
            img = Image.open(BytesIO(response.content))
            img.verify()
            img = Image.open(BytesIO(response.content))
        else:
            img = Image.open(image_path)
            img.verify()
            img = Image.open(image_path)

        query_embedding = get_image_embedding(img)
        if query_embedding is None:
            raise ValueError("Invalid query embedding (zero-norm or NaN/inf).")
        query_embedding = np.array(query_embedding, dtype=np.float32).reshape(1, -1)

    except (requests.RequestException, ValueError, Exception) as e:
        raise RuntimeError(f"Error processing query image {image_path}: {e}")

    if query_embedding.shape[1] != embeddings.shape[1]:
        raise ValueError(f"Query embedding dimension {query_embedding.shape[1]} does not match database embeddings {embeddings.shape[1]}.")

    # Compute similarities in chunks to save memory
    # Each embedding is 512D float32 = 2KB, so 100 embeddings = 200KB
    chunk_size = 100
    all_similarities = []
    
    with np.errstate(all='ignore'):
        for i in range(0, len(embeddings), chunk_size):
            end_idx = min(i + chunk_size, len(embeddings))
            chunk = embeddings[i:end_idx]
            chunk_similarities = np.dot(chunk, query_embedding.T).flatten()
            chunk_similarities = np.nan_to_num(chunk_similarities, nan=-1.0, posinf=1.0, neginf=-1.0)
            chunk_similarities = np.clip(chunk_similarities, -1.0, 1.0)
            all_similarities.extend(chunk_similarities)
    
    similarities = np.array(all_similarities)
    
    # Find top 10 matches
    top_10_indices = np.argsort(similarities)[-10:][::-1]
    top_similarities = similarities[top_10_indices]
    top_card_ids = [image_metadata[idx]["card_id"] for idx in top_10_indices]

    print(f"Top 10 Card IDs:")
    for i, (idx, sim) in enumerate(zip(top_10_indices, top_similarities), 1):
        print(f"Rank {i}: Card ID: {image_metadata[idx]['card_id']}, Score: {sim:.4f}")

    return top_card_ids

def create_embeddings(card_db_file):
    """
    Create embeddings for images in the card database and save to embeddings.npy and image_metadata.json.

    Args:
        card_db_file (str): Path to CSV file containing card data with 'card image url' and 'card id' columns.
    """
    df = pd.read_csv(card_db_file)

    clip = ImageEmbeddingModel()
    embedding_file = clip.embedding_file
    metadata_file = clip.metadata_file
    embeddings = []
    image_metadata = []

    if os.path.exists(embedding_file):
        print("Embedding file exists, skipping creation.")
        return

    for index, row in df.iterrows():
        image_url = row["card image url"].strip()
        card_id = row["card id"].strip()
        try:
            response = requests.get(image_url, timeout=10)
            response.raise_for_status()
            img = Image.open(BytesIO(response.content))
            img.verify()
            img = Image.open(BytesIO(response.content))

            embedding = get_image_embedding(img)
            if embedding is None:
                print(f"Skipping {image_url}: Invalid embedding.")
                continue
            embedding = np.array(embedding, dtype=np.float32).reshape(1, -1)

            embeddings.append(embedding)
            image_metadata.append({"index": index, "card_id": card_id})

        except (requests.RequestException, ValueError, Exception) as e:
            print(f"Error processing {image_url}: {e}")
            continue

    if embeddings:
        embeddings = np.vstack(embeddings)
        norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
        invalid_norms = norms == 0
        if np.any(invalid_norms):
            print(f"Removing {np.sum(invalid_norms)} embeddings with zero norms.")
            embeddings = embeddings[~invalid_norms.flatten()]
            image_metadata = [meta for i, meta in enumerate(image_metadata) if not invalid_norms[i]]
        if len(embeddings) > 0:
            # Recalculate norms after filtering
            norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
            embeddings = embeddings / norms
            np.save(embedding_file, embeddings)
            with open(metadata_file, 'w') as f:
                json.dump(image_metadata, f)
            print(f"Final save: {len(embeddings)} embeddings")
        else:
            print("No valid embeddings generated")
    else:
        print("No embeddings generated")

def get_image_similarity(image1_path, image2_path):
    """
    Compute cosine similarity between two images.

    Args:
        image1_path (str): Path or URL to first image.
        image2_path (str): Path or URL to second image.

    Returns:
        float: Cosine similarity score (-1 to 1).
    """
    try:
        if image1_path.startswith(('http://', 'https://')):
            response = requests.get(image1_path, timeout=10)
            response.raise_for_status()
            img1 = Image.open(BytesIO(response.content))
            img1.verify()
            img1 = Image.open(BytesIO(response.content))
        else:
            img1 = Image.open(image1_path)
            img1.verify()
            img1 = Image.open(image1_path)

        embedding1 = get_image_embedding(img1)
        if embedding1 is None:
            raise ValueError("Invalid embedding for first image.")

        if image2_path.startswith(('http://', 'https://')):
            response = requests.get(image2_path, timeout=10)
            response.raise_for_status()
            img2 = Image.open(BytesIO(response.content))
            img2.verify()
            img2 = Image.open(BytesIO(response.content))
        else:
            img2 = Image.open(image2_path)
            img2.verify()
            img2 = Image.open(image2_path)

        embedding2 = get_image_embedding(img2)
        if embedding2 is None:
            raise ValueError("Invalid embedding for second image.")

        similarity = np.dot(embedding1, embedding2).item()
        similarity = np.clip(similarity, -1.0, 1.0)

        print(f"Image similarity score: {similarity:.4f}")
        return similarity

    except (requests.RequestException, ValueError, Exception) as e:
        raise RuntimeError(f"Error computing similarity: {e}")