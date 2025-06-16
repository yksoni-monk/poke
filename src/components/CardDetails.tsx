import React from 'react';
import { CardData } from '../types/card';

interface CardDetailsProps {
  cardData: CardData;
  capturedImage: string | null;
  onNewScan: () => void;
}

const CardDetails: React.FC<CardDetailsProps> = ({ cardData, capturedImage, onNewScan }) => {
  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-3 text-center">
        <h2 className="text-lg font-bold text-white">Card Identified! ✨</h2>
      </div>
      
      {/* Card Images */}
      <div className="flex-1 p-4 flex flex-col">
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
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4">
          <button
            onClick={onNewScan}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-xl font-medium transition-colors text-sm"
          >
            Scan Another Card
          </button>
        </div>
      </div>
    </div>
  );
};

export default CardDetails;
