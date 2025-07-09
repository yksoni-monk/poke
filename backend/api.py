from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from PIL import Image
from io import BytesIO
import tempfile
import os
from typing import List, Dict, Any
from image_similarity import embedding_image_similarity
import pandas as pd
from fastapi import APIRouter

#logging
import logging
import sys

# Configure logging to work properly in Docker containers
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ],
    force=True
)
logger = logging.getLogger(__name__)

# Force Python to run unbuffered for Docker
sys.stdout.reconfigure(line_buffering=True)
sys.stderr.reconfigure(line_buffering=True)


app = FastAPI(
    title="Pokemon Card Scanner API",
    description="API for scanning and identifying Pokemon cards using image similarity",
    version="1.0.0"
)

api_router = APIRouter(prefix="/v1/api")

# Load card database
card_db_file = "card_names.csv"
if not os.path.exists(card_db_file):
    raise RuntimeError("Card database not found. Please run create_card_db() first.")

# Load card metadata
card_df = pd.read_csv(card_db_file)

@api_router.post("/scan-card", response_model=Dict[str, Any])
async def scan_card(image: UploadFile):
    """
    Scan a Pokemon card image and return the best matches.
    
    Args:
        image: The uploaded card image file
        
    Returns:
        Dict containing:
        - success: bool
        - cardData: Dict with card details (if successful)
        - error: str (if unsuccessful)
    """
    try:
        
        # Validate file type
        if not image.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        logger.info(f"Scanning card: {image.filename}")
        print(f"Scanning card: {image.filename}")
        sys.stdout.flush()
        # Read and validate image
        contents = await image.read()
        try:
            img = Image.open(BytesIO(contents))
            img.verify()  # Verify it's a valid image
            img = Image.open(BytesIO(contents))  # Reopen for processing
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid image file: {str(e)}")
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_file:
            img.save(temp_file.name, format='JPEG')
            temp_path = temp_file.name
        
        try:
            logger.info(f"Reading image: {temp_path}")      
            print(f"Reading image: {temp_path}")
            sys.stdout.flush()
            # Get similar card URLs
            similar_urls = embedding_image_similarity(temp_path)
            logger.info(f"embedding_image_similarity: {similar_urls}")            
            print(f"embedding_image_similarity: {similar_urls}")
            sys.stdout.flush()
            if not similar_urls:
                return JSONResponse(
                    status_code=404,
                    content={
                        "success": False,
                        "error": "No matching cards found"
                    }
                )
            
            # Get card details for the best match
            best_match_url = similar_urls[0]
            logger.info(f"best_match_url: {best_match_url}")
            print(f"best_match_url: {best_match_url}")
            sys.stdout.flush()
            card_info = card_df[card_df["card image url"] == best_match_url].iloc[0]
            logger.info(f"card_info: {card_info}")
            print(f"card_info: {card_info}")
            sys.stdout.flush()
            return {
                "success": True,
                "cardData": {
                    "name": card_info["card name"],
                    "number": card_info["card number"],
                    "id": card_info["card id"],
                    "imageUrl": best_match_url
                }
            }
            
        finally:
            # Clean up temporary file
            os.unlink(temp_path)
            
    except HTTPException as he:
        logger.error(f"HTTP Exception: {he}")
        print(f"HTTP Exception: {he}")
        sys.stdout.flush()
        raise he
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        print(f"Unexpected error: {str(e)}")
        sys.stdout.flush()
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 