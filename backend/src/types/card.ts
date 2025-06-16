
export interface CardData {
  name: string;
  number: string;
  set: string;
  rarity: string;
  price: string;
  priceRange: string;
  condition: string;
  imageUrl: string;
  description?: string;
}

export interface ScanResult {
  success: boolean;
  cardData?: CardData;
  error?: string;
}
