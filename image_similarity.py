import numpy as np
import json
import os
from PIL import Image
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
            cls._instance.device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
            cls._instance.model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32").to(cls._instance.device)
            cls._instance.processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32", use_fast=True)
            cls._instance.cache_dir = CACHE_DIR
        return cls._instance

def get_image_embedding(image_content, use_cache=True):
    """
    Get image embedding using CLIP model locally with optional caching.

    Args:
        image_content (PIL.Image.Image): Input image as a PIL Image object.
        use_cache (bool): Whether to use caching for embeddings.

    Returns:
        numpy.ndarray: Normalized 1D embedding (e.g., 512D for CLIP).
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
                    return pickle.load(f)

        image = image_content.convert("RGB")
        inputs = processor(images=image, return_tensors="pt", padding=True).to(device)

        with torch.no_grad():
            image_features = model.get_image_features(**inputs)

        norm = image_features.norm(dim=1, keepdim=True)
        if norm == 0:
            raise ValueError("Image embedding has zero norm, cannot normalize")
        image_features = image_features / norm

        embedding = image_features[0].cpu().numpy().astype(np.float32)

        if use_cache:
            with open(cache_path, 'wb') as f:
                pickle.dump(embedding, f)

        return embedding

    except Exception as e:
        raise RuntimeError(f"Error computing embedding: {e}")

def embedding_image_similarity(image_path):
    """
    Perform similarity search to find the top 3 matching image URLs for a given image using NumPy.
    
    Args:
        image_path (str): Path to the query image (local path or URL).
    
    Returns:
        list: Top 3 matching image URLs from the database.
    """
    embedding_file = "embeddings.npy"
    metadata_file = "image_metadata.json"

    if not os.path.exists(embedding_file) or not os.path.exists(metadata_file):
        raise FileNotFoundError("Embeddings or metadata file not found.")

    embeddings = np.load(embedding_file).astype('float32')
    with open(metadata_file, 'r') as f:
        image_metadata = json.load(f)

    if len(embeddings) != len(image_metadata):
        raise ValueError("Mismatch between number of embeddings and metadata entries.")

    try:
        if image_path.startswith(('http://', 'https://')):
            response = requests.get(image_path, timeout=10)
            response.raise_for_status()
            img = Image.open(BytesIO(response.content))
            img.verify()
            img = Image.open(BytesIO(response.content))  # Reopen after verify
        else:
            img = Image.open(image_path)
            img.verify()
            img = Image.open(image_path)  # Reopen after verify

        query_embedding = get_image_embedding(img)
        query_embedding = np.array(query_embedding, dtype=np.float32).reshape(1, -1)

    except (requests.RequestException, ValueError, Exception) as e:
        raise RuntimeError(f"Error processing query image {image_path}: {e}")

    if query_embedding.shape[1] != embeddings.shape[1]:
        raise ValueError("Query embedding dimension does not match database embeddings.")

    # Compute cosine similarities (inner product for normalized vectors)
    similarities = np.dot(embeddings, query_embedding.T).flatten()
    
    # Get top 3 indices
    k = 3
    top_indices = np.argsort(similarities)[-k:][::-1]  # Descending order
    top_similarities = similarities[top_indices]
    
    # Retrieve top 3 image URLs
    top_urls = [image_metadata[idx]["url"] for idx in top_indices]
    print(f"Top 3 URLs: {top_urls}")
    return top_urls

def create_embeddings(card_db_file):
    """
    Create embeddings for images in the card database and save to embeddings.npy and image_metadata.json.
    
    Args:
        card_db_file (str): Path to CSV file containing card data with 'card image url' column.
    """
    df = pd.read_csv(card_db_file)

    embedding_file = "embeddings.npy"
    metadata_file = "image_metadata.json"
    embeddings = []
    image_metadata = []

    if os.path.exists(embedding_file):
        return

    for index, row in df.iterrows():
        image_url = row["card image url"].strip()
        try:
            response = requests.get(image_url, timeout=10)
            response.raise_for_status()
            img = Image.open(BytesIO(response.content))
            img.verify()
            img = Image.open(BytesIO(response.content))  # Reopen after verify

            embedding = get_image_embedding(img)
            embedding = np.array(embedding, dtype=np.float32).reshape(1, -1)

            embeddings.append(embedding)
            image_metadata.append({"index": index, "url": image_url})

        except (requests.RequestException, ValueError, Exception) as e:
            print(f"Error processing {image_url}: {e}")
            continue

    if embeddings:
        embeddings = np.vstack(embeddings)
        # Normalize embeddings (same as FAISS)
        embeddings = embeddings / np.linalg.norm(embeddings, axis=1, keepdims=True)
        np.save(embedding_file, embeddings)
        with open(metadata_file, 'w') as f:
            json.dump(image_metadata, f)
        print(f"Final save: {len(embeddings)} embeddings")
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

        similarity = np.dot(embedding1, embedding2).item()

        print(f"Image similarity score: {similarity:.4f}")
        return similarity

    except (requests.RequestException, ValueError, Exception) as e:
        raise RuntimeError(f"Error computing similarity: {e}")