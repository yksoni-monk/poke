# Configure logging BEFORE importing anything else
import logging
import sys

# Configure logging to work properly in Docker containers
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stderr)  # Use stderr instead of stdout
    ],
    force=True
)
logger = logging.getLogger(__name__)

# Force Python to run unbuffered for Docker containers
sys.stdout.reconfigure(line_buffering=True)
sys.stderr.reconfigure(line_buffering=True)

# Now configure logging is done, import everything else
from fastapi import FastAPI, UploadFile, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
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
import traceback
from contextlib import asynccontextmanager

# SuperTokens imports
from supertokens_python.recipe.session.framework.fastapi import verify_session
from supertokens_python.recipe.session import SessionContainer

# Import our SuperTokens configuration
# from supertokens_config import init_supertokens  # Now called from lifespan

# Force output to stderr which Docker captures better
print("🔍 DEBUG: This line should appear in logs!", file=sys.stderr)
print("🔍 DEBUG: About to initialize SuperTokens...", file=sys.stderr)

print("🔍 DEBUG: After logging configuration!", file=sys.stderr)
logger.info("🔍 DEBUG: Logger configured successfully!")
logger.error("🔍 DEBUG: This is an ERROR level message to test stderr capture!")

# Remove app creation from here - it will be created after lifespan function
# app = FastAPI(...)

@asynccontextmanager
async def lifespan(app):
    # Code to be executed before the application starts up
    print("🚀 FastAPI startup event triggered!", file=sys.stderr)
    print("🔍 This is a test message to verify startup event works!", file=sys.stderr)
    
    print("=== SUPERTOKENS STATUS ===", file=sys.stderr)
    print("SuperTokens already initialized at module level!", file=sys.stderr)
    
    yield
    # Code to be executed after the application shuts down
    print("🛑 FastAPI shutdown event triggered!", file=sys.stderr)

# Create FastAPI app after lifespan function definition
app = FastAPI(
    title="Pokemon Card Scanner API",
    description="API for scanning and identifying Pokemon cards using image similarity",
    version="1.0.0",
    lifespan=lifespan
)

# Add SuperTokens middleware BEFORE initialization
print("🔧 About to add SuperTokens middleware...", file=sys.stderr)
try:
    from supertokens_python.framework.fastapi import get_middleware
    middleware = get_middleware()
    print(f"🔧 Middleware function: {middleware}", file=sys.stderr)
    app.add_middleware(middleware)
    print("✅ SuperTokens middleware added successfully!", file=sys.stderr)
except Exception as e:
    print(f"❌ Failed to add SuperTokens middleware: {e}", file=sys.stderr)
    import traceback
    print(f"Full traceback: {traceback.format_exc()}", file=sys.stderr)

# Initialize SuperTokens AFTER middleware is added
print("🔧 Initializing SuperTokens after middleware...", file=sys.stderr)
try:
    from supertokens_config import init_supertokens
    init_supertokens()
    print("✅ SuperTokens initialized successfully after middleware!", file=sys.stderr)
except Exception as e:
    print(f"❌ FAILED to initialize SuperTokens: {e}", file=sys.stderr)
    import traceback
    print(f"Full traceback: {traceback.format_exc()}", file=sys.stderr)
    raise e

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



def get_user_library(user_id: str) -> list:
    logger.info(f"🔐 Getting library for user {user_id}")
    conn = sqlite3.connect('pokemon_cards.db')
    cursor = conn.cursor()
    try:
        # Check if user_library table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_library'")
        table_exists = cursor.fetchone()
        logger.info(f"🔐 user_library table exists: {table_exists}")
        
        if not table_exists:
            logger.warning("🔐 user_library table does not exist, returning empty list")
            return []
        
        cursor.execute('SELECT card_id FROM user_library WHERE user_id = ?', (user_id,))
        rows = cursor.fetchall()
        card_ids = [row[0] for row in rows]
        logger.info(f"🔐 Found {len(card_ids)} cards in library for user {user_id}")
        return card_ids
    except Exception as e:
        logger.error(f"❌ Error getting user library: {e}")
        return []
    finally:
        cursor.close()
        conn.close()

def add_card_to_library(user_id: str, card_id: str) -> bool:
    logger.info(f"🔐 Adding card {card_id} to library for user {user_id}")
    conn = sqlite3.connect('pokemon_cards.db')
    cursor = conn.cursor()
    try:
        # Check if user_library table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_library'")
        table_exists = cursor.fetchone()
        logger.info(f"🔐 user_library table exists: {table_exists}")
        
        if not table_exists:
            # Create the table if it doesn't exist
            logger.info("🔐 Creating user_library table...")
            cursor.execute('''
                CREATE TABLE user_library (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    card_id TEXT NOT NULL,
                    added_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, card_id)
                )
            ''')
            conn.commit()
            logger.info("🔐 user_library table created successfully")
        
        # Now add the card
        cursor.execute('INSERT OR IGNORE INTO user_library (user_id, card_id) VALUES (?, ?)', (user_id, card_id))
        conn.commit()
        added = cursor.rowcount > 0
        logger.info(f"🔐 Card added to library: {added}, rowcount: {cursor.rowcount}")
    except Exception as e:
        logger.error(f"❌ Error adding card to library: {e}")
        added = False
    finally:
        cursor.close()
        conn.close()

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

