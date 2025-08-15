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
      {/* Header */}
      <div className="flex-none p-6 bg-black/20 backdrop-blur-sm border-b border-white/10">
        <button 
          onClick={onBack} 
          className="text-blue-200 hover:text-white transition-colors duration-200 flex items-center gap-2 text-base font-medium"
        >
          <span className="text-xl">←</span>
          Back to Library
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-0 overflow-auto">
        <div className="max-w-md w-full space-y-8">
          {/* Card Image */}
          <div className="flex justify-center">
            <div className="relative">
              <img 
                src={cardData.imageUrl} 
                alt={cardData.name} 
                className="w-64 h-80 object-contain rounded-2xl shadow-2xl bg-white/10 backdrop-blur-sm border border-white/20" 
              />
            </div>
          </div>

          {/* Card Info */}
          <div className="space-y-6">
            {/* Name */}
            <div className="text-center">
              <h1 className="text-3xl font-bold text-white mb-2">{cardData.name}</h1>
              {cardData.number && (
                <p className="text-blue-200 text-sm font-medium">#{cardData.number}</p>
              )}
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 gap-4">
              {/* Rarity */}
              {cardData.rarity && (
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <div className="text-blue-200 text-sm font-medium mb-1">Rarity</div>
                  <div className="text-white font-semibold">{cardData.rarity}</div>
                </div>
              )}

              {/* Price */}
              {cardData.pricing && (
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <div className="text-green-200 text-sm font-medium mb-1">Price</div>
                  <div className="text-white font-bold text-xl">
                    {formatPrice(cardData.pricing.averagePrice, cardData.pricing.currency)}
                  </div>
                  {cardData.pricing.priceSource && (
                    <div className="text-blue-200 text-xs mt-1">
                      Source: {cardData.pricing.priceSource}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LibraryCardDetails; 