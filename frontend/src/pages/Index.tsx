import React, { useState, useEffect, useRef, useCallback } from 'react';
import CameraCapture from '../components/CameraCapture';
import CardDetails from '../components/CardDetails';
import { CardData } from '../types/card';
import { CardApiService } from '../services/cardApi';
import { Camera, Upload, ArrowLeft } from 'lucide-react';
import ReactCrop, { Crop as CropType, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { resizeImage } from '../utils/imageUtils';

const Index = () => {
  console.log('Index component rendering');

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cardData, setCardData] = useState<CardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentMode, setCurrentMode] = useState<'menu' | 'camera' | 'upload' | 'crop'>('menu');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<CropType>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pokemon card aspect ratio is 5:7 (width:height)
  const CARD_ASPECT_RATIO = 5 / 7;

  useEffect(() => {
    console.log('Index component mounted');
  }, []);

  const handleImageCapture = (imageDataUrl: string) => {
    setCapturedImage(imageDataUrl);
    setCurrentMode('menu');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB.');
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

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    // Create a centered crop with 5:7 aspect ratio
    const crop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90,
        },
        CARD_ASPECT_RATIO,
        naturalWidth,
        naturalHeight,
      ),
      naturalWidth,
      naturalHeight,
    );
    setCrop(crop);
  }, []);

  const getCroppedImg = useCallback(
    (image: HTMLImageElement, crop: PixelCrop): Promise<string> => {
      console.log('Cropping with dimensions:', crop);
      console.log('Image display size:', image.width, 'x', image.height);
      console.log('Image natural size:', image.naturalWidth, 'x', image.naturalHeight);
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('No 2d context');
      }

      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;
      
      console.log('Scale factors:', scaleX, scaleY);

      // Calculate actual crop dimensions in natural image coordinates
      const naturalCropX = crop.x * scaleX;
      const naturalCropY = crop.y * scaleY;
      const naturalCropWidth = crop.width * scaleX;
      const naturalCropHeight = crop.height * scaleY;
      
      console.log('Natural crop dimensions:', naturalCropX, naturalCropY, naturalCropWidth, naturalCropHeight);

      canvas.width = crop.width;
      canvas.height = crop.height;

      ctx.imageSmoothingQuality = 'high';

      ctx.drawImage(
        image,
        naturalCropX,
        naturalCropY,
        naturalCropWidth,
        naturalCropHeight,
        0,
        0,
        crop.width,
        crop.height,
      );

      return new Promise((resolve) => {
        // Return base64 data URL instead of blob URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        console.log('Crop completed, canvas size:', canvas.width, 'x', canvas.height);
        resolve(dataUrl);
      });
    },
    []
  );

  const handleCropComplete = useCallback(async () => {
    if (!uploadedImage || !completedCrop) return;

    const image = new Image();
    image.src = uploadedImage;
    
    await new Promise((resolve) => {
      image.onload = resolve;
    });

    try {
      const croppedImageUrl = await getCroppedImg(image, completedCrop);
      setCapturedImage(croppedImageUrl);
      setUploadedImage(null);
      setCurrentMode('menu');
      setCrop(undefined);
      setCompletedCrop(undefined);
    } catch (err) {
      console.error('Crop error:', err);
      alert('Crop failed.');
    }
  }, [uploadedImage, completedCrop, getCroppedImg]);

  const handleCropRetake = useCallback(() => {
    setUploadedImage(null);
    setCrop(undefined);
    setCompletedCrop(undefined);
    setCurrentMode('menu');
  }, []);

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
    setCurrentMode('menu');
  };

  const handleBackToMenu = () => {
    setCurrentMode('menu');
    setCapturedImage(null);
    setCardData(null);
    setUploadedImage(null);
    setCrop(undefined);
    setCompletedCrop(undefined);
  };

  // Show main menu
  if (currentMode === 'menu' && !capturedImage && !cardData) {
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
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md grid grid-cols-2 gap-4">
            {/* Scan Card */}
            <button
              onClick={() => setCurrentMode('camera')}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center hover:bg-white/20 transition-all border border-white/20"
            >
              <div className="w-16 h-16 mx-auto mb-4 bg-blue-500 rounded-full flex items-center justify-center">
                <Camera className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-white font-semibold mb-2">Scan Card</h3>
              <p className="text-blue-200 text-xs">Use camera to capture card</p>
            </button>

            {/* Upload Image */}
            <button
              onClick={handleUploadClick}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center hover:bg-white/20 transition-all border border-white/20"
            >
              <div className="w-16 h-16 mx-auto mb-4 bg-green-500 rounded-full flex items-center justify-center">
                <Upload className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-white font-semibold mb-2">Upload Image</h3>
              <p className="text-blue-200 text-xs">Select image from gallery</p>
            </button>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          onClick={resetFileInput}
          className="hidden"
        />
      </div>
    );
  }

  // Show camera capture
  if (currentMode === 'camera') {
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
            <div className="flex-none bg-black p-2">
              <button
                onClick={handleBackToMenu}
                className="flex items-center gap-2 text-white hover:text-blue-300 transition-colors text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Menu
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <CameraCapture onImageCapture={handleImageCapture} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show crop interface for uploaded image
  if (currentMode === 'crop' && uploadedImage) {
    return (
      <div className="h-dvh bg-black flex flex-col overflow-hidden">
        <div className="flex-none bg-black p-4">
          <button
            onClick={handleCropRetake}
            className="flex items-center gap-2 text-white hover:text-blue-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Menu
          </button>
        </div>
        <div className="flex-1 relative overflow-hidden">
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={CARD_ASPECT_RATIO}
            minWidth={100}
            minHeight={100}
            keepSelection
            className="max-h-full"
            style={{ touchAction: 'none' }}
          >
            <img
              src={uploadedImage}
              onLoad={onImageLoad}
              alt="Uploaded card"
              className="max-w-full max-h-full object-contain"
              style={{ touchAction: 'none' }}
            />
          </ReactCrop>
        </div>
        <div className="p-4 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex justify-center gap-4">
            <button
              onClick={handleCropRetake}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={handleCropComplete}
              disabled={!completedCrop}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Use Crop
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show review and scan interface
  if (capturedImage && !cardData) {
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
          </div>
        </div>
      </div>
    );
  }

  // Show card details
  if (cardData) {
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
              capturedImage={capturedImage}
              onNewScan={handleNewScan}
            />
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default Index;