import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import CameraCapture from '../components/CameraCapture';
import CardDetails from '../components/CardDetails';
import { CardData } from '../types/card';
import { CardApiService, useCardApi } from '../services/cardApi';
import { Camera, Upload, ArrowLeft, User, LogOut } from 'lucide-react';
import ReactCrop, { Crop as CropType, PixelCrop, PercentCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { resizeImage, getCroppedImg, validateImageFile, resetFileInput, handleCropCompleteUtil } from '../utils/imageUtils';

const Index = () => {
  console.log('Index component rendering');

  const { user, isAuthenticated, signOut } = useAuth();
  const navigate = useNavigate();
  const { fetchLibrary } = useCardApi();
  

  const [cardData, setCardData] = useState<CardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentMode, setCurrentMode] = useState<'menu' | 'upload' | 'crop' | 'details'>('menu');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<CropType>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | PercentCrop>();
  const [useAspectRatio, setUseAspectRatio] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropImageRef = useRef<HTMLImageElement | null>(null);
  const [libraryIds, setLibraryIds] = useState<string[]>([]);

  // Pokemon card aspect ratio is 5:7 (width:height)
  const CARD_ASPECT_RATIO = 5 / 7;

  useEffect(() => {
    console.log('Index component mounted');
    // Fetch library on mount if authenticated
    if (isAuthenticated) {
      const loadLibrary = async () => {
        try {
          const data = await fetchLibrary();
          if (data.success) {
            setLibraryIds(data.card_ids || []);
          }
        } catch {}
      };
      loadLibrary();
    }
  }, [isAuthenticated]);

  const handleImageCapture = (imageDataUrl: string) => {
    // Image captured
    setCurrentMode('menu');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type and size using shared utility
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      alert(validation.error);
      return;
    }

    // Resize image before cropping for consistent crop UI
    try {
      const resizedBlob = await resizeImage(file, 1200, 1200);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          setUploadedImage(result);
          setCurrentMode('crop');
        }
      };
      reader.readAsDataURL(resizedBlob);
    } catch (err) {
      alert('Failed to process image.');
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const resetFileInputHandler = () => {
    resetFileInput(fileInputRef.current);
  };

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    
    // Start with a free crop (no aspect ratio constraint) for better handling of images with large borders
    const crop = {
      unit: '%' as const,
      x: 10,
      y: 10,
      width: 80,
      height: 80,
    };
    setCrop(crop);
  }, []);

  const handleCropComplete = useCallback(async () => {
    if (!uploadedImage || !completedCrop) return;
    const img = cropImageRef.current;
    const displayedWidth = img?.width;
    const displayedHeight = img?.height;
    
    setIsLoading(true);
    
    // Add tactile feedback for mobile devices
    if ('vibrate' in navigator) {
      navigator.vibrate(50); // Short vibration for button press
    }
    
    // Add another vibration after a short delay to indicate processing started
    setTimeout(() => {
      if ('vibrate' in navigator) {
        navigator.vibrate(30); // Subtle vibration to indicate processing
      }
    }, 100);
    
    try {
      await new Promise<void>((resolve, reject) => {
        handleCropCompleteUtil(
          uploadedImage,
          completedCrop,
          async (croppedImageUrl) => {
            try {
              // Convert base64 to blob and scan the card
              const response = await fetch(croppedImageUrl);
              const imageBlob = await response.blob();
              
              // Call the API to scan the card
              const result = await CardApiService.scanCard(imageBlob);
              
              if (!result.success) {
                throw new Error(result.error || 'Failed to scan card');
              }
              
              if (!result.cardData) {
                throw new Error('No card data received');
              }
              
              setCardData(result.cardData);
              setCroppedImage(croppedImageUrl);
              setUploadedImage(null);
              setCurrentMode('details');
              setCrop(undefined);
              setCompletedCrop(undefined);
              resolve();
            } catch (error) {
              reject(error);
            }
          },
          (err) => {
            console.error('Crop error:', err);
            alert('Crop failed.');
            reject(err);
          },
          displayedWidth,
          displayedHeight
        );
      });
    } catch (error) {
      console.error('Error scanning card:', error);
      alert(error instanceof Error ? error.message : 'Failed to scan card. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [uploadedImage, completedCrop]);

  const handleCropRetake = useCallback(() => {
    setUploadedImage(null);
    setCrop(undefined);
    setCompletedCrop(undefined);
    setUseAspectRatio(false);
    setCurrentMode('menu');
  }, []);

  const handleToggleAspectRatio = useCallback(() => {
    setUseAspectRatio(!useAspectRatio);
    // Reset crop when switching modes to avoid confusion
    if (uploadedImage && cropImageRef.current) {
      const { naturalWidth, naturalHeight } = cropImageRef.current;
      if (!useAspectRatio) {
        // Switching to aspect ratio mode - create a centered 5:7 crop
        const newCrop = centerCrop(
          makeAspectCrop(
            {
              unit: '%',
              width: 80,
            },
            CARD_ASPECT_RATIO,
            naturalWidth,
            naturalHeight,
          ),
          naturalWidth,
          naturalHeight,
        );
        setCrop(newCrop);
      } else {
        // Switching to free crop mode - create a square crop
        const newCrop = {
          unit: '%' as const,
          x: 10,
          y: 10,
          width: 80,
          height: 80,
        };
        setCrop(newCrop);
      }
    }
  }, [useAspectRatio]);





  const handleBackToMenu = () => {
    setCurrentMode('menu');

    setCardData(null);
    setCroppedImage(null);
    setUploadedImage(null);
    setCrop(undefined);
    setCompletedCrop(undefined);
  };

  const handleAddToLibrary = async () => {
    console.log('Add to Library button clicked');
    if (!cardData || !isAuthenticated) return;
    try {
      const data = await CardApiService.addToLibrary(cardData.id);
      if (data.success) {
        setLibraryIds((prev) => [...prev, cardData.id]);
      }
    } catch {}
  };

  // Show main menu
  if (currentMode === 'menu' && !cardData) {
    return (
      <div className="h-dvh bg-gradient-to-br from-blue-900 via-purple-900 to-purple-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-none text-center py-6 px-4">
          <div className="mb-2">
            <span className="text-3xl">📱</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">
            PokéScan
          </h1>
          <p className="text-blue-100 text-sm font-medium">
            Scan your Pokémon cards instantly
          </p>
          
          {/* Authentication Status */}
          <div className="mt-4 flex justify-center items-center gap-3">
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-2 rounded-full border border-white/30">
                  <User className="w-4 h-4 text-white" />
                  <span className="text-white text-sm font-medium">
                    {user?.email}
                  </span>
                </div>
                <button
                  onClick={signOut}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-full text-sm font-medium transition-colors duration-200"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-blue-200 text-sm">
                  Sign in to save cards to your library
                </span>
                <button
                  onClick={() => navigate('/auth')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200"
                >
                  Sign In
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main Content - Scrollable */}
        <div className="flex-1 min-h-0 overflow-auto p-4">
          <div className="w-full max-w-sm mx-auto space-y-3 py-4">


            {/* Upload Image */}
            <button
              onClick={handleUploadClick}
              className="w-full bg-white/15 backdrop-blur-md rounded-3xl p-6 text-center hover:bg-white/25 transition-all duration-300 border border-white/20 hover:border-white/40 shadow-xl hover:shadow-2xl transform hover:scale-[1.02]"
            >
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                <Upload className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Upload Image</h3>
              <p className="text-blue-100 text-sm">Select image from gallery</p>
            </button>

            {/* Library - Only show when authenticated */}
            {isAuthenticated && (
              <button
                onClick={() => navigate('/library')}
                className="w-full bg-white/15 backdrop-blur-md rounded-3xl p-6 text-center hover:bg-white/25 transition-all duration-300 border border-white/20 hover:border-white/40 shadow-xl hover:shadow-2xl transform hover:scale-[1.02]"
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-2xl">📚</span>
                </div>
                <h3 className="text-white font-bold text-lg mb-2">View Library</h3>
                <p className="text-blue-100 text-sm">Browse your saved cards</p>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-none text-center py-4">
          <p className="text-blue-200 text-xs opacity-70">
            Powered by AI • Built for Pokémon fans
          </p>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          onClick={resetFileInputHandler}
          className="hidden"
        />
      </div>
    );
  }





  // Show crop interface for uploaded image
  if (currentMode === 'crop' && uploadedImage) {
    return (
      <div className="h-dvh bg-black flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-none bg-black/90 backdrop-blur-sm p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <button
              onClick={handleCropRetake}
              className="flex items-center gap-3 text-white hover:text-blue-300 transition-colors duration-200 text-base font-medium"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Menu
            </button>
            <div className="flex items-center gap-4">
              {!isLoading && (
                <button
                  onClick={handleToggleAspectRatio}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    useAspectRatio
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {useAspectRatio ? '5:7 Ratio' : 'Free Crop'}
                </button>
              )}
              {isLoading && (
                <div className="flex items-center gap-2 text-green-400">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-400 border-t-transparent"></div>
                  <span className="text-sm font-medium">Processing...</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Crop Area */}
        <div className="flex-1 relative overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto mb-4"></div>
                <p className="text-white font-medium">Scanning your card...</p>
                <p className="text-white/70 text-sm mt-2">This may take a few seconds</p>
              </div>
            </div>
          )}
          

          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(pixelCrop, percentCrop) => {
              console.log('ReactCrop onComplete args:', pixelCrop, percentCrop);
              setCompletedCrop(percentCrop); // Use percent crop
            }}
            aspect={useAspectRatio ? CARD_ASPECT_RATIO : undefined}
            minWidth={100}
            minHeight={100}
            keepSelection
            className="max-h-full"
            style={{ touchAction: 'none' }}
          >
            <img
              ref={cropImageRef}
              src={uploadedImage}
              onLoad={onImageLoad}
              alt="Uploaded card"
              className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${
                isLoading ? 'opacity-70' : 'opacity-100'
              }`}
              style={{ touchAction: 'none' }}
            />
          </ReactCrop>
        </div>

        {/* Action Buttons */}
        <div className="p-6 bg-gradient-to-t from-black/90 to-transparent">
          <div className="flex justify-center gap-4">
            <button
              onClick={handleCropRetake}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-2xl font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={handleCropComplete}
              disabled={!completedCrop || isLoading}
              className={`px-6 py-3 text-white rounded-2xl font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg disabled:cursor-not-allowed active:scale-95 transform touch-manipulation ${
                isLoading 
                  ? 'bg-green-700 animate-pulse' 
                  : 'bg-green-600 hover:bg-green-500 active:bg-green-700 disabled:opacity-50 disabled:hover:bg-green-600'
              }`}
              style={{ 
                minHeight: '48px', // Better touch target for mobile
                WebkitTapHighlightColor: 'transparent' // Remove default mobile tap highlight
              }}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Scanning...
                </>
              ) : (
                'Use Crop'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }



  // Show card details
  if (currentMode === 'details' && cardData) {
    const inLibrary = libraryIds.includes(cardData.id);
    return (
      <div className="h-dvh bg-gradient-to-br from-blue-900 via-purple-900 to-purple-800 flex flex-col overflow-hidden">
        <div className="flex-none text-center py-2">
          <h1 className="text-xl font-bold text-white">
            📱 PokéScan
          </h1>
          <p className="text-blue-200 text-xs">
            Scan your Pokémon cards instantly
          </p>
        </div>
        <div className="flex-1 flex items-center justify-center p-2 min-h-0 overflow-hidden">
          <div className="w-full max-w-md h-full flex flex-col min-h-0 overflow-hidden">
            <CardDetails 
              cardData={cardData} 
              capturedImage={croppedImage}
              onBackToHome={() => {
                setCurrentMode('menu');
                setCardData(null);
                setCroppedImage(null);
              }}
              inLibrary={inLibrary}
              onAddToLibrary={handleAddToLibrary}
            />
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default Index;