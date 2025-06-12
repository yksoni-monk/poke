import os
import requests
from PIL import Image
import io
import torch
from transformers import CLIPProcessor, CLIPModel
from dotenv import load_dotenv
import hashlib
import json
from pathlib import Path

load_dotenv()

# Use a smaller model for better performance
MODEL_NAME = "openai/clip-vit-base-patch16"  # Smaller than patch32
CACHE_DIR = Path("image_embeddings_cache")

# Create cache directory if it doesn't exist
CACHE_DIR.mkdir(exist_ok=True)

# Initialize CLIP model and processor with CPU optimization
device = "mps" if torch.backends.mps.is_available() else "cpu"
#print(f"Using device: {device}")

model = CLIPModel.from_pretrained(MODEL_NAME).to(device)
processor = CLIPProcessor.from_pretrained(MODEL_NAME)

def get_image_hash(image_path):
    """Generate a hash for the image file to use as cache key"""
    with open(image_path, 'rb') as f:
        return hashlib.md5(f.read()).hexdigest()

def get_cached_embedding(image_path):
    """Try to get embedding from cache"""
    image_hash = get_image_hash(image_path)
    cache_file = CACHE_DIR / f"{image_hash}.json"
    
    if cache_file.exists():
     #   print(f"Using cached embedding for {image_path}")
        with open(cache_file, 'r') as f:
            return torch.tensor(json.load(f))
    return None

def save_embedding_to_cache(image_path, embedding):
    """Save embedding to cache"""
    image_hash = get_image_hash(image_path)
    cache_file = CACHE_DIR / f"{image_hash}.json"
    
    with open(cache_file, 'w') as f:
        json.dump(embedding.tolist(), f)

def get_image_embedding(image_path):
    """
    Get image embedding using CLIP model locally with caching
    """
    # Try to get from cache first
    cached_embedding = get_cached_embedding(image_path)
    if cached_embedding is not None:
        return cached_embedding

    #print(f"Computing embedding for {image_path}")
    # Load and process the image
    image = Image.open(image_path).convert("RGB")
    inputs = processor(images=image, return_tensors="pt", padding=True).to(device)
    
    # Get image features
    with torch.no_grad():
        image_features = model.get_image_features(**inputs)
    
    # Normalize the features
    image_features = image_features / image_features.norm(dim=1, keepdim=True)
    
    # Convert to CPU and numpy for storage
    embedding = image_features[0].cpu()
    
    # Save to cache
    save_embedding_to_cache(image_path, embedding)
    
    return embedding

def get_image_similarity(image1_path, image2_path):
    # Get embeddings for both images (with caching)
    embedding1 = get_image_embedding(image1_path)
    embedding2 = get_image_embedding(image2_path)

    # Compute cosine similarity
    similarity = (embedding1 * embedding2).sum().item()

    # Print the similarity score (ranges from -1 to 1, where 1 is identical)
    print(f"Image similarity score: {similarity:.4f}")

    return similarity
    