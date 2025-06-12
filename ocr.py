import requests
from PIL import Image
import json
import os
from dotenv import load_dotenv



def ocr_image(image_path):
    """
    Perform OCR on an image using OCR.space API.
    
    Args:
        image_path (str): Path to the image file
        
    Returns:
        str: Extracted text from the image
    """
    #load OCR_API_KEY from .env
    load_dotenv()
    OCR_API_KEY = os.getenv("OCR_API_KEY")

    url = "https://api.ocr.space/parse/image"
    api_key = OCR_API_KEY

    OCREngine = "2"
    
    # Prepare the files and data for the request
    files = {
        'file': open(image_path, 'rb')
    }
    data = {
        'apikey': api_key,
        'language': 'eng',
        'isOverlayRequired': 'false',
        'OCREngine': OCREngine
    }
    
    try:
        # Make the POST request
        response = requests.post(url, files=files, data=data)
        response.raise_for_status()  # Raise an exception for bad status codes
        
        # Parse the JSON response
        result = response.json()
        
        # Extract the text from the response
        if result['IsErroredOnProcessing']:
            raise Exception(f"OCR processing error: {result.get('ErrorMessage', 'Unknown error')}")
            
        # Combine all text from parsed results
        extracted_text = ' '.join([text['ParsedText'] for text in result['ParsedResults']])
        return extracted_text
        
    except requests.exceptions.RequestException as e:
        raise Exception(f"API request failed: {str(e)}")
    finally:
        # Ensure the file is closed
        files['file'].close()





if __name__ == "__main__":
    image_path = "/Users/yksoni/Downloads/pokemon4.jpeg"
    text = ocr_image(image_path)
    print(text)






