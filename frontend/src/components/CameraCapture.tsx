import React, { useState, useCallback } from 'react';
import { Crop, RotateCcw, Upload } from 'lucide-react';
import ReactCrop, { Crop as CropType, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { resizeImage, getCroppedImg, handleCropCompleteUtil } from '../utils/imageUtils';

interface CameraCaptureProps {
  onImageCapture: (imageDataUrl: string) => void;
}

// Pokemon card aspect ratio is 5:7 (width:height)
const CARD_ASPECT_RATIO = 5 / 7;

const CameraCapture: React.FC<CameraCaptureProps> = ({ onImageCapture }) => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<CropType>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isCropping, setIsCropping] = useState(false);

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

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageDataUrl = e.target?.result as string;
        setUploadedImage(imageDataUrl);
        setIsCropping(true);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleCropComplete = useCallback(() => {
    handleCropCompleteUtil(
      uploadedImage,
      completedCrop,
      (croppedImageUrl) => {
        onImageCapture(croppedImageUrl);
        setUploadedImage(null);
        setIsCropping(false);
        setCrop(undefined);
        setCompletedCrop(undefined);
      },
      (err) => {
        console.error('Crop error:', err);
        alert('Crop failed.');
      }
    );
  }, [uploadedImage, completedCrop, onImageCapture]);

  const handleRetake = useCallback(() => {
    setUploadedImage(null);
    setIsCropping(false);
    setCrop(undefined);
    setCompletedCrop(undefined);
  }, []);

  if (isCropping && uploadedImage) {
    return (
      <div className="h-full w-full bg-black rounded-lg overflow-hidden flex flex-col">
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
          >
            <img
              src={uploadedImage}
              onLoad={onImageLoad}
              alt="Uploaded card"
              className="max-w-full max-h-full object-contain"
            />
          </ReactCrop>
        </div>
        <div className="p-4 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex justify-center gap-4">
            <button
              onClick={handleRetake}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Upload New Image
            </button>
            <button
              onClick={handleCropComplete}
              disabled={!completedCrop}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Crop className="w-4 h-4" />
              Use Crop
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-black rounded-lg overflow-hidden flex items-center justify-center">
      <div className="text-center p-4">
        <Upload className="w-16 h-16 text-white mx-auto mb-4" />
        <p className="text-white mb-4 text-lg">Upload Pokemon Card Image</p>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
          id="image-upload"
        />
        <label
          htmlFor="image-upload"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer inline-block"
        >
          Choose Image
        </label>
      </div>
    </div>
  );
};

export default CameraCapture;