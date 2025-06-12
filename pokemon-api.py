import csv
import pandas as pd
from dotenv import load_dotenv
from pokemontcgsdk import Card
from pokemontcgsdk import Set
from pokemontcgsdk import Type
from pokemontcgsdk import Supertype
from pokemontcgsdk import Subtype
from pokemontcgsdk import Rarity
from pokemontcgsdk import RestClient
import os


# load POKEMON_API_KEY from .env
load_dotenv()
POKEMONTCG_IO_API_KEY = os.getenv("POKEMON_API_KEY")

RestClient.configure(POKEMONTCG_IO_API_KEY)

card_db_file = "card_names.csv"

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


# open the card_names.txt file to search a particular card name. name can yield multiple rows
card_name = "Charizard"
with open(card_db_file, "r") as f:
    reader = csv.reader(f)
    pandas_df = pd.DataFrame(reader, columns=["card name", "card id", "card number", "card image url"])
    df = pandas_df[pandas_df["card name"] == card_name]
    print(df)





