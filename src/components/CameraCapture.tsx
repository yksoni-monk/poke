
import React, { useRef, useState, useEffect } from 'react';
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

  useEffect(() => {
    initializeCamera();
    return () => {
      console.log('Cleaning up camera...');
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const initializeCamera = async () => {
    try {
      console.log('Initializing camera...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1080 },
          height: { ideal: 1920 },
          facingMode: 'environment'
        },
        audio: false
      });

      console.log('Camera stream obtained');
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata loaded');
          if (videoRef.current) {
            videoRef.current.play().then(() => {
              console.log('Video playing');
              setIsVideoReady(true);
              setHasPermission(true);
            }).catch(err => {
              console.error('Error playing video:', err);
              setError('Failed to start video playback');
              setHasPermission(false);
            });
          }
        };
      }
    } catch (err) {
      console.error('Error initializing camera:', err);
      setHasPermission(false);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Camera access was denied. Please allow camera access in your browser settings.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found. Please connect a camera and try again.');
        } else {
          setError(`Camera error: ${err.message}`);
        }
      } else {
        setError('Failed to access camera. Please try again.');
      }
    }
  };

  const captureImage = () => {
    console.log('Capture button clicked');
    
    if (!videoRef.current || !canvasRef.current || !isVideoReady) {
      console.error('Capture failed: video not ready');
      alert('Camera not ready.');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      console.error('Canvas context not available');
      alert('Canvas error.');
      return;
    }

    try {
      console.log('Starting capture process...');
      
      // Get video dimensions
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;
      
      console.log(`Video dimensions: ${videoWidth}x${videoHeight}`);
      
      if (videoWidth === 0 || videoHeight === 0) {
        console.error('Invalid video dimensions');
        alert('Video not ready for capture.');
        return;
      }

      // Calculate focus area in video coordinates
      const focusWidth = videoWidth * FOCUS_AREA_WIDTH;
      const focusHeight = videoHeight * FOCUS_AREA_HEIGHT;
      const focusX = (videoWidth - focusWidth) / 2;
      const focusY = (videoHeight - focusHeight) / 2;

      console.log(`Focus area: ${focusX}, ${focusY}, ${focusWidth}x${focusHeight}`);

      // Set canvas size to focus area size
      canvas.width = focusWidth;
      canvas.height = focusHeight;

      // Draw the cropped portion directly to canvas
      ctx.drawImage(
        video,
        focusX, focusY, focusWidth, focusHeight,  // source rectangle
        0, 0, focusWidth, focusHeight             // destination rectangle
      );

      // Convert to data URL
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      console.log('Image captured successfully, data URL length:', imageDataUrl.length);
      
      // Call the callback with the captured image
      onImageCapture(imageDataUrl);
      
    } catch (err) {
      console.error('Capture error:', err);
      alert('Failed to capture image. Please try again.');
    }
  };

  if (hasPermission === null) {
    return (
      <div className="h-full w-full bg-black rounded-lg overflow-hidden flex items-center justify-center">
        <div className="text-center p-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-white">Initializing camera...</p>
        </div>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="h-full w-full bg-black rounded-lg overflow-hidden flex items-center justify-center">
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
    <div className="h-full w-full bg-black rounded-lg overflow-hidden relative">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-full h-full max-w-[min(100%,calc(100vh*9/16))] max-h-[min(100%,calc(100vw*16/9))]">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />
          
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
        </div>
      </div>
      
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
