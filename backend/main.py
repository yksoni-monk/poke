import csv
import numpy as np
import pandas as pd
from dotenv import load_dotenv
import requests
from image_similarity import get_image_embedding, get_image_similarity, create_embeddings, embedding_image_similarity
from pokemontcgsdk import Card
from pokemontcgsdk import Set
from pokemontcgsdk import Type
from pokemontcgsdk import Supertype
from pokemontcgsdk import Subtype
from pokemontcgsdk import Rarity
from pokemontcgsdk import RestClient
import os
from ocr import ocr_image
import json
from PIL import Image
from io import BytesIO
import sqlite3


# load POKEMON_API_KEY from .env
load_dotenv()
POKEMONTCG_IO_API_KEY = os.getenv("POKEMON_API_KEY")

RestClient.configure(POKEMONTCG_IO_API_KEY)

card_db_file = "card_names.csv"

def create_card_db():
    if not os.path.exists(card_db_file):
        card_names = []
        cards = Card.all()
        for card in cards:
            card_names.append(card.name)
        with open(card_db_file, "w") as f:
            writer = csv.writer(f)
            writer.writerow(["card name", "card id", "card number", "card image url"])
            for card in cards:
                writer.writerow([card.name, card.id, card.number, card.images.large])

def print_all_attributes(card):
    print(f"Card name: {card.name}")
    print(f"Card ID: {card.id}")
    print("\nAll attributes and their values:")
    print("=" * 50)
    
    # Get all attributes of the card object
    for attr_name in dir(card):
        # Skip private attributes and methods
        if not attr_name.startswith('_'):
            try:
                attr_value = getattr(card, attr_name)
                # Skip methods
                if not callable(attr_value):
                    print(f"{attr_name}: {attr_value}")
            except Exception as e:
                print(f"{attr_name}: Error accessing - {e}")
    
    print("=" * 50)
    print(f"Total attributes found: {len([attr for attr in dir(card) if not attr.startswith('_') and not callable(getattr(card, attr, None))])}")
    
## read all the attributes from Card class and save it to a tiny mysql database
def create_card_extensive_db():

    cards = Card.all()
    if cards:
        
        # Now create the database and table
        print("\nCreating database and table...")
        create_database_and_table()
        
        for card in cards:
            print(f"\nInserting card {card.name}...")
            insert_card_to_db(card)
    else:
        print("No cards found!")

