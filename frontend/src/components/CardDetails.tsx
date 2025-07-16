import React from 'react';
import { CardData } from '../types/card';

interface CardDetailsProps {
  cardData: CardData;
  capturedImage: string | null;
  onNewScan: () => void;
  inLibrary?: boolean;
  onAddToLibrary?: () => void;
}

const CardDetails: React.FC<CardDetailsProps> = ({ cardData, capturedImage, onNewScan, inLibrary, onAddToLibrary }) => {
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
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden h-full flex flex-col min-h-0">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-3 text-center">
        <h2 className="text-lg font-bold text-white">Card Identified! ✨</h2>
      </div>
      {/* Main Content Scrollable */}
      <div className="flex-1 min-h-0 overflow-auto p-4 flex flex-col">
        <div className="grid grid-cols-2 gap-4 flex-1">
          {/* Captured Image */}
          <div className="flex flex-col">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Your Scan</h4>
            <div className="flex-1 rounded-lg overflow-hidden border-2 border-gray-200 flex items-center justify-center bg-gray-50">
              {capturedImage && (
                <img 
                  src={capturedImage} 
                  alt="Captured card" 
                  className="w-full h-full object-contain p-1"
                />
              )}
            </div>
          </div>
          {/* Reference Image */}
          <div className="flex flex-col">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Reference</h4>
            <div className="flex-1 rounded-lg overflow-hidden border-2 border-green-200 flex items-center justify-center bg-gray-50">
              <img 
                src={cardData.imageUrl} 
                alt={cardData.name}
                className="w-full h-full object-contain p-1"
              />
            </div>
          </div>
        </div>
        {/* Card Details */}
        <div className="mt-4 space-y-2">
          <div className="bg-gray-50 rounded-xl p-3">
            <h3 className="text-lg font-semibold text-gray-900">{cardData.name}</h3>
            <p className="text-sm text-gray-600">#{cardData.number}</p>
            {cardData.set_name && (
              <p className="text-xs text-gray-500 mt-1">{cardData.set_name}</p>
            )}
          </div>
          {/* Pricing Information */}
          {cardData.pricing && (
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-3 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Average Price</h4>
                  <p className="text-lg font-bold text-green-600">
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
          <div className="grid grid-cols-2 gap-2 text-xs">
            {cardData.rarity && (
              <div className="bg-blue-50 rounded-lg p-2">
                <span className="text-blue-700 font-medium">Rarity:</span>
                <span className="text-blue-600 ml-1">{cardData.rarity}</span>
              </div>
            )}
            {cardData.hp && (
              <div className="bg-red-50 rounded-lg p-2">
                <span className="text-red-700 font-medium">HP:</span>
                <span className="text-red-600 ml-1">{cardData.hp}</span>
              </div>
            )}
            {cardData.artist && (
              <div className="bg-purple-50 rounded-lg p-2">
                <span className="text-purple-700 font-medium">Artist:</span>
                <span className="text-purple-600 ml-1">{cardData.artist}</span>
              </div>
            )}
            {cardData.supertype && (
              <div className="bg-orange-50 rounded-lg p-2">
                <span className="text-orange-700 font-medium">Type:</span>
                <span className="text-orange-600 ml-1">{cardData.supertype}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Sticky Action Button */}
      <div className="sticky bottom-0 left-0 right-0 bg-white p-4 z-10 border-t border-gray-200 flex gap-4">
        <button
          onClick={onNewScan}
          className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2.5 px-4 rounded-xl font-medium transition-colors text-sm"
        >
          Scan Another Card
        </button>
        <button
          onClick={onAddToLibrary}
          disabled={inLibrary}
          className={`flex-1 py-2.5 px-4 rounded-xl font-medium transition-colors text-sm ${inLibrary ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
        >
          {inLibrary ? 'In Library' : 'Add to Library'}
        </button>
      </div>
    </div>
  );
};

export default CardDetails;
