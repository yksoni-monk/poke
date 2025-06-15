import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, AlertCircle, WifiOff, VideoOff, Zap, Grid, ZoomIn, ZoomOut, Settings } from 'lucide-react';

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
  const [isStable, setIsStable] = useState(false);
  const [isLowLight, setIsLowLight] = useState(false);
  const [isNetworkError, setIsNetworkError] = useState(false);
  const stabilityCheckInterval = useRef<number>();
  const lastFrameTime = useRef<number>(0);
  const motionHistory = useRef<number[]>([]);
  const frameCount = useRef(0);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (stabilityCheckInterval.current) {
      window.clearInterval(stabilityCheckInterval.current);
    }
  }, [stream]);

  useEffect(() => {
    startCamera();
    return cleanup;
  }, [cleanup]);

  // Check image stability
  const checkImageStability = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const now = Date.now();
    const timeDiff = now - lastFrameTime.current;
    lastFrameTime.current = now;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    // Calculate average brightness
    let brightness = 0;
    for (let i = 0; i < currentFrame.length; i += 4) {
      brightness += (currentFrame[i] + currentFrame[i + 1] + currentFrame[i + 2]) / 3;
    }
    brightness /= currentFrame.length / 4;

    // Check for low light
    setIsLowLight(brightness < 50);

    // Calculate motion
    if (frameCount.current > 0) {
      let motion = 0;
      const prevFrame = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      for (let i = 0; i < currentFrame.length; i += 4) {
        motion += Math.abs(currentFrame[i] - prevFrame[i]);
      }
      motion /= currentFrame.length / 4;

      // Update motion history
      motionHistory.current.push(motion);
      if (motionHistory.current.length > 10) {
        motionHistory.current.shift();
      }

      // Calculate average motion
      const avgMotion = motionHistory.current.reduce((a, b) => a + b, 0) / motionHistory.current.length;
      setIsStable(avgMotion < 5 && timeDiff > 100); // Require low motion and sufficient time between frames
    }

    frameCount.current++;
  }, []);

  const toggleFlash = async () => {
    if (!streamRef.current) return;

    try {
      const track = streamRef.current.getVideoTracks()[0];
      const capabilities = track.getCapabilities();
      
      if (capabilities.torch) {
        await track.applyConstraints({
          advanced: [{ torch: !isFlashOn }]
        });
        setIsFlashOn(!isFlashOn);
      } else {
        console.log('Flash not supported on this device');
      }
    } catch (error) {
      console.error('Error toggling flash:', error);
    }
  };

  const adjustZoom = (direction: 'in' | 'out') => {
    if (!streamRef.current) return;

    try {
      const track = streamRef.current.getVideoTracks()[0];
      const capabilities = track.getCapabilities();
      
      if (capabilities.zoom) {
        const newZoom = direction === 'in' 
          ? Math.min(zoomLevel + 0.25, capabilities.zoom.max)
          : Math.max(zoomLevel - 0.25, capabilities.zoom.min);
        
        track.applyConstraints({
          advanced: [{ zoom: newZoom }]
        });
        setZoomLevel(newZoom);
      }
    } catch (error) {
      console.error('Error adjusting zoom:', error);
    }
  };

  const startCamera = async () => {
    try {
      console.log('Starting camera...');
      setIsNetworkError(false);
      
      // Try to get the best available camera
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      // Prefer back camera if available
      const backCamera = videoDevices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear')
      );
      
      const constraints = {
        video: {
          deviceId: backCamera?.deviceId ? { exact: backCamera.deviceId } : undefined,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: backCamera ? undefined : 'environment',
          advanced: [
            { zoom: zoomLevel },
            { torch: isFlashOn }
          ]
        },
        audio: false
      };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Camera stream obtained');
      
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setHasPermission(true);
      setError('');
      
      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = mediaStream;
        
        // Wait for video to be ready and playing
        const handleCanPlay = () => {
          console.log('Video can play, setting ready state');
          setIsVideoReady(true);
          
          // Start stability checking
          stabilityCheckInterval.current = window.setInterval(checkImageStability, 100);
        };
        
        video.addEventListener('canplay', handleCanPlay, { once: true });
        
        // Auto-play the video
        video.play().catch(err => {
          console.error('Error playing video:', err);
          setIsVideoReady(true);
        });
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setHasPermission(false);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Camera access was denied. Please allow camera access in your browser settings.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found. Please connect a camera and try again.');
        } else if (err.name === 'NotReadableError') {
          setError('Camera is in use by another application. Please close other apps using the camera.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Camera access denied or not available');
      }
    }
  };

  const captureImage = () => {
    if (!isStable) {
      alert('Please hold the camera steady to capture the card');
      return;
    }

    if (isLowLight) {
      alert('Please improve the lighting conditions for better results');
      return;
    }

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
      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;
      
      console.log(`Capturing: ${width}x${height}`);
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw the video frame
      ctx.drawImage(video, 0, 0, width, height);
      
      // Add a subtle vignette effect to help focus on the card
      const gradient = ctx.createRadialGradient(
        width/2, height/2, 0,
        width/2, height/2, Math.max(width, height)/2
      );
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.2)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      console.log('Image captured, length:', imageDataUrl.length);
      
      onImageCapture(imageDataUrl);
      
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    } catch (error) {
      console.error('Error capturing image:', error);
      alert('Failed to capture image. Please try again.');
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
        <div className="relative aspect-[4/3] bg-black rounded-t-2xl overflow-hidden">
          {/* Camera Controls Overlay */}
          <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
            >
              <Settings className="h-5 w-5" />
            </button>
            
            {showSettings && (
              <div className="absolute top-12 right-0 bg-black/80 rounded-lg p-2 flex flex-col gap-2">
                <button
                  onClick={toggleFlash}
                  className={`flex items-center gap-2 text-white px-3 py-2 rounded-lg transition-colors ${
                    isFlashOn ? 'bg-yellow-500/20' : 'hover:bg-white/10'
                  }`}
                >
                  <Zap className="h-4 w-4" />
                  <span className="text-sm">Flash</span>
                </button>
                
                <button
                  onClick={() => setShowGrid(!showGrid)}
                  className={`flex items-center gap-2 text-white px-3 py-2 rounded-lg transition-colors ${
                    showGrid ? 'bg-blue-500/20' : 'hover:bg-white/10'
                  }`}
                >
                  <Grid className="h-4 w-4" />
                  <span className="text-sm">Grid</span>
                </button>
                
                <div className="flex items-center gap-2 text-white px-3 py-2">
                  <button
                    onClick={() => adjustZoom('out')}
                    className="p-1 hover:bg-white/10 rounded"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <span className="text-sm w-12 text-center">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    onClick={() => adjustZoom('in')}
                    className="p-1 hover:bg-white/10 rounded"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          
          {/* Grid Overlay */}
          {showGrid && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="grid grid-cols-3 grid-rows-3 h-full">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="border border-white/20"></div>
                ))}
              </div>
            </div>
          )}
          
          {!isVideoReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent mx-auto mb-2"></div>
                <div className="text-sm">Loading camera...</div>
              </div>
            </div>
          )}
          
          {/* Card detection frame with corner markers */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-72 h-44">
              {/* Corner markers */}
              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white"></div>
              <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white"></div>
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white"></div>
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white"></div>
              
              {/* Status indicators */}
              <div className="absolute -top-8 left-0 right-0 flex justify-center gap-2">
                {!isStable && (
                  <div className="flex items-center text-white text-sm bg-black/50 px-2 py-1 rounded">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    Hold steady
                  </div>
                )}
                {isLowLight && !isFlashOn && (
                  <div className="flex items-center text-white text-sm bg-black/50 px-2 py-1 rounded">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    More light needed
                  </div>
                )}
              </div>
              
              {/* Card position guide */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white text-center">
                  <div className="text-sm opacity-75 mb-1">Position card here</div>
                  <div className="text-xs opacity-50">Keep card flat and well-lit</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-6 bg-gradient-to-t from-gray-50 to-white">
          <div className="flex justify-center">
            <button
              onClick={captureImage}
              disabled={!isStable || isLowLight}
              className={`bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white p-4 rounded-full shadow-lg transition-all duration-200 transform active:scale-95 ${
                (!isStable || isLowLight) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Camera className="h-8 w-8" />
            </button>
          </div>
          <p className="text-center text-gray-500 text-sm mt-3">
            {!isStable ? 'Hold camera steady...' : 
             isLowLight ? 'Need more light...' : 
             'Tap to capture your Pokémon card'}
          </p>
        </div>
      </div>
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraCapture;