def create_database_and_table():
    """Create the database and table for Pokemon cards"""
    try:
        # Connect to SQLite database (creates file if it doesn't exist)
        conn = sqlite3.connect('pokemon_cards.db')
        cursor = conn.cursor()
        
        # Create table with all the attributes we discovered
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS pokemon_cards (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            number TEXT,
            artist TEXT,
            hp INTEGER,
            convertedRetreatCost INTEGER,
            evolvesFrom TEXT,
            flavorText TEXT,
            rarity TEXT,
            regulationMark TEXT,
            supertype TEXT,
            resource TEXT,
            
            -- Image URLs
            image_small TEXT,
            image_large TEXT,
            
            -- Set information
            set_id TEXT,
            set_name TEXT,
            set_series TEXT,
            set_releaseDate TEXT,
            set_printedTotal INTEGER,
            set_total INTEGER,
            set_ptcgoCode TEXT,
            
            -- Arrays stored as JSON
            abilities TEXT,
            attacks TEXT,
            subtypes TEXT,
            types TEXT,
            weaknesses TEXT,
            resistances TEXT,
            nationalPokedexNumbers TEXT,
            retreatCost TEXT,
            
            -- Pricing information
            cardmarket_url TEXT,
            cardmarket_updatedAt TEXT,
            cardmarket_prices TEXT,
            
            tcgplayer_url TEXT,
            tcgplayer_updatedAt TEXT,
            tcgplayer_prices TEXT,
            
            -- Legalities
            legalities_unlimited TEXT,
            legalities_expanded TEXT,
            legalities_standard TEXT,
            
            -- Additional fields
            ancientTrait TEXT,
            rules TEXT,
            
            -- Timestamps
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )
        """
        
        cursor.execute(create_table_sql)
        conn.commit()
        print("Database and table created successfully!")
        
        cursor.close()
        conn.close()
        
    except sqlite3.Error as err:
        print(f"Error creating database: {err}")

def safe_json_convert(obj):
    """Safely convert objects to JSON-serializable format"""
    if obj is None:
        return None
    elif isinstance(obj, (str, int, float, bool)):
        return obj
    elif isinstance(obj, list):
        return json.dumps(obj)
    elif isinstance(obj, dict):
        return json.dumps(obj)
    else:
        # For any other object, try to convert to string
        return str(obj)

def insert_card_to_db(card):
    """Insert a card into the database"""
    try:
        conn = sqlite3.connect('pokemon_cards.db')
        cursor = conn.cursor()
        
        # Prepare the data with safe conversion
        card_data = {
            'id': safe_json_convert(card.id),
            'name': safe_json_convert(card.name),
            'number': safe_json_convert(card.number),
            'artist': safe_json_convert(card.artist),
            'hp': safe_json_convert(card.hp),
            'convertedRetreatCost': safe_json_convert(card.convertedRetreatCost),
            'evolvesFrom': safe_json_convert(card.evolvesFrom),
            'flavorText': safe_json_convert(card.flavorText),
            'rarity': safe_json_convert(card.rarity),
            'regulationMark': safe_json_convert(card.regulationMark),
            'supertype': safe_json_convert(card.supertype),
            'resource': safe_json_convert(card.RESOURCE),
            
            # Images
            'image_small': safe_json_convert(card.images.small if card.images else None),
            'image_large': safe_json_convert(card.images.large if card.images else None),
            
            # Set info
            'set_id': safe_json_convert(card.set.id if card.set else None),
            'set_name': safe_json_convert(card.set.name if card.set else None),
            'set_series': safe_json_convert(card.set.series if card.set else None),
            'set_releaseDate': safe_json_convert(card.set.releaseDate if card.set else None),
            'set_printedTotal': safe_json_convert(card.set.printedTotal if card.set else None),
            'set_total': safe_json_convert(card.set.total if card.set else None),
            'set_ptcgoCode': safe_json_convert(card.set.ptcgoCode if card.set else None),
            
            # JSON arrays
            'abilities': json.dumps([{
                'name': ability.name,
                'text': ability.text,
                'type': ability.type
            } for ability in card.abilities]) if card.abilities else None,
            'attacks': json.dumps([{
                'name': attack.name,
                'cost': attack.cost,
                'convertedEnergyCost': attack.convertedEnergyCost,
                'damage': attack.damage,
                'text': attack.text
            } for attack in card.attacks]) if card.attacks else None,
            'subtypes': safe_json_convert(card.subtypes),
            'types': safe_json_convert(card.types),
            'weaknesses': json.dumps([{
                'type': w.type,
                'value': w.value
            } for w in card.weaknesses]) if card.weaknesses else None,
            'resistances': json.dumps([{
                'type': r.type,
                'value': r.value
            } for r in card.resistances]) if card.resistances else None,
            'nationalPokedexNumbers': safe_json_convert(card.nationalPokedexNumbers),
            'retreatCost': safe_json_convert(card.retreatCost),
            
            # Pricing
            'cardmarket_url': safe_json_convert(card.cardmarket.url if card.cardmarket else None),
            'cardmarket_updatedAt': safe_json_convert(card.cardmarket.updatedAt if card.cardmarket else None),
            'cardmarket_prices': json.dumps({
                'averageSellPrice': getattr(card.cardmarket.prices, 'averageSellPrice', None),
                'lowPrice': getattr(card.cardmarket.prices, 'lowPrice', None),
                'trendPrice': getattr(card.cardmarket.prices, 'trendPrice', None),
                'germanProLow': getattr(card.cardmarket.prices, 'germanProLow', None),
                'suggestedPrice': getattr(card.cardmarket.prices, 'suggestedPrice', None),
                'reverseHoloSell': getattr(card.cardmarket.prices, 'reverseHoloSell', None),
                'reverseHoloLow': getattr(card.cardmarket.prices, 'reverseHoloLow', None),
                'reverseHoloTrend': getattr(card.cardmarket.prices, 'reverseHoloTrend', None),
                'lowPriceExPlus': getattr(card.cardmarket.prices, 'lowPriceExPlus', None),
                'avg1': getattr(card.cardmarket.prices, 'avg1', None),
                'avg7': getattr(card.cardmarket.prices, 'avg7', None),
                'avg30': getattr(card.cardmarket.prices, 'avg30', None),
                'reverseHoloAvg1': getattr(card.cardmarket.prices, 'reverseHoloAvg1', None),
                'reverseHoloAvg7': getattr(card.cardmarket.prices, 'reverseHoloAvg7', None),
                'reverseHoloAvg30': getattr(card.cardmarket.prices, 'reverseHoloAvg30', None)
            }) if card.cardmarket and card.cardmarket.prices else None,
            
            'tcgplayer_url': safe_json_convert(card.tcgplayer.url if card.tcgplayer else None),
            'tcgplayer_updatedAt': safe_json_convert(card.tcgplayer.updatedAt if card.tcgplayer else None),
            'tcgplayer_prices': json.dumps({
                'normal': {
                    'low': getattr(card.tcgplayer.prices.normal, 'low', None),
                    'mid': getattr(card.tcgplayer.prices.normal, 'mid', None),
                    'high': getattr(card.tcgplayer.prices.normal, 'high', None),
                    'market': getattr(card.tcgplayer.prices.normal, 'market', None),
                    'directLow': getattr(card.tcgplayer.prices.normal, 'directLow', None)
                } if card.tcgplayer.prices.normal else None,
                'holofoil': {
                    'low': getattr(card.tcgplayer.prices.holofoil, 'low', None),
                    'mid': getattr(card.tcgplayer.prices.holofoil, 'mid', None),
                    'high': getattr(card.tcgplayer.prices.holofoil, 'high', None),
                    'market': getattr(card.tcgplayer.prices.holofoil, 'market', None),
                    'directLow': getattr(card.tcgplayer.prices.holofoil, 'directLow', None)
                } if card.tcgplayer.prices.holofoil else None,
                'reverseHolofoil': {
                    'low': getattr(card.tcgplayer.prices.reverseHolofoil, 'low', None),
                    'mid': getattr(card.tcgplayer.prices.reverseHolofoil, 'mid', None),
                    'high': getattr(card.tcgplayer.prices.reverseHolofoil, 'high', None),
                    'market': getattr(card.tcgplayer.prices.reverseHolofoil, 'market', None),
                    'directLow': getattr(card.tcgplayer.prices.reverseHolofoil, 'directLow', None)
                } if card.tcgplayer.prices.reverseHolofoil else None,
                'firstEditionHolofoil': {
                    'low': getattr(card.tcgplayer.prices.firstEditionHolofoil, 'low', None),
                    'mid': getattr(card.tcgplayer.prices.firstEditionHolofoil, 'mid', None),
                    'high': getattr(card.tcgplayer.prices.firstEditionHolofoil, 'high', None),
                    'market': getattr(card.tcgplayer.prices.firstEditionHolofoil, 'market', None),
                    'directLow': getattr(card.tcgplayer.prices.firstEditionHolofoil, 'directLow', None)
                } if card.tcgplayer.prices.firstEditionHolofoil else None,
                'firstEditionNormal': {
                    'low': getattr(card.tcgplayer.prices.firstEditionNormal, 'low', None),
                    'mid': getattr(card.tcgplayer.prices.firstEditionNormal, 'mid', None),
                    'high': getattr(card.tcgplayer.prices.firstEditionNormal, 'high', None),
                    'market': getattr(card.tcgplayer.prices.firstEditionNormal, 'market', None),
                    'directLow': getattr(card.tcgplayer.prices.firstEditionNormal, 'directLow', None)
                } if card.tcgplayer.prices.firstEditionNormal else None
            }) if card.tcgplayer and card.tcgplayer.prices else None,
            
            # Legalities
            'legalities_unlimited': safe_json_convert(card.legalities.unlimited if card.legalities else None),
            'legalities_expanded': safe_json_convert(card.legalities.expanded if card.legalities else None),
            'legalities_standard': safe_json_convert(card.legalities.standard if card.legalities else None),
            
            # Additional
            'ancientTrait': safe_json_convert(card.ancientTrait),
            'rules': safe_json_convert(card.rules)
        }
        
        # Build the INSERT query with SQLite syntax
        columns = ', '.join(card_data.keys())
        placeholders = ', '.join(['?'] * len(card_data))
        values = list(card_data.values())
        
        # Use INSERT OR REPLACE for SQLite (equivalent to ON DUPLICATE KEY UPDATE)
        insert_sql = f"INSERT OR REPLACE INTO pokemon_cards ({columns}) VALUES ({placeholders})"
        
        cursor.execute(insert_sql, values)
        conn.commit()
        print(f"Card '{card.name}' inserted successfully!")
        
        cursor.close()
        conn.close()
        
    except sqlite3.Error as err:
        print(f"Error inserting card: {err}")
    except Exception as e:
        print(f"Error processing card data: {e}")
    



# check if the card name is in the card_db file
def check_card_name(card_name):
    """Check if a card name exists in the SQLite database"""
    try:
        conn = sqlite3.connect('pokemon_cards.db')
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM pokemon_cards WHERE name = ?", (card_name,))
        result = cursor.fetchone()
        cursor.close()
        conn.close()
        return result is not None
    except sqlite3.Error as err:
        print(f"Database error: {err}")
        return False

def search_card(card_name):
    """Search for cards by name in the SQLite database"""
    try:
        conn = sqlite3.connect('pokemon_cards.db')
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM pokemon_cards WHERE name = ?", (card_name,))
        rows = cursor.fetchall()
        
        if not rows:
            cursor.close()
            conn.close()
            return []
        
        # Get column names
        columns = [description[0] for description in cursor.description]
        
        # Convert to list of dictionaries
        cards = []
        for row in rows:
            card_data = dict(zip(columns, row))
            cards.append(card_data)
        
        cursor.close()
        conn.close()
        return cards
        
    except sqlite3.Error as err:
        print(f"Database error: {err}")
        return []







if __name__ == "__main__":

    # First create the extensive database
    create_card_extensive_db()
    
    # Then create embeddings with the new card ID format
    print("\nCreating embeddings with card IDs...")
    create_embeddings(card_db_file)
    print("Embeddings created successfully!")
    
    exit(0)


