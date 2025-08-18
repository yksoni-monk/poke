import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, VideoOff, Crop, RotateCcw } from 'lucide-react';
import ReactCrop, { Crop as CropType, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { resizeImage, getCroppedImg, handleCropCompleteUtil } from '../utils/imageUtils';

interface CameraCaptureProps {
  onImageCapture: (imageDataUrl: string) => void;
}

// Pokemon card aspect ratio is 5:7 (width:height)
const CARD_ASPECT_RATIO = 5 / 7;
const FOCUS_AREA_HEIGHT = 0.7; // 70% of video height - leaves space for capture button
const FOCUS_AREA_WIDTH = 0.7 * (5/7); // 50% of video width - maintains 5:7 aspect ratio

const CameraCapture: React.FC<CameraCaptureProps> = ({ onImageCapture }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string>('');
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<CropType>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isCropping, setIsCropping] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    console.log('startCamera: Attempting to start camera');
    if (!videoRef.current) {
      console.error('startCamera: Video element not available');
      setError('Camera initialization failed. Please try again.');
      return;
    }

    try {
      console.log('startCamera: Enumerating devices...');
      const devices = await navigator.mediaDevices.enumerateDevices();
      console.log('startCamera: Available video devices:', devices.filter(d => d.kind === 'videoinput'));

      console.log('startCamera: Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Prefer rear camera for mobile
        audio: false
      });

      console.log('startCamera: Camera access granted, assigning stream');
      streamRef.current = stream;
      videoRef.current.srcObject = stream;

      videoRef.current.addEventListener('canplay', onCanPlay);
      videoRef.current.addEventListener('error', onVideoError);

      console.log('startCamera: Attempting to play video...');
      await videoRef.current.play();
      console.log('startCamera: Video playback started successfully');
    } catch (err) {
      console.error('startCamera: Error:', err);
      setIsVideoReady(false);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Camera access denied. Please allow camera access in browser settings.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found. Please ensure your device has a camera.');
        } else if (err.name === 'NotReadableError') {
          setError('Camera is in use by another app. Please close other apps using the camera.');
        } else {
          setError(`Camera error: ${err.message}`);
        }
      } else {
        setError('Failed to access camera. Please try again.');
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  }, []);

  const handleStartCamera = useCallback(async () => {
    console.log('handleStartCamera: Button clicked');
    setError('');
    if (!videoRef.current) {
      console.error('handleStartCamera: Video ref not available');
      setError('Camera initialization failed. Please try again.');
      return;
    }
    await startCamera();
  }, [startCamera]);

  useEffect(() => {
    console.log('useEffect: Video ref status:', videoRef.current ? 'Mounted' : 'Not mounted');
    // Auto-start camera only if video element is mounted
    if (videoRef.current) {
      startCamera();
    }

    return () => {
      console.log('useEffect: Cleaning up stream on unmount');
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [startCamera]);

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

  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isVideoReady) {
      console.error('captureImage: Video, canvas, or video not ready');
      alert('Camera not ready.');
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('captureImage: Canvas context unavailable');
      alert('Canvas error.');
      return;
    }

    try {
      const displayWidth = videoRef.current.offsetWidth || videoRef.current.clientWidth;
      const displayHeight = videoRef.current.offsetHeight || videoRef.current.clientHeight;
      const intrinsicWidth = videoRef.current.videoWidth;
      const intrinsicHeight = videoRef.current.videoHeight;

      console.log(`captureImage: Display: ${displayWidth}x${displayHeight}`);
      console.log(`captureImage: Intrinsic: ${intrinsicWidth}x${intrinsicHeight}`);

      // Calculate the focus area in display coordinates
      const focusWidthDisplay = displayWidth * FOCUS_AREA_WIDTH;
      const focusHeightDisplay = displayHeight * FOCUS_AREA_HEIGHT;
      const focusXDisplay = (displayWidth - focusWidthDisplay) / 2;
      const focusYDisplay = (displayHeight - focusHeightDisplay) / 2;

      console.log('📸 CAPTURE DEBUG:');
      console.log('  - FOCUS_AREA_WIDTH constant:', FOCUS_AREA_WIDTH, '(should be 0.65)');
      console.log('  - FOCUS_AREA_HEIGHT constant:', FOCUS_AREA_HEIGHT, '(should be 0.3)');
      console.log('  - Display dimensions:', `${displayWidth}x${displayHeight}`);
      console.log('  - Focus area display dimensions:', `${focusWidthDisplay}x${focusHeightDisplay}`);
      console.log('  - Focus area display position:', `${focusXDisplay},${focusYDisplay}`);
      console.log('  - Focus area as percentage of display:', `${(focusWidthDisplay/displayWidth*100).toFixed(1)}% x ${(focusHeightDisplay/displayHeight*100).toFixed(1)}%`);
      console.log('  - Expected focus height with 0.3:', displayHeight * 0.3);
      console.log('  - Actual focus height:', focusHeightDisplay);

      // Convert display coordinates to intrinsic coordinates
      const scale = displayHeight / intrinsicHeight;
      const scaledIntrinsicWidth = intrinsicWidth * scale;
      const offsetX = (scaledIntrinsicWidth - displayWidth) / 2;

      const focusX = focusXDisplay / scale + offsetX / scale;
      // Ensure focus area stays within display bounds
      const maxFocusY = intrinsicHeight - focusHeightDisplay / scale;
      const focusY = Math.min(focusYDisplay / scale, maxFocusY);
      const focusWidth = focusWidthDisplay / scale;
      const focusHeight = focusHeightDisplay / scale;

      console.log(`captureImage: Focus area (intrinsic): ${focusX},${focusY} ${focusWidth}x${focusHeight}`);

      // Create a canvas with the focus area dimensions
      const focusCanvas = document.createElement('canvas');
      const focusCtx = focusCanvas.getContext('2d');
      if (!focusCtx) {
        throw new Error('Focus canvas context unavailable');
      }

      focusCanvas.width = Math.round(focusWidth);
      focusCanvas.height = Math.round(focusHeight);

      // Draw only the focus area from the video
      focusCtx.drawImage(
        videoRef.current,
        Math.round(focusX),
        Math.round(focusY),
        Math.round(focusWidth),
        Math.round(focusHeight),
        0,
        0,
        Math.round(focusWidth),
        Math.round(focusHeight)
      );

      const croppedImageDataUrl = focusCanvas.toDataURL('image/jpeg', 0.95);
      setCapturedImage(croppedImageDataUrl);
      setIsCropping(true);
    } catch (err) {
      console.error('captureImage: Error:', err);
      alert('Capture failed.');
    }
  }, [isVideoReady]);

  const handleCropComplete = useCallback(() => {
    handleCropCompleteUtil(
      capturedImage,
      completedCrop,
      (croppedImageUrl) => {
        onImageCapture(croppedImageUrl);
        setCapturedImage(null);
        setIsCropping(false);
        setCrop(undefined);
        setCompletedCrop(undefined);
      },
      (err) => {
        console.error('Crop error:', err);
        alert('Crop failed.');
      }
    );
  }, [capturedImage, completedCrop, onImageCapture]);

  const handleRetake = useCallback(() => {
    setCapturedImage(null);
    setIsCropping(false);
    setCrop(undefined);
    setCompletedCrop(undefined);
  }, []);

  const onCanPlay = useCallback(() => {
    console.log('startCamera: Video canplay event fired');
    setIsVideoReady(true);
    setError('');
    if (videoRef.current) {
      videoRef.current.removeEventListener('canplay', onCanPlay);
    }
  }, []);

  const onVideoError = useCallback((e: Event) => {
    console.error('startCamera: Video error event:', e);
    setError('Failed to start video stream. Please try again.');
    setIsVideoReady(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.removeEventListener('error', onVideoError);
    }
  }, []);

  if (error) {
    return (
      <div className="h-full w-full bg-black rounded-lg overflow-hidden flex items-center justify-center">
        <div className="text-center p-4">
          <VideoOff className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-white mb-2">{error}</p>
          <button
            onClick={handleStartCamera}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (isCropping && capturedImage) {
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
              src={capturedImage}
              onLoad={onImageLoad}
              alt="Captured card"
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
              Retake
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
    <div className="h-full w-full bg-black rounded-lg overflow-hidden relative">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-full h-full">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />
          {!isVideoReady && (
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-10">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mb-4"></div>
              <button
                onClick={handleStartCamera}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Start Camera
              </button>
            </div>
          )}
          {isVideoReady && (
            <div className="absolute inset-0 bg-black/50">
              {(() => {
                const focusWidth = FOCUS_AREA_WIDTH * 100;
                const focusHeight = FOCUS_AREA_HEIGHT * 100;
                console.log('🔍 FOCUS AREA DEBUG:');
                console.log('  - FOCUS_AREA_WIDTH constant:', FOCUS_AREA_WIDTH);
                console.log('  - FOCUS_AREA_HEIGHT constant:', FOCUS_AREA_HEIGHT);
                console.log('  - Calculated width:', focusWidth + '%');
                console.log('  - Calculated height:', focusHeight + '%');
                console.log('  - Video element dimensions:', videoRef.current ? `${videoRef.current.offsetWidth}x${videoRef.current.offsetHeight}` : 'N/A');
                console.log('  - Video intrinsic dimensions:', videoRef.current ? `${videoRef.current.videoWidth}x${videoRef.current.videoHeight}` : 'N/A');
                console.log('  - Container dimensions:', videoRef.current?.parentElement ? `${videoRef.current.parentElement.offsetWidth}x${videoRef.current.parentElement.offsetHeight}` : 'N/A');
                return null;
              })()}
              <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{
                  width: `${FOCUS_AREA_WIDTH * 100}%`,
                  height: `${FOCUS_AREA_HEIGHT * 100}%`,
                }}
              >
                <div className="w-full h-full border-2 border-green-500 rounded-lg">
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-green-500"></div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-green-500"></div>
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-green-500"></div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-green-500"></div>
                </div>
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-green-500 text-sm font-medium">
                  Position card here
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {isVideoReady && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent z-20">
          <div className="flex justify-center">
            <button
              onClick={captureImage}
              disabled={!isVideoReady}
              className="w-16 h-16 rounded-full bg-white border-4 border-white/30 hover:bg-white/90 transition-colors"
              title="Capture Card"
            >
              <Camera className="w-8 h-8 text-black mx-auto" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraCapture;