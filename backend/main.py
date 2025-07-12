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
    print(f"Card name: {first_card.name}")
    print(f"Card ID: {first_card.id}")
    print("\nAll attributes and their values:")
    print("=" * 50)
    
    # Get all attributes of the card object
    for attr_name in dir(first_card):
        # Skip private attributes and methods
        if not attr_name.startswith('_'):
            try:
                attr_value = getattr(first_card, attr_name)
                # Skip methods
                if not callable(attr_value):
                    print(f"{attr_name}: {attr_value}")
            except Exception as e:
                print(f"{attr_name}: Error accessing - {e}")
    
    print("=" * 50)
    print(f"Total attributes found: {len([attr for attr in dir(first_card) if not attr.startswith('_') and not callable(getattr(first_card, attr, None))])}")
    
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
    with open(card_db_file, "r") as f:
        reader = csv.reader(f)
        pandas_df = pd.DataFrame(reader, columns=["card name", "card id", "card number", "card image url"])
        #print(pandas_df["card name"].values)
        return card_name in pandas_df["card name"].values

def search_card(card_name):
    # open the card_names.txt file to search a particular card name. name can yield multiple rows
    with open(card_db_file, "r") as f:
        reader = csv.reader(f)
        pandas_df = pd.DataFrame(reader, columns=["card name", "card id", "card number", "card image url"])
        df = pandas_df[pandas_df["card name"] == card_name]
        #print(df)
        return df







if __name__ == "__main__":


    create_card_extensive_db()
    
    exit(0)
    
    create_card_db()
    image_path = "/Users/yksoni/Downloads/pokemon4.jpeg"

    # for each image in the card_db, create a vector embedding and save it to a file
    create_embeddings(card_db_file)
    print("Embeddings created")
    # now use faiss for similarity search of image file at 'image_path' using the embeddings.npy file
    # first load the embeddings.npy file
    embedding_image_similarity(image_path)

    
    exit(0)


        # First, let's examine one card instance to see all attributes
    print("Getting first card to examine attributes...")
    cards = Card.all()
    if cards:
        first_card = cards[0]
        print_all_attributes(first_card)

    #first open the card_db files and get the panda dataframe
    df = pd.read_csv(card_db_file)
    # open embeddings.npy files and store the embeddings there
    


    text = ocr_image(image_path)
    # from the text, find the card name. Normally the card name is in the first or the second line.
    # so parse the first two lines and check one by one if the card name is in the card_db file. If not, search the next line.
    card_name = text.split("\n")[0]
    # remove any trailing special characters
    card_name = card_name.strip()
    print(card_name)
    if not check_card_name(card_name):
        card_name = text.split("\n")[1]
        print(card_name)
        # remove any trailing special character
        card_name = card_name.strip()
    
    if not check_card_name(card_name):
        print("Card name not found in the card_db file")
        exit(1)
    df = search_card(card_name)
    # get the image url of cards in an array
   
    final_card_number = ""
    highest_similarity = 0
    final_image_url = ""

    #print(image_urls)
    # download the image from the image_url
    # iterate over the df. For each row, get the image url and do image similarity.
    # if the new similarity is higher than the previous one, update the final_card_number

    for index, row in df.iterrows():
        image_url = row["card image url"]
        image = requests.get(image_url)
        # save the image to a file
        with open("image.jpg", "wb") as f:
            f.write(image.content)
        similarity = get_image_similarity("image.jpg", image_path)
        if similarity > highest_similarity:
            highest_similarity = similarity
            final_card_number = row["card number"]
            final_image_url = image_url
    print(f"The final card number is: {final_card_number}")
    print(f"The final image url is: {final_image_url}")
    
        


