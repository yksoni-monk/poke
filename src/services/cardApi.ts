
import { CardData, ScanResult } from '../types/card';

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
      // Simulate network delay
      await delay(1500 + Math.random() * 1000);
      
      // In a real implementation, you would:
      // 1. Convert the blob to the format your backend expects
      // 2. Send the image to your AI similarity algorithm
      // 3. Parse the response
      
      // For now, randomly return one of the mock cards
      const randomCard = mockCards[Math.floor(Math.random() * mockCards.length)];
      
      // Simulate occasional failures for testing
      if (Math.random() < 0.1) {
        return {
          success: false,
          error: "Could not identify the card. Please try again with better lighting."
        };
      }
      
      return {
        success: true,
        cardData: randomCard
      };
    } catch (error) {
      console.error('Error scanning card:', error);
      return {
        success: false,
        error: "Network error. Please check your connection and try again."
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
