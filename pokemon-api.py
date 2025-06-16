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
    
        


