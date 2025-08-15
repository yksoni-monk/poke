#!/usr/bin/env python3
"""
Authentication middleware for the Pokemon Card Scanner API.
This module provides functions to protect routes and extract user information.
"""

import logging
from typing import Optional, Dict, Any
from fastapi import HTTPException, Depends, Request
from supertokens_python.recipe.session.framework.fastapi import verify_session
from supertokens_python.recipe.session import SessionContainer
import sqlite3

logger = logging.getLogger(__name__)

async def get_user_from_session(request: Request) -> Optional[Dict[str, Any]]:
    """
    Extract user information from SuperTokens session.
    Returns None if no valid session is found.
    """
    try:
        # Verify the session using SuperTokens
        session: SessionContainer = await verify_session(request)
        
        if session is None:
            return None
        
        # Get user ID from session
        user_id = session.get_user_id()
        
        if not user_id:
            return None
        
        # Get additional user information from database
        user_info = get_user_info(user_id)
        if not user_info:
            return None
        
        return {
            "id": user_id,
            "email": user_info.get("email"),
            "created_at": user_info.get("created_at")
        }
        
    except Exception as e:
        logger.warning(f"Session verification failed: {e}")
        return None

def get_user_info(user_id: str) -> Optional[Dict[str, Any]]:
    """Get user information from the database."""
    try:
        conn = sqlite3.connect('pokemon_cards.db')
        cursor = conn.cursor()
        
        cursor.execute(
            "SELECT id, email, created_at FROM users WHERE id = ?",
            (user_id,)
        )
        row = cursor.fetchone()
        
        if row:
            return {
                "id": row[0],
                "email": row[1],
                "created_at": row[2]
            }
        
        return None
        
    except Exception as e:
        logger.error(f"Failed to get user info: {e}")
        return None
    finally:
        cursor.close()
        conn.close()

def require_auth(user: Optional[Dict[str, Any]] = Depends(get_user_from_session)) -> Dict[str, Any]:
    """
    Dependency that requires authentication.
    Raises HTTPException if user is not authenticated.
    """
    if user is None:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please sign in to access this resource."
        )
    return user

def optional_auth(user: Optional[Dict[str, Any]] = Depends(get_user_from_session)) -> Optional[Dict[str, Any]]:
    """
    Dependency that optionally provides authentication.
    Returns None if user is not authenticated, user info if authenticated.
    """
    return user

def get_user_library_with_auth(user_id: str) -> list:
    """Get user's library with authentication check."""
    try:
        conn = sqlite3.connect('pokemon_cards.db')
        cursor = conn.cursor()
        
        cursor.execute(
            "SELECT card_id FROM user_library WHERE user_id = ?",
            (user_id,)
        )
        rows = cursor.fetchall()
        
        return [row[0] for row in rows]
        
    except Exception as e:
        logger.error(f"Failed to get user library: {e}")
        return []
    finally:
        cursor.close()
        conn.close()

def add_card_to_library_with_auth(user_id: str, card_id: str) -> bool:
    """Add card to user's library with authentication check."""
    try:
        conn = sqlite3.connect('pokemon_cards.db')
        cursor = conn.cursor()
        
        cursor.execute(
            'INSERT OR IGNORE INTO user_library (user_id, card_id) VALUES (?, ?)',
            (user_id, card_id)
        )
        conn.commit()
        
        added = cursor.rowcount > 0
        return added
        
    except Exception as e:
        logger.error(f"Failed to add card to library: {e}")
        return False
    finally:
        cursor.close()
        conn.close()
