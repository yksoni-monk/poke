import React from 'react';
import { CardData } from '../types/card';

interface CardDetailsProps {
  cardData: CardData;
  capturedImage: string | null;
  onBackToHome: () => void;
  inLibrary?: boolean;
  onAddToLibrary?: () => void;
}

const CardDetails: React.FC<CardDetailsProps> = ({ cardData, capturedImage, onBackToHome, inLibrary, onAddToLibrary }) => {
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
    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden h-full flex flex-col min-h-0">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-6 text-center">
        <div className="text-2xl mb-2">✨</div>
        <h2 className="text-xl font-bold text-white">Card Identified!</h2>
      </div>

      {/* Main Content Scrollable */}
      <div className="flex-1 min-h-0 overflow-auto p-6 flex flex-col">
        {/* Card Images */}
        <div className="grid grid-cols-2 gap-6 flex-1 mb-6">
          {/* Captured Image */}
          <div className="flex flex-col">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Your Scan</h4>
            <div className="flex-1 rounded-2xl overflow-hidden border-2 border-gray-200 flex items-center justify-center bg-gray-50 shadow-sm">
              {capturedImage && (
                <img 
                  src={capturedImage} 
                  alt="Captured card" 
                  className="w-full h-full object-contain p-3"
                />
              )}
            </div>
          </div>
          
          {/* Reference Image */}
          <div className="flex flex-col">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">Identified Card</h4>
            <div className="flex-1 rounded-2xl overflow-hidden border-2 border-green-200 flex items-center justify-center bg-gray-50 shadow-sm">
              <img 
                src={cardData.imageUrl} 
                alt={cardData.name}
                className="w-full h-full object-contain p-3"
              />
            </div>
          </div>
        </div>
        
        {/* Card Details */}
        <div className="space-y-4">
          {/* Card Name and Number */}
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-4 border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-1">{cardData.name}</h3>
            <p className="text-sm text-gray-600 font-medium">#{cardData.number}</p>
            {cardData.set_name && (
              <p className="text-xs text-gray-500 mt-1">{cardData.set_name}</p>
            )}
          </div>

          {/* Pricing Information */}
          {cardData.pricing && (
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-4 border border-green-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Average Price</h4>
                  <p className="text-2xl font-bold text-green-600">
                    {formatPrice(cardData.pricing.averagePrice, cardData.pricing.currency)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">
                    Source: {cardData.pricing.priceSource || 'Unknown'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {cardData.pricing.currency}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Additional Card Info */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {cardData.rarity && (
              <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
                <span className="text-blue-700 font-semibold">Rarity:</span>
                <span className="text-blue-600 ml-1">{cardData.rarity}</span>
              </div>
            )}
            {cardData.hp && (
              <div className="bg-red-50 rounded-xl p-3 border border-red-200">
                <span className="text-red-700 font-semibold">HP:</span>
                <span className="text-red-600 ml-1">{cardData.hp}</span>
              </div>
            )}
            {cardData.artist && (
              <div className="bg-purple-50 rounded-xl p-3 border border-purple-200">
                <span className="text-purple-700 font-semibold">Artist:</span>
                <span className="text-purple-600 ml-1">{cardData.artist}</span>
              </div>
            )}
            {cardData.supertype && (
              <div className="bg-orange-50 rounded-xl p-3 border border-orange-200">
                <span className="text-orange-700 font-semibold">Type:</span>
                <span className="text-orange-600 ml-1">{cardData.supertype}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Action Button */}
      <div className="sticky bottom-0 left-0 right-0 bg-white p-6 z-10 border-t border-gray-200 shadow-lg">
        <div className="flex gap-4">
          <button
            onClick={onBackToHome}
            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 px-6 rounded-2xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
          >
            Back to Home
          </button>
          <button
            onClick={onAddToLibrary}
            disabled={inLibrary}
            className={`flex-1 py-3 px-6 rounded-2xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] ${
              inLibrary 
                ? 'bg-gray-400 text-white cursor-not-allowed shadow-none' 
                : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white'
            }`}
          >
            {inLibrary ? '✓ In Library' : 'Add to Library'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CardDetails;
