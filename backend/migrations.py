#!/usr/bin/env python3
"""
Database migration script for adding user authentication support.
This script will:
1. Create users table
2. Modify existing tables to support user relationships
3. Migrate existing hardcoded user data
"""

import sqlite3
import logging
from typing import Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_users_table(cursor: sqlite3.Cursor) -> None:
    """Create users table for authentication."""
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )
    ''')
    logger.info("Created users table")

def create_user_sessions_table(cursor: sqlite3.Cursor) -> None:
    """Create user sessions table for tracking active sessions."""
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_sessions (
            session_id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            expires_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    logger.info("Created user_sessions table")

def modify_user_library_table(cursor: sqlite3.Cursor) -> None:
    """Modify user_library table to ensure proper foreign key constraints."""
    # Check if the table exists and has the right structure
    cursor.execute("PRAGMA table_info(user_library)")
    columns = [col[1] for col in cursor.fetchall()]
    
    if 'user_id' not in columns:
        # Create new table with proper structure
        cursor.execute('''
            CREATE TABLE user_library_new (
                user_id TEXT NOT NULL,
                card_id TEXT NOT NULL,
                added_at TEXT DEFAULT (datetime('now')),
                PRIMARY KEY (user_id, card_id),
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        # Copy existing data if any
        try:
            cursor.execute("SELECT * FROM user_library")
            existing_data = cursor.fetchall()
            if existing_data:
                for row in existing_data:
                    cursor.execute(
                        "INSERT INTO user_library_new (user_id, card_id) VALUES (?, ?)",
                        row
                    )
                logger.info(f"Migrated {len(existing_data)} existing library entries")
        except sqlite3.OperationalError:
            logger.info("No existing user_library data to migrate")
        
        # Drop old table and rename new one
        cursor.execute("DROP TABLE IF EXISTS user_library")
        cursor.execute("ALTER TABLE user_library_new RENAME TO user_library")
    else:
        # Add foreign key constraint if it doesn't exist
        try:
            cursor.execute('''
                CREATE TABLE user_library_temp (
                    user_id TEXT NOT NULL,
                    card_id TEXT NOT NULL,
                    added_at TEXT DEFAULT (datetime('now')),
                    PRIMARY KEY (user_id, card_id),
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            ''')
            
            # Copy data
            cursor.execute("SELECT * FROM user_library")
            existing_data = cursor.fetchall()
            for row in existing_data:
                cursor.execute(
                    "INSERT INTO user_library_temp (user_id, card_id) VALUES (?, ?)",
                    row
                )
            
            # Replace table
            cursor.execute("DROP TABLE user_library")
            cursor.execute("ALTER TABLE user_library_temp RENAME TO user_library")
            logger.info("Updated user_library table structure")
        except Exception as e:
            logger.warning(f"Could not add foreign key constraint: {e}")

def create_default_user(cursor: sqlite3.Cursor) -> str:
    """Create a default user for existing data migration."""
    default_user_id = "default_user_001"
    default_email = "default@poke.heymonk.app"
    
    try:
        cursor.execute(
            "INSERT INTO users (id, email) VALUES (?, ?)",
            (default_user_id, default_email)
        )
        logger.info(f"Created default user: {default_email}")
        return default_user_id
    except sqlite3.IntegrityError:
        logger.info("Default user already exists")
        return default_user_id

def migrate_existing_data(cursor: sqlite3.Cursor, default_user_id: str) -> None:
    """Migrate any existing data to use the default user."""
    # Check if there are library entries without proper user_id
    cursor.execute("SELECT COUNT(*) FROM user_library WHERE user_id = 'hardcoded_user'")
    hardcoded_count = cursor.fetchone()[0]
    
    if hardcoded_count > 0:
        cursor.execute(
            "UPDATE user_library SET user_id = ? WHERE user_id = 'hardcoded_user'",
            (default_user_id,)
        )
        logger.info(f"Migrated {hardcoded_count} hardcoded user entries to default user")

def run_migrations() -> None:
    """Run all database migrations."""
    try:
        conn = sqlite3.connect('pokemon_cards.db')
        cursor = conn.cursor()
        
        logger.info("Starting database migrations...")
        
        # Enable foreign key constraints
        cursor.execute("PRAGMA foreign_keys = ON")
        
        # Create new tables
        create_users_table(cursor)
        create_user_sessions_table(cursor)
        
        # Modify existing tables
        modify_user_library_table(cursor)
        
        # Create default user and migrate data
        default_user_id = create_default_user(cursor)
        migrate_existing_data(cursor, default_user_id)
        
        # Commit all changes
        conn.commit()
        logger.info("Database migrations completed successfully!")
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    run_migrations()
