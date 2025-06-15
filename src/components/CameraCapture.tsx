
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
      
      // Simplified constraints that work better on mobile
      const constraints = {
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Camera stream obtained');
      
      setStream(mediaStream);
      setHasPermission(true);
      setError('');
      
      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = mediaStream;
        
        // Simple approach - just wait for the video to start playing
        video.onloadedmetadata = () => {
          console.log('Video metadata loaded');
          video.play().then(() => {
            console.log('Video playing, setting ready state');
            setIsVideoReady(true);
          }).catch(err => {
            console.error('Error playing video:', err);
            // Set ready anyway for mobile compatibility
            setIsVideoReady(true);
          });
        };
        
        // Fallback timeout
        setTimeout(() => {
          console.log('Timeout reached, forcing ready state');
          setIsVideoReady(true);
        }, 2000);
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
    console.log('Capturing image...');
    
    if (!videoRef.current || !canvasRef.current) {
      console.error('Video or canvas ref not available');
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
      // Use actual video dimensions or fallback
      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;
      
      console.log(`Capturing: ${width}x${height}`);
      
      canvas.width = width;
      canvas.height = height;
      
      ctx.drawImage(video, 0, 0, width, height);
      
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      console.log('Image captured, length:', imageDataUrl.length);
      
      onImageCapture(imageDataUrl);
      
      // Mobile haptic feedback
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
          
          {/* Card positioning guide */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="border-2 border-white border-dashed rounded-lg w-72 h-44 flex items-center justify-center">
              <div className="text-white text-center">
                <div className="text-sm opacity-75 mb-1">Position card here</div>
                <div className="text-xs opacity-50">Keep card flat and well-lit</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Controls */}
        <div className="p-6 bg-gradient-to-t from-gray-50 to-white">
          <div className="flex justify-center">
            <button
              onClick={captureImage}
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white p-4 rounded-full shadow-lg transition-all duration-200 transform active:scale-95"
            >
              <Camera className="h-8 w-8" />
            </button>
          </div>
          <p className="text-center text-gray-500 text-sm mt-3">
            Tap to capture your Pokémon card
          </p>
        </div>
      </div>
      
      {/* Hidden canvas for image capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraCapture;
