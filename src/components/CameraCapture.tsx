
import React, { useRef, useState, useEffect } from 'react';
import { Camera } from 'lucide-react';

interface CameraCaptureProps {
  onImageCapture: (imageDataUrl: string) => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onImageCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string>('');
  const [isVideoReady, setIsVideoReady] = useState(false);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      console.log('Starting camera...');
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 }
        },
        audio: false
      });
      
      console.log('Camera stream obtained');
      setStream(mediaStream);
      setHasPermission(true);
      setError('');
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        // Add multiple event listeners to catch when video is ready
        const video = videoRef.current;
        
        const handleVideoReady = () => {
          console.log('Video is ready, dimensions:', video.videoWidth, 'x', video.videoHeight);
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            setIsVideoReady(true);
          }
        };
        
        video.onloadedmetadata = handleVideoReady;
        video.oncanplay = handleVideoReady;
        video.onplaying = handleVideoReady;
        
        // Force play the video
        video.play().catch(err => {
          console.error('Error playing video:', err);
        });
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setHasPermission(false);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Camera access denied or not available');
      }
    }
  };

  const captureImage = () => {
    console.log('Attempting to capture image...');
    
    if (!videoRef.current || !canvasRef.current || !isVideoReady) {
      console.error('Video not ready or refs not available');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      console.error('Canvas context not available');
      return;
    }

    try {
      // Set canvas size to match video dimensions
      canvas.width = video.videoWidth || video.clientWidth;
      canvas.height = video.videoHeight || video.clientHeight;
      
      console.log(`Capturing image: ${canvas.width}x${canvas.height}`);
      
      // Draw the video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to data URL
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      console.log('Image captured successfully, data URL length:', imageDataUrl.length);
      
      onImageCapture(imageDataUrl);
      
      // Add haptic feedback on mobile
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    } catch (error) {
      console.error('Error capturing image:', error);
    }
  };

  if (hasPermission === null) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
        <p className="text-gray-600">Requesting camera access...</p>
      </div>
    );
  }

  if (hasPermission === false) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
        <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Camera Access Needed</h3>
        <p className="text-gray-600 mb-4">
          Please allow camera access to scan your Pokémon cards.
        </p>
        <p className="text-sm text-red-600 mb-4">{error}</p>
        <button
          onClick={startCamera}
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-lg font-medium transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
      <div className="relative">
        {/* Camera Viewfinder */}
        <div className="relative aspect-[4/3] bg-black rounded-t-2xl overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          
          {!isVideoReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent mx-auto mb-2"></div>
                <div className="text-sm">Loading camera...</div>
              </div>
            </div>
          )}
          
          {/* Overlay guides */}
          {isVideoReady && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="border-2 border-white border-dashed rounded-lg w-72 h-44 flex items-center justify-center">
                <div className="text-white text-center">
                  <div className="text-sm opacity-75 mb-1">Position card here</div>
                  <div className="text-xs opacity-50">Keep card flat and well-lit</div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Controls */}
        <div className="p-6 bg-gradient-to-t from-gray-50 to-white">
          <div className="flex justify-center">
            <button
              onClick={captureImage}
              disabled={!isVideoReady}
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-400 text-white p-4 rounded-full shadow-lg transition-all duration-200 transform active:scale-95"
            >
              <Camera className="h-8 w-8" />
            </button>
          </div>
          <p className="text-center text-gray-500 text-sm mt-3">
            {isVideoReady ? 'Tap to capture your Pokémon card' : 'Waiting for camera...'}
          </p>
        </div>
      </div>
      
      {/* Hidden canvas for image capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraCapture;
