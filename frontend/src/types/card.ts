
export interface PricingInfo {
  averagePrice: number | null;
  priceSource: string | null;
  currency: string;
}

export interface CardData {
  name: string;
  number: string;
  id: string;
  imageUrl: string;
  artist?: string;
  hp?: number;
  rarity?: string;
  supertype?: string;
  set_name?: string;
  abilities?: any[];
  attacks?: any[];
  types?: string[];
  weaknesses?: any[];
  resistances?: any[];
  pricing?: PricingInfo;
}

export interface ScanResult {
  success: boolean;
  cardData?: CardData;
  error?: string;
}
