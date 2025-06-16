import React, { useState, useEffect } from 'react';
import CameraCapture from '../components/CameraCapture';
import CardDetails from '../components/CardDetails';
import { CardData } from '../types/card';
import { CardApiService } from '../services/cardApi';

const Index = () => {
  console.log('Index component rendering');

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cardData, setCardData] = useState<CardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    console.log('Index component mounted');
  }, []);

  const handleImageCapture = (imageDataUrl: string) => {
    setCapturedImage(imageDataUrl);
  };

  const handleScanCard = async () => {
    if (!capturedImage) return;
    
    setIsLoading(true);
    try {
      const imageBlob = CardApiService.dataURLToBlob(capturedImage);
      const result = await CardApiService.scanCard(imageBlob);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to scan card');
      }
      
      if (result.cardData) {
        setCardData(result.cardData);
      } else {
        throw new Error('No card data received');
      }
    } catch (error) {
      console.error('Error scanning card:', error);
      alert(error instanceof Error ? error.message : 'Failed to scan card. Please try again.');
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
    <div className="h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-purple-800 flex flex-col overflow-hidden">
      <div className="flex-none text-center py-2">
        <h1 className="text-xl font-bold text-white">
          📱 PokéScan
        </h1>
        <p className="text-blue-200 text-xs">
          Scan your Pokémon cards instantly
        </p>
      </div>
      <div className="flex-1 flex items-center justify-center p-2 min-h-0">
        <div className="w-full max-w-md h-full flex flex-col">
          {!capturedImage && !cardData && (
            <div className="flex-1 min-h-0">
              <CameraCapture onImageCapture={handleImageCapture} />
            </div>
          )}
          {capturedImage && !cardData && (
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="p-3">
                <h3 className="text-base font-semibold text-gray-800 mb-2 text-center">
                  Review Your Capture
                </h3>
                <div className="relative rounded-lg overflow-hidden mb-3">
                  <img 
                    src={capturedImage} 
                    alt="Captured card" 
                    className="w-full max-w-[280px] mx-auto aspect-[3/4] object-contain"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleRetake}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-xl font-medium transition-colors text-sm"
                  >
                    Retake
                  </button>
                  <button
                    onClick={handleScanCard}
                    disabled={isLoading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 px-4 rounded-xl font-medium transition-colors flex items-center justify-center text-sm"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent mr-2"></div>
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
            <div className="flex-1 min-h-0">
              <CardDetails 
                cardData={cardData} 
                capturedImage={capturedImage}
                onNewScan={handleNewScan}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;