import React from 'react';
import { CardData } from '../types/card';

interface LibraryCardDetailsProps {
  cardData: CardData;
  onBack: () => void;
}

const LibraryCardDetails: React.FC<LibraryCardDetailsProps> = ({ cardData, onBack }) => {
  const formatPrice = (price: number | null, currency: string) => {
    if (price === null) return 'Price not available';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  return (
    <div className="h-dvh flex flex-col bg-gradient-to-br from-blue-900 via-purple-900 to-purple-800">
      <div className="flex-none p-2 bg-blue-900 text-white text-center">
        <button onClick={onBack} className="text-blue-200 hover:text-white">&larr; Back to Library</button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-0 overflow-auto">
        <img src={cardData.imageUrl} alt={cardData.name} className="w-48 h-64 object-contain rounded-xl shadow mb-4 bg-white" />
        <div className="text-white text-2xl font-bold mb-2 text-center">{cardData.name}</div>
        {cardData.rarity && (
          <div className="text-blue-200 text-base mb-2">Rarity: <span className="font-semibold">{cardData.rarity}</span></div>
        )}
        {cardData.pricing && (
          <div className="text-green-200 text-base mb-2">
            Price: <span className="font-semibold">{formatPrice(cardData.pricing.averagePrice, cardData.pricing.currency)}</span>
            {cardData.pricing.priceSource && (
              <span className="text-xs text-blue-100 ml-2">({cardData.pricing.priceSource})</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LibraryCardDetails; 