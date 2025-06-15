
import React, { useState } from 'react';
import CameraCapture from '../components/CameraCapture';
import CardDetails from '../components/CardDetails';
import { CardData } from '../types/card';

const Index = () => {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cardData, setCardData] = useState<CardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleImageCapture = (imageDataUrl: string) => {
    setCapturedImage(imageDataUrl);
  };

  const handleScanCard = async () => {
    if (!capturedImage) return;
    
    setIsLoading(true);
    try {
      // Convert data URL to blob for API call
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      
      // Simulate API call - replace with your actual backend
      const mockResult: CardData = {
        name: "Charizard",
        number: "4/102",
        set: "Base Set",
        rarity: "Rare Holo",
        price: "$350.00",
        priceRange: "$300 - $400",
        condition: "Near Mint",
        imageUrl: "https://images.pokemontcg.io/base1/4_hires.png",
        description: "A legendary Fire-type Pokémon card from the original Base Set."
      };
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setCardData(mockResult);
    } catch (error) {
      console.error('Error scanning card:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setCardData(null);
  };

  const handleNewScan = () => {
    setCapturedImage(null);
    setCardData(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-purple-800">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            📱 PokéScan
          </h1>
          <p className="text-blue-200 text-sm">
            Scan your Pokémon cards instantly
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-md mx-auto">
          {!capturedImage && !cardData && (
            <CameraCapture onImageCapture={handleImageCapture} />
          )}
          
          {capturedImage && !cardData && (
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 text-center">
                  Review Your Capture
                </h3>
                <div className="relative rounded-lg overflow-hidden mb-4">
                  <img 
                    src={capturedImage} 
                    alt="Captured card" 
                    className="w-full h-64 object-cover"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleRetake}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-3 px-6 rounded-xl font-medium transition-colors"
                  >
                    Retake
                  </button>
                  <button
                    onClick={handleScanCard}
                    disabled={isLoading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 px-6 rounded-xl font-medium transition-colors flex items-center justify-center"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                        Scanning...
                      </>
                    ) : (
                      'Scan Card'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {cardData && (
            <CardDetails 
              cardData={cardData} 
              capturedImage={capturedImage}
              onNewScan={handleNewScan}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
