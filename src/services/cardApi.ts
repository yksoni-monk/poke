import { CardData, ScanResult } from '../types/card';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock card database for demonstration
const mockCards: CardData[] = [
  {
    name: "Charizard",
    number: "4/102",
    set: "Base Set",
    rarity: "Rare Holo",
    price: "$350.00",
    priceRange: "$300 - $400",
    condition: "Near Mint",
    imageUrl: "https://images.pokemontcg.io/base1/4_hires.png",
    description: "A legendary Fire-type Pokémon card from the original Base Set."
  },
  {
    name: "Blastoise",
    number: "2/102",
    set: "Base Set",
    rarity: "Rare Holo",
    price: "$180.00",
    priceRange: "$150 - $220",
    condition: "Near Mint",
    imageUrl: "https://images.pokemontcg.io/base1/2_hires.png",
    description: "A powerful Water-type Pokémon from the original Base Set."
  },
  {
    name: "Venusaur",
    number: "15/102",
    set: "Base Set",
    rarity: "Rare Holo",
    price: "$160.00",
    priceRange: "$140 - $200",
    condition: "Near Mint",
    imageUrl: "https://images.pokemontcg.io/base1/15_hires.png",
    description: "A classic Grass-type Pokémon from the original Base Set."
  }
];

export class CardApiService {
  static async scanCard(imageBlob: Blob): Promise<ScanResult> {
    try {
      // Create form data to send the image
      const formData = new FormData();
      formData.append('image', imageBlob, 'card.jpg');

      // Send the image to the backend
      const response = await fetch(`${API_BASE_URL}/scan-card`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        return {
          success: false,
          error: data.error || 'Failed to identify card'
        };
      }

      return {
        success: true,
        cardData: data.cardData
      };
    } catch (error) {
      console.error('Error scanning card:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error. Please check your connection and try again."
      };
    }
  }
  
  // Helper method to convert data URL to blob
  static dataURLToBlob(dataURL: string): Blob {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }
}
