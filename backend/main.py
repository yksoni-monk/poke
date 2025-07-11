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
import mysql.connector


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

## read all the attributes from Card class and save it to a tiny mysql database
def create_card_extensive_db():
    # First, let's examine one card instance to see all attributes
    print("Getting first card to examine attributes...")
    cards = Card.all()
    if cards:
        first_card = cards[0]
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
        
        # Now create the database and table
        print("\nCreating database and table...")
        create_database_and_table()
        
        # Insert the first card as a test
        print("\nInserting first card as test...")
        insert_card_to_db(first_card)
        
    else:
        print("No cards found!")

def create_database_and_table():
    """Create the database and table for Pokemon cards"""
    try:
        # Connect to MySQL server (without specifying database)
        mysql_db = mysql.connector.connect(
            host="localhost",
            user="root",
            password="password"
        )
        
        cursor = mysql_db.cursor()
        
        # Create database if it doesn't exist
        cursor.execute("CREATE DATABASE IF NOT EXISTS pokemon_card_db")
        cursor.execute("USE pokemon_card_db")
        
        # Create table with all the attributes we discovered
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS pokemon_cards (
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            number VARCHAR(20),
            artist VARCHAR(255),
            hp INT,
            convertedRetreatCost INT,
            evolvesFrom VARCHAR(255),
            flavorText TEXT,
            rarity VARCHAR(100),
            regulationMark VARCHAR(20),
            supertype VARCHAR(50),
            resource VARCHAR(50),
            
            -- Image URLs
            image_small VARCHAR(500),
            image_large VARCHAR(500),
            
            -- Set information
            set_id VARCHAR(20),
            set_name VARCHAR(255),
            set_series VARCHAR(255),
            set_releaseDate DATE,
            set_printedTotal INT,
            set_total INT,
            set_ptcgoCode VARCHAR(20),
            
            -- Arrays stored as JSON
            abilities JSON,
            attacks JSON,
            subtypes JSON,
            types JSON,
            weaknesses JSON,
            resistances JSON,
            nationalPokedexNumbers JSON,
            retreatCost JSON,
            
            -- Pricing information
            cardmarket_url VARCHAR(500),
            cardmarket_updatedAt VARCHAR(50),
            cardmarket_prices JSON,
            
            tcgplayer_url VARCHAR(500),
            tcgplayer_updatedAt VARCHAR(50),
            tcgplayer_prices JSON,
            
            -- Legalities
            legalities_unlimited VARCHAR(20),
            legalities_expanded VARCHAR(20),
            legalities_standard VARCHAR(20),
            
            -- Additional fields
            ancientTrait TEXT,
            rules TEXT,
            
            -- Timestamps
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """
        
        cursor.execute(create_table_sql)
        mysql_db.commit()
        print("Database and table created successfully!")
        
        cursor.close()
        mysql_db.close()
        
    except mysql.connector.Error as err:
        print(f"Error creating database: {err}")

def insert_card_to_db(card):
    """Insert a card into the database"""
    try:
        mysql_db = mysql.connector.connect(
            host="localhost",
            user="root",
            password="password",
            database="pokemon_card_db"
        )
        
        cursor = mysql_db.cursor()
        
        # Prepare the data
        card_data = {
            'id': card.id,
            'name': card.name,
            'number': card.number,
            'artist': card.artist,
            'hp': card.hp,
            'convertedRetreatCost': card.convertedRetreatCost,
            'evolvesFrom': card.evolvesFrom,
            'flavorText': card.flavorText,
            'rarity': card.rarity,
            'regulationMark': card.regulationMark,
            'supertype': card.supertype,
            'resource': card.RESOURCE,
            
            # Images
            'image_small': card.images.small if card.images else None,
            'image_large': card.images.large if card.images else None,
            
            # Set info
            'set_id': card.set.id if card.set else None,
            'set_name': card.set.name if card.set else None,
            'set_series': card.set.series if card.set else None,
            'set_releaseDate': card.set.releaseDate if card.set else None,
            'set_printedTotal': card.set.printedTotal if card.set else None,
            'set_total': card.set.total if card.set else None,
            'set_ptcgoCode': card.set.ptcgoCode if card.set else None,
            
            # JSON arrays
            'abilities': json.dumps(card.abilities) if card.abilities else None,
            'attacks': json.dumps([{
                'name': attack.name,
                'cost': attack.cost,
                'convertedEnergyCost': attack.convertedEnergyCost,
                'damage': attack.damage,
                'text': attack.text
            } for attack in card.attacks]) if card.attacks else None,
            'subtypes': json.dumps(card.subtypes) if card.subtypes else None,
            'types': json.dumps(card.types) if card.types else None,
            'weaknesses': json.dumps([{
                'type': w.type,
                'value': w.value
            } for w in card.weaknesses]) if card.weaknesses else None,
            'resistances': json.dumps([{
                'type': r.type,
                'value': r.value
            } for r in card.resistances]) if card.resistances else None,
            'nationalPokedexNumbers': json.dumps(card.nationalPokedexNumbers) if card.nationalPokedexNumbers else None,
            'retreatCost': json.dumps(card.retreatCost) if card.retreatCost else None,
            
            # Pricing
            'cardmarket_url': card.cardmarket.url if card.cardmarket else None,
            'cardmarket_updatedAt': card.cardmarket.updatedAt if card.cardmarket else None,
            'cardmarket_prices': json.dumps({
                'averageSellPrice': card.cardmarket.prices.averageSellPrice,
                'lowPrice': card.cardmarket.prices.lowPrice,
                'trendPrice': card.cardmarket.prices.trendPrice,
                'germanProLow': card.cardmarket.prices.germanProLow,
                'suggestedPrice': card.cardmarket.prices.suggestedPrice,
                'reverseHoloSell': card.cardmarket.prices.reverseHoloSell,
                'reverseHoloLow': card.cardmarket.prices.reverseHoloLow,
                'reverseHoloTrend': card.cardmarket.prices.reverseHoloTrend,
                'lowPriceExPlus': card.cardmarket.prices.lowPriceExPlus,
                'avg1': card.cardmarket.prices.avg1,
                'avg7': card.cardmarket.prices.avg7,
                'avg30': card.cardmarket.prices.avg30,
                'reverseHoloAvg1': card.cardmarket.prices.reverseHoloAvg1,
                'reverseHoloAvg7': card.cardmarket.prices.reverseHoloAvg7,
                'reverseHoloAvg30': card.cardmarket.prices.reverseHoloAvg30
            }) if card.cardmarket and card.cardmarket.prices else None,
            
            'tcgplayer_url': card.tcgplayer.url if card.tcgplayer else None,
            'tcgplayer_updatedAt': card.tcgplayer.updatedAt if card.tcgplayer else None,
            'tcgplayer_prices': json.dumps({
                'normal': card.tcgplayer.prices.normal,
                'holofoil': card.tcgplayer.prices.holofoil,
                'reverseHolofoil': card.tcgplayer.prices.reverseHolofoil,
                'firstEditionHolofoil': card.tcgplayer.prices.firstEditionHolofoil,
                'firstEditionNormal': card.tcgplayer.prices.firstEditionNormal
            }) if card.tcgplayer and card.tcgplayer.prices else None,
            
            # Legalities
            'legalities_unlimited': card.legalities.unlimited if card.legalities else None,
            'legalities_expanded': card.legalities.expanded if card.legalities else None,
            'legalities_standard': card.legalities.standard if card.legalities else None,
            
            # Additional
            'ancientTrait': card.ancientTrait,
            'rules': card.rules
        }
        
        # Build the INSERT query
        columns = ', '.join(card_data.keys())
        placeholders = ', '.join(['%s'] * len(card_data))
        values = list(card_data.values())
        
        insert_sql = f"INSERT INTO pokemon_cards ({columns}) VALUES ({placeholders}) ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP"
        
        cursor.execute(insert_sql, values)
        mysql_db.commit()
        print(f"Card '{card.name}' inserted successfully!")
        
        cursor.close()
        mysql_db.close()
        
    except mysql.connector.Error as err:
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
    
        


