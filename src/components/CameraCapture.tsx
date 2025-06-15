import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, VideoOff } from 'lucide-react';

interface CameraCaptureProps {
  onImageCapture: (imageDataUrl: string) => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onImageCapture }) => {
  console.log('CameraCapture component rendering'); // Debug log

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
        // If 'prompt', we'll handle it when requesting camera access
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

  const captureImage = () => {
    const video = document.querySelector('video');
    if (!video || !canvasRef.current || !isVideoReady) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    try {
      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw the current video frame
      ctx.drawImage(video, 0, 0);
      
      // Convert to JPEG
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95);
      onImageCapture(imageDataUrl);
    } catch (err) {
      console.error('Error capturing image:', err);
      alert('Failed to capture image. Please try again.');
    }
  };

  // Show loading state while checking permission
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

  // Show error state if permission denied or other error
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
      {/* Video Preview */}
      <video
        ref={handleVideoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />

      {/* Loading overlay */}
      {!isVideoReady && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
        </div>
      )}

      {/* Capture Button */}
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

      {/* Hidden Canvas for Image Processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraCapture;
