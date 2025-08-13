from fastapi import FastAPI, UploadFile, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
from PIL import Image
from io import BytesIO
import tempfile
import os
from typing import List, Dict, Any, Optional
from image_similarity import embedding_image_similarity
import pandas as pd
from fastapi import APIRouter
import sqlite3
import json
import threading

# SuperTokens imports
from supertokens_python.recipe.session.framework.fastapi import verify_session
from supertokens_python.recipe.session import SessionContainer

# Import our SuperTokens configuration
from supertokens_config import init_supertokens

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

# Force Python to run unbuffered for Docker containers
sys.stdout.reconfigure(line_buffering=True)
sys.stderr.reconfigure(line_buffering=True)


app = FastAPI(
    title="Pokemon Card Scanner API",
    description="API for scanning and identifying Pokemon cards using image similarity",
    version="1.0.0"
)

# Initialize SuperTokens at startup using our config
init_supertokens()

api_router = APIRouter(prefix="/v1/api")
auth_router = APIRouter(prefix="/auth")

def create_user_library_table():
    conn = sqlite3.connect('pokemon_cards.db')
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_library (
            user_id TEXT NOT NULL,
            card_id TEXT NOT NULL,
            PRIMARY KEY (user_id, card_id)
        )
    ''')
    conn.commit()
    cursor.close()
    conn.close()

# Ensure table is created at startup (thread-safe)
threading.Thread(target=create_user_library_table).start()

# Authentication middleware functions
async def get_user_from_session(request) -> Optional[Dict[str, Any]]:
    """Extract user information from SuperTokens session."""
    try:
        session: SessionContainer = await verify_session(request)
        if session is None:
            return None
        
        user_id = session.get_user_id()
        if not user_id:
            return None
        
        return {"id": user_id}
        
    except Exception as e:
        logger.warning(f"Session verification failed: {e}")
        return None

def require_auth(user: Optional[Dict[str, Any]] = Depends(get_user_from_session)) -> Dict[str, Any]:
    """Dependency that requires authentication."""
    if user is None:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please sign in to access this resource."
        )
    return user

def get_user_library(user_id: str) -> list:
    conn = sqlite3.connect('pokemon_cards.db')
    cursor = conn.cursor()
    cursor.execute('SELECT card_id FROM user_library WHERE user_id = ?', (user_id,))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [row[0] for row in rows]

def add_card_to_library(user_id: str, card_id: str) -> bool:
    conn = sqlite3.connect('pokemon_cards.db')
    cursor = conn.cursor()
    try:
        cursor.execute('INSERT OR IGNORE INTO user_library (user_id, card_id) VALUES (?, ?)', (user_id, card_id))
        conn.commit()
        added = cursor.rowcount > 0
    except Exception as e:
        added = False
    cursor.close()
    conn.close()
    return added

def get_card_from_db(card_id: str) -> Dict[str, Any]:
    """
    Get card details from SQLite database by card ID.
    
    Args:
        card_id: The Pokemon card ID
        
    Returns:
        Dict containing card details
    """
    try:
        conn = sqlite3.connect('pokemon_cards.db')
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM pokemon_cards WHERE id = ?", (card_id,))
        row = cursor.fetchone()
        
        if row is None:
            return None
            
        # Get column names
        columns = [description[0] for description in cursor.description]
        
        # Create dict from row data
        card_data = dict(zip(columns, row))
        
        # Parse JSON fields
        json_fields = ['abilities', 'attacks', 'subtypes', 'types', 'weaknesses', 
                      'resistances', 'nationalPokedexNumbers', 'retreatCost',
                      'cardmarket_prices', 'tcgplayer_prices']
        
        for field in json_fields:
            if card_data.get(field) and isinstance(card_data[field], str):
                try:
                    card_data[field] = json.loads(card_data[field])
                except json.JSONDecodeError:
                    # Keep as string if JSON parsing fails
                    pass
        
        cursor.close()
        conn.close()
        
        return card_data
        
    except sqlite3.Error as err:
        logger.error(f"Database error: {err}")
        return None

def get_average_price(card_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract average price information from card data.
    
    Args:
        card_data: Card data from database
        
    Returns:
        Dict with pricing information
    """
    pricing_info = {
        "averagePrice": None,
        "priceSource": None,
        "currency": "USD"
    }
    
    # Try to get price from TCGPlayer first (usually more reliable)
    if card_data.get("tcgplayer_prices") and isinstance(card_data["tcgplayer_prices"], dict):
        tcg_prices = card_data["tcgplayer_prices"]
        
        # Look for normal market price first
        normal_prices = tcg_prices.get("normal")
        if normal_prices and isinstance(normal_prices, dict) and normal_prices.get("market"):
            pricing_info["averagePrice"] = normal_prices["market"]
            pricing_info["priceSource"] = "TCGPlayer"
        # Fallback to normal mid price
        elif normal_prices and isinstance(normal_prices, dict) and normal_prices.get("mid"):
            pricing_info["averagePrice"] = normal_prices["mid"]
            pricing_info["priceSource"] = "TCGPlayer"
        # Try holofoil market price
        elif tcg_prices.get("holofoil") and isinstance(tcg_prices["holofoil"], dict) and tcg_prices["holofoil"].get("market"):
            pricing_info["averagePrice"] = tcg_prices["holofoil"]["market"]
            pricing_info["priceSource"] = "TCGPlayer"
        # Try holofoil mid price
        elif tcg_prices.get("holofoil") and isinstance(tcg_prices["holofoil"], dict) and tcg_prices["holofoil"].get("mid"):
            pricing_info["averagePrice"] = tcg_prices["holofoil"]["mid"]
            pricing_info["priceSource"] = "TCGPlayer"
    
    # Fallback to CardMarket if TCGPlayer doesn't have price
    if pricing_info["averagePrice"] is None and card_data.get("cardmarket_prices") and isinstance(card_data["cardmarket_prices"], dict):
        cm_prices = card_data["cardmarket_prices"]
        
        if cm_prices.get("averageSellPrice"):
            pricing_info["averagePrice"] = cm_prices["averageSellPrice"]
            pricing_info["priceSource"] = "CardMarket"
            pricing_info["currency"] = "EUR"
        elif cm_prices.get("trendPrice"):
            pricing_info["averagePrice"] = cm_prices["trendPrice"]
            pricing_info["priceSource"] = "CardMarket"
            pricing_info["currency"] = "EUR"
    
    return pricing_info

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
            # Get similar card IDs
            similar_card_ids = embedding_image_similarity(temp_path)
            logger.info(f"embedding_image_similarity: {similar_card_ids}")            
            print(f"embedding_image_similarity: {similar_card_ids}")
            sys.stdout.flush()
            if not similar_card_ids:
                return JSONResponse(
                    status_code=404,
                    content={
                        "success": False,
                        "error": "No matching cards found"
                    }
                )
            
            # Get card details for the best match from SQLite database
            best_match_card_id = similar_card_ids[0]
            logger.info(f"best_match_card_id: {best_match_card_id}")
            print(f"best_match_card_id: {best_match_card_id}")
            sys.stdout.flush()
            
            card_data = get_card_from_db(best_match_card_id)
            if not card_data:
                return JSONResponse(
                    status_code=404,
                    content={
                        "success": False,
                        "error": "Card not found in database"
                    }
                )
            
            logger.info(f"card_data: {card_data}")
            print(f"card_data: {card_data}")
            sys.stdout.flush()
            
            # Get pricing information
            pricing_info = get_average_price(card_data)
            
            return {
                "success": True,
                "cardData": {
                    "name": card_data["name"],
                    "number": card_data["number"],
                    "id": card_data["id"],
                    "imageUrl": card_data["image_large"],
                    "artist": card_data["artist"],
                    "hp": card_data["hp"],
                    "rarity": card_data["rarity"],
                    "supertype": card_data["supertype"],
                    "set_name": card_data["set_name"],
                    "abilities": card_data["abilities"],
                    "attacks": card_data["attacks"],
                    "types": card_data["types"],
                    "weaknesses": card_data["weaknesses"],
                    "resistances": card_data["resistances"],
                    "pricing": pricing_info
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

@api_router.post('/library/add')
async def add_to_library(card_id: str, user: Dict[str, Any] = Depends(require_auth)):
    """Add a card to the authenticated user's library."""
    if not card_id:
        raise HTTPException(status_code=400, detail='card_id is required')
    
    user_id = user["id"]
    added = add_card_to_library(user_id, card_id)
    return { 'success': True, 'added': added }

@api_router.get('/library')
async def get_library(user: Dict[str, Any] = Depends(require_auth)):
    """Get the authenticated user's library."""
    user_id = user["id"]
    card_ids = get_user_library(user_id)
    return { 'success': True, 'card_ids': card_ids }

@api_router.get('/card/{card_id}')
async def get_card(card_id: str):
    card_data = get_card_from_db(card_id)
    if not card_data:
        raise HTTPException(status_code=404, detail="Card not found")
    card_data['imageUrl'] = card_data.get('image_large')
    card_data['pricing'] = get_average_price(card_data)
    return card_data

@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

# Include SuperTokens authentication endpoints
from supertokens_python.framework.fastapi import get_middleware
app.add_middleware(get_middleware())

# Add basic auth endpoints to the auth router
@auth_router.get("/session")
async def get_session(request: Request):
    """Get current session information."""
    # For now, return a basic response to test connectivity
    return {"status": "NOT_AUTHENTICATED", "message": "Session endpoint working"}

@auth_router.get("/user/{user_id}")
async def get_user(user_id: str, request: Request):
    """Get user information by ID."""
    # For now, return a basic response to test connectivity
    return {"id": user_id, "email": "test@example.com", "message": "User endpoint working"}

@auth_router.post("/signinup")
async def signinup(request: Request):
    """Handle sign in/up requests (OTP sending and verification)."""
    try:
        body = await request.json()
        email = body.get("email")
        user_input_code = body.get("userInputCode")
        
        if not email:
            return {"status": "ERROR", "message": "Email is required"}
        
        # For now, simulate OTP functionality
        if user_input_code:
            # This is OTP verification
            # In a real implementation, SuperTokens would verify the OTP
            return {"status": "OK", "message": "OTP verified successfully"}
        else:
            # This is OTP sending
            # In a real implementation, SuperTokens would send OTP
            return {"status": "OK", "message": "OTP sent successfully"}
            
    except Exception as e:
        logger.error(f"Signinup error: {e}")
        return {"status": "ERROR", "message": str(e)}

@auth_router.post("/signout")
async def sign_out(request: Request):
    """Sign out the current user."""
    # For now, return a basic response to test connectivity
    return {"status": "OK", "message": "Signout endpoint working"}

# Include our API routes
app.include_router(api_router)
app.include_router(auth_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 