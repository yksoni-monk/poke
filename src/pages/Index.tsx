import React, { useState, useEffect, useRef } from 'react';
import CameraCapture from '../components/CameraCapture';
import CardDetails from '../components/CardDetails';
import { CardData } from '../types/card';
import { CardApiService } from '../services/cardApi';

const Index = () => {
  console.log('Index component rendering');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cardData, setCardData] = useState<CardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    console.log('Index component mounted');
  }, []);

  useEffect(() => {
    if (capturedImage && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const img = new Image();
        img.src = capturedImage;
        img.onload = () => {
          // Log image dimensions
          console.log(`Review image intrinsic: ${img.naturalWidth}x${img.naturalHeight}`);
          // Set canvas to intrinsic crop size
          canvas.width = img.naturalWidth; // ~486
          canvas.height = img.naturalHeight; // ~648
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          // Red outline
          ctx.strokeStyle = 'red';
          ctx.lineWidth = 2;
          ctx.strokeRect(0, 0, canvas.width, canvas.height);
        };
        img.onerror = () => console.error('Failed to load review image');
      }
    }
  }, [capturedImage]);

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
                    className="w-full max-w-[358.4px] mx-auto aspect-[3/4] object-contain"
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      console.log(`Review image displayed: ${img.width}x${img.height}`);
                    }}
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[358.4px] aspect-[3/4]"
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