@api_router.get('/library')
async def get_library(s: SessionContainer = Depends(verify_session())):
    """Get the authenticated user's library."""
    logger.info("🚀 /library endpoint called!")
    
    try:
        user_id = s.get_user_id()
        logger.info(f"🔐 Getting library for user ID: {user_id}")
        card_ids = get_user_library(user_id)
        logger.info(f"🔐 Library result: {card_ids}")
        return { 'success': True, 'card_ids': card_ids }
    except Exception as e:
        logger.error(f"❌ Error in get_library: {e}")
        logger.error(f"Error type: {type(e)}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Internal server error")

@api_router.post('/library/add')
async def add_to_library(card_id: str, s: SessionContainer = Depends(verify_session())):
    """Add a card to the authenticated user's library."""
    logger.info("🚀 /library/add endpoint called!")
    logger.info(f"🔐 Card ID: {card_id}")
    
    try:
        if not card_id:
            logger.error("❌ No card_id provided")
            raise HTTPException(status_code=400, detail='card_id is required')
        
        user_id = s.get_user_id()
        logger.info(f"🔐 Adding card {card_id} to library for user {user_id}")
        added = add_card_to_library(user_id, card_id)
        logger.info(f"🔐 Add result: {added}")
        return { 'success': True, 'added': added }
    except Exception as e:
        logger.error(f"❌ Error in add_to_library: {e}")
        logger.error(f"Error type: {type(e)}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Internal server error")

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

# Remove manual auth endpoints - SuperTokens handles them automatically through middleware
# The following endpoints are automatically created by SuperTokens:
# - /auth/signinup (POST) - handles OTP sending and verification
# - /auth/session (GET) - gets current session
# - /auth/signout (POST) - signs out user

# Note: We don't need to implement these manually - SuperTokens middleware handles them all

# Include SuperTokens authentication endpoints
from supertokens_python.framework.fastapi import get_middleware
from supertokens_python.recipe.passwordless.interfaces import APIInterface
from supertokens_python.recipe.session.interfaces import APIInterface as SessionAPIInterface

# Add SuperTokens middleware to create auth endpoints automatically
print("🔧 About to add SuperTokens middleware...", file=sys.stderr)
try:
    middleware = get_middleware()
    print(f"🔧 Middleware function: {middleware}", file=sys.stderr)
    # app.add_middleware(middleware) # This line is moved outside lifespan
    print("✅ SuperTokens middleware added successfully!", file=sys.stderr)
except Exception as e:
    print(f"❌ Failed to add SuperTokens middleware: {e}", file=sys.stderr)
    import traceback
    print(f"Full traceback: {traceback.format_exc()}", file=sys.stderr)

# Add custom session endpoint using SuperTokens verify_session dependency
@api_router.get("/sessioninfo")
async def get_session_info(s: SessionContainer = Depends(verify_session())):
    """Get current session information using SuperTokens."""
    logger.info("🚀 /sessioninfo endpoint called!")
    
    try:
        session_handle = s.get_handle()
        user_id = s.get_user_id()
        access_token_payload = s.get_access_token_payload()
        
        logger.info(f"✅ Session verified successfully! User ID: {user_id}")
        
        return {
            "status": "AUTHENTICATED",
            "sessionHandle": session_handle,
            "userId": user_id,
            "accessTokenPayload": access_token_payload
        }
    except Exception as e:
        logger.error(f"❌ Session verification error: {e}")
        logger.error(f"Error type: {type(e)}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        return {"status": "NOT_AUTHENTICATED", "message": "Session verification failed"}

# Include our API routes
app.include_router(api_router)
# app.include_router(auth_router)  # Not needed - SuperTokens handles auth automatically

# Global exception handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle FastAPI validation errors and log them."""
    logger.error(f"❌ VALIDATION ERROR in {request.method} {request.url}")
    logger.error(f"❌ Validation error details: {exc.errors()}")
    logger.error(f"❌ Request body: {await request.body()}")
    logger.error(f"❌ Request headers: {request.headers}")
    logger.error(f"❌ Request query params: {request.query_params}")
    return JSONResponse(
        status_code=422,
        content={"detail": "Validation error", "errors": exc.errors()}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle any other exceptions and log them."""
    logger.error(f"❌ UNEXPECTED ERROR in {request.method} {request.url}")
    logger.error(f"❌ Error type: {type(exc)}")
    logger.error(f"❌ Error message: {str(exc)}")
    logger.error(f"❌ Full traceback: {traceback.format_exc()}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 