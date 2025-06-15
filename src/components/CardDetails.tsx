
import React from 'react';
import { CardData } from '../types/card';

interface CardDetailsProps {
  cardData: CardData;
  capturedImage: string | null;
  onNewScan: () => void;
}

const CardDetails: React.FC<CardDetailsProps> = ({ cardData, capturedImage, onNewScan }) => {
  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-4 text-center">
        <h2 className="text-xl font-bold text-white">Card Identified! ✨</h2>
      </div>
      
      {/* Card Images */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Captured Image */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Your Scan</h4>
            <div className="rounded-lg overflow-hidden border-2 border-gray-200">
              {capturedImage && (
                <img 
                  src={capturedImage} 
                  alt="Captured card" 
                  className="w-full h-32 object-cover"
                />
              )}
            </div>
          </div>
          
          {/* Reference Image */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Reference</h4>
            <div className="rounded-lg overflow-hidden border-2 border-green-200">
              <img 
                src={cardData.imageUrl} 
                alt={cardData.name}
                className="w-full h-32 object-cover"
              />
            </div>
          </div>
        </div>
        
        {/* Card Details */}
        <div className="space-y-4">
          <div>
            <h3 className="text-2xl font-bold text-gray-800 mb-1">{cardData.name}</h3>
            <p className="text-gray-600">{cardData.set} • {cardData.number}</p>
          </div>
          
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-medium">Rarity</span>
              <span className="text-purple-600 font-semibold">{cardData.rarity}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-medium">Condition</span>
              <span className="text-green-600 font-semibold">{cardData.condition}</span>
            </div>
            
            <div className="border-t pt-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-gray-600 font-medium">Current Price</span>
                <span className="text-2xl font-bold text-green-600">{cardData.price}</span>
              </div>
              <p className="text-sm text-gray-500">Range: {cardData.priceRange}</p>
            </div>
          </div>
          
          {cardData.description && (
            <div className="bg-blue-50 rounded-xl p-4">
              <h4 className="font-semibold text-blue-800 mb-2">Description</h4>
              <p className="text-blue-700 text-sm">{cardData.description}</p>
            </div>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="mt-6 space-y-3">
          <button
            onClick={onNewScan}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-xl font-medium transition-colors"
          >
            Scan Another Card
          </button>
          
          <div className="flex gap-3">
            <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium transition-colors text-sm">
              Save to Collection
            </button>
            <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium transition-colors text-sm">
              Share Result
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardDetails;
