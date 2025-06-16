import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, VideoOff } from 'lucide-react';

interface CameraCaptureProps {
  onImageCapture: (imageDataUrl: string) => void;
}

const FOCUS_AREA_WIDTH = 0.8; // 80% of video width
const FOCUS_AREA_HEIGHT = 0.6; // 60% of video height

const CameraCapture: React.FC<CameraCaptureProps> = ({ onImageCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string>('');
  const [isVideoReady, setIsVideoReady] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  // Check current permission state
  useEffect(() => {
    const checkPermission = async () => {
      try {
        console.log('Checking current permission state...');
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
        console.log('Current camera permission state:', result.state);
        
        if (result.state === 'granted') {
          console.log('Camera permission already granted');
          setHasPermission(true);
        } else if (result.state === 'denied') {
          console.log('Camera permission denied');
          setHasPermission(false);
          setError('Camera access was denied. Please allow camera access in your browser settings.');
        }
      } catch (err) {
        console.log('Error checking permission:', err);
      }
    };

    checkPermission();
  }, []);

  // Handle video element mounting
  const handleVideoRef = useCallback((video: HTMLVideoElement | null) => {
    console.log('handleVideoRef called with:', video ? 'video element' : 'null');
    if (video && !streamRef.current) {
      console.log('Video element mounted, starting camera...');
      startCamera(video);
    }
  }, []);

  // Start camera
  const startCamera = async (video: HTMLVideoElement) => {
    try {
      console.log('Starting camera initialization...');
      console.log('Current permission state:', hasPermission);
      
      if (hasPermission === false) {
        console.log('Camera permission denied, not proceeding with initialization');
        return;
      }

      console.log('Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1080 },
          height: { ideal: 1920 },
          facingMode: 'environment'
        },
        audio: false
      });

      console.log('Camera access granted, setting up video element');
      streamRef.current = stream;
      video.srcObject = stream;

      // Set up event listeners
      const handleCanPlay = () => {
        console.log('Video can play event fired');
        setIsVideoReady(true);
        setHasPermission(true);
      };

      const handleError = (e: Event) => {
        console.error('Video error event fired:', e);
        setError('Failed to start video playback');
        setHasPermission(false);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('error', handleError);

      console.log('Attempting to play video...');
      try {
        await video.play();
        console.log('Video playback started successfully');
      } catch (err) {
        console.error('Error playing video:', err);
        setError('Failed to start video playback');
        setHasPermission(false);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      }

      return () => {
        console.log('Cleaning up video event listeners');
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('error', handleError);
      };
    } catch (err) {
      console.error('Error in startCamera:', err);
      setHasPermission(false);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          console.log('Camera permission denied by user');
          setError('Camera access was denied. Please allow camera access in your browser settings.');
        } else if (err.name === 'NotFoundError') {
          console.log('No camera found');
          setError('No camera found. Please connect a camera and try again.');
        } else if (err.name === 'NotReadableError') {
          console.log('Camera in use by another application');
          setError('Camera is in use by another application. Please close other apps using the camera.');
        } else {
          console.log('Unknown camera error:', err.message);
          setError(`Camera error: ${err.message}`);
        }
      } else {
        console.log('Unknown error type:', err);
        setError('Failed to access camera. Please try again.');
      }
    }
  };

  const cropToGreenBox = (imageDataUrl: string, focusX: number, focusY: number, focusWidth: number, focusHeight: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = imageDataUrl;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(focusWidth);
        canvas.height = Math.round(focusHeight);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          console.error('Crop canvas context unavailable');
          reject(new Error('Crop canvas error'));
          return;
        }

        // Draw the focus area from the input image
        ctx.drawImage(
          img,
          focusX,
          focusY,
          focusWidth,
          focusHeight,
          0,
          0,
          focusWidth,
          focusHeight
        );

        // Debug: Red outline for crop canvas
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);

        // Return cropped image data URL
        const croppedImageDataUrl = canvas.toDataURL('image/jpeg', 0.95);
        resolve(croppedImageDataUrl);
      };
      img.onerror = () => {
        console.error('Failed to load image for cropping');
        reject(new Error('Image load error'));
      };
    });
  };

  const captureImage = () => {
    const video = document.querySelector('video');
    if (!video || !canvasRef.current || !isVideoReady) {
      console.error('Capture failed: video, canvas, or video not ready');
      alert('Camera not ready.');
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Capture failed: canvas context unavailable');
      alert('Canvas error.');
      return;
    }

    try {
      // Get displayed and intrinsic dimensions
      const displayWidth = video.offsetWidth || video.clientWidth;
      const displayHeight = video.offsetHeight || video.clientHeight;
      const intrinsicWidth = video.videoWidth;
      const intrinsicHeight = video.videoHeight;

      // Log for debugging
      console.log(`Display: ${displayWidth}x${displayHeight}`);
      console.log(`Intrinsic: ${intrinsicWidth}x${intrinsicHeight}`);

      // Calculate focus area in display coordinates
      const focusWidthDisplay = displayWidth * FOCUS_AREA_WIDTH;
      const focusHeightDisplay = displayHeight * FOCUS_AREA_HEIGHT;
      const focusXDisplay = (displayWidth - focusWidthDisplay) / 2;
      const focusYDisplay = (displayHeight - focusHeightDisplay) / 2;

      // Log focus area
      console.log(`Focus area (display): ${focusXDisplay},${focusYDisplay} ${focusWidthDisplay}x${focusHeightDisplay}`);

      // Calculate scaling due to object-cover
      const scale = displayHeight / intrinsicHeight; // Video scaled to match display height
      const scaledIntrinsicWidth = intrinsicWidth * scale;
      const offsetX = (scaledIntrinsicWidth - displayWidth) / 2; // Horizontal crop

      // Map focus area to intrinsic coordinates
      const focusX = focusXDisplay / scale + offsetX / scale;
      const focusY = focusYDisplay / scale;
      const focusWidth = focusWidthDisplay / scale;
      const focusHeight = focusHeightDisplay / scale;

      // Log intrinsic focus area
      console.log(`Focus area (intrinsic): ${focusX},${focusY} ${focusWidth}x${focusHeight}`);

      // Set canvas to intrinsic size
      canvas.width = intrinsicWidth;
      canvas.height = intrinsicHeight;

      // Capture full intrinsic video frame
      ctx.drawImage(video, 0, 0, intrinsicWidth, intrinsicHeight);

      // Draw green focus boundary
      ctx.strokeStyle = 'green';
      ctx.lineWidth = 4;
      ctx.strokeRect(focusX, focusY, focusWidth, focusHeight);

      // Get full image with boundary
      const fullImageDataUrl = canvas.toDataURL('image/jpeg', 0.95);

      // Crop to green box
      cropToGreenBox(fullImageDataUrl, focusX, focusY, focusWidth, focusHeight)
        .then(croppedImageDataUrl => {
          // Set canvas to cropped size for debug overlay
          canvas.width = Math.round(focusWidth);
          canvas.height = Math.round(focusHeight);
          const img = new Image();
          img.src = croppedImageDataUrl;
          img.onload = () => {
            ctx.drawImage(img, 0, 0);
            // Debug: Red outline for canvas
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 2;
            ctx.strokeRect(0, 0, canvas.width, canvas.height);
            // Pass cropped image to onImageCapture
            onImageCapture(croppedImageDataUrl);
          };
        })
        .catch(err => {
          console.error('Crop error:', err);
          alert('Crop failed.');
        });
    } catch (err) {
      console.error('Capture error:', err);
      alert('Capture failed.');
    }
  };

  if (hasPermission === null) {
    return (
      <div className="relative aspect-[9/16] bg-black rounded-lg overflow-hidden flex items-center justify-center">
        <div className="text-center p-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-white">Initializing camera...</p>
        </div>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="relative aspect-[9/16] bg-black rounded-lg overflow-hidden flex items-center justify-center">
        <div className="text-center p-4">
          <VideoOff className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-white mb-2">{error || 'Camera access is required'}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-[9/16] bg-black rounded-lg overflow-hidden">
      <video
        ref={handleVideoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
      <canvas
        ref={canvasRef}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: `${FOCUS_AREA_WIDTH * 100}%`,
          height: `${FOCUS_AREA_HEIGHT * 100}%`,
        }}
      />
      {!isVideoReady && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
        </div>
      )}
      {isVideoReady && (
        <div className="absolute inset-0 bg-black/50">
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
          </div>
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex justify-center">
          <button
            onClick={captureImage}
            disabled={!isVideoReady}
            className={`w-16 h-16 rounded-full bg-white border-4 border-white/30 transition-colors ${
              isVideoReady ? 'hover:bg-white/90' : 'opacity-50 cursor-not-allowed'
            }`}
            title={isVideoReady ? "Capture Card" : "Camera not ready"}
          >
            <Camera className="w-8 h-8 text-black mx-auto" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CameraCapture;