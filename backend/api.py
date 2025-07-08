from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image
from io import BytesIO
import tempfile
import os
from typing import List, Dict, Any
from image_similarity import embedding_image_similarity
import pandas as pd
from fastapi import APIRouter

app = FastAPI(
    title="Pokemon Card Scanner API",
    description="API for scanning and identifying Pokemon cards using image similarity",
    version="1.0.0"
)

api_router = APIRouter(prefix="/v1/api")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
            # Get similar card URLs
            similar_urls = embedding_image_similarity(temp_path)
            
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
            card_info = card_df[card_df["card image url"] == best_match_url].iloc[0]
            
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
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 