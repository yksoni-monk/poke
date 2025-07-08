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

  const startCamera = async (video: HTMLVideoElement) => {
    console.log('startCamera: Starting with video element:', video);
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
      video.srcObject = stream;

      const handleCanPlay = () => {
        console.log('startCamera: Video canplay event fired');
        setIsVideoReady(true);
        setHasPermission(true);
        video.removeEventListener('canplay', handleCanPlay);
      };

      const handleError = (e: Event) => {
        console.error('startCamera: Video error event:', e);
        setError('Failed to start video stream. Please try again.');
        setHasPermission(false);
        setIsVideoReady(false);
        video.removeEventListener('error', handleError);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('error', handleError);

      console.log('startCamera: Attempting to play video...');
      await video.play();
      console.log('startCamera: Video playback started successfully');
    } catch (err) {
      console.error('startCamera: Error:', err);
      setHasPermission(false);
      setIsVideoReady(false);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Camera access denied. Please allow camera access in Safari settings.');
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
  };

  useEffect(() => {
    console.log('useEffect: Checking video ref:', videoRef.current);
    const initializeCamera = async () => {
      if (!videoRef.current) {
        console.log('useEffect: Video element not mounted yet, waiting...');
        setError('Waiting for video element to load...');
        return;
      }

      try {
        console.log('useEffect: Checking camera permission...');
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
        console.log('useEffect: Camera permission state:', result.state);

        if (result.state === 'granted') {
          console.log('useEffect: Permission granted, starting camera...');
          setHasPermission(true);
          await startCamera(videoRef.current);
        } else if (result.state === 'denied') {
          console.log('useEffect: Permission denied');
          setHasPermission(false);
          setError('Camera access denied. Please enable camera permissions in Safari settings.');
        } else if (result.state === 'prompt') {
          console.log('useEffect: Permission prompt required');
          setHasPermission(null); // Show "Allow Camera" button
        }
      } catch (err) {
        console.error('useEffect: Error checking permission:', err);
        setError('Failed to check camera permission. Please click "Allow Camera" to try again.');
        setHasPermission(null);
      }
    };

    initializeCamera();

    return () => {
      console.log('useEffect: Cleaning up stream on unmount');
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const handleManualPermissionRequest = async () => {
    console.log('handleManualPermissionRequest: Button clicked');
    setError('');
    setHasPermission(null);

    // Retry up to 3 times to ensure video element is mounted
    let attempts = 0;
    const maxAttempts = 3;
    while (!videoRef.current && attempts < maxAttempts) {
      console.log(`handleManualPermissionRequest: Video ref not available, attempt ${attempts + 1}`);
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
      attempts++;
    }

    if (videoRef.current) {
      console.log('handleManualPermissionRequest: Video ref available, starting camera');
      await startCamera(videoRef.current);
    } else {
      console.error('handleManualPermissionRequest: Video ref still not available after retries');
      setError('Failed to initialize camera. Please ensure the page loaded correctly and try again.');
      setHasPermission(false);
    }
  };

  const cropToGreenBox = (
    imageDataUrl: string,
    focusX: number,
    focusY: number,
    focusWidth: number,
    focusHeight: number
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = imageDataUrl;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(focusWidth);
        canvas.height = Math.round(focusHeight);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          console.error('cropToGreenBox: Canvas context unavailable');
          reject(new Error('Crop canvas error'));
          return;
        }

        ctx.drawImage(
          img,
          Math.round(focusX),
          Math.round(focusY),
          Math.round(focusWidth),
          Math.round(focusHeight),
          0,
          0,
          Math.round(focusWidth),
          Math.round(focusHeight)
        );

        const croppedImageDataUrl = canvas.toDataURL('image/jpeg', 0.95);
        resolve(croppedImageDataUrl);
      };
      img.onerror = () => {
        console.error('cropToGreenBox: Failed to load image for cropping');
        reject(new Error('Image load error'));
      };
    });
  };

  const captureImage = () => {
    const video = videoRef.current;
    if (!video || !canvasRef.current || !isVideoReady) {
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
      const displayWidth = video.offsetWidth || video.clientWidth;
      const displayHeight = video.offsetHeight || video.clientHeight;
      const intrinsicWidth = video.videoWidth;
      const intrinsicHeight = video.videoHeight;

      console.log(`captureImage: Display: ${displayWidth}x${displayHeight}`);
      console.log(`captureImage: Intrinsic: ${intrinsicWidth}x${intrinsicHeight}`);

      const focusWidthDisplay = displayWidth * FOCUS_AREA_WIDTH;
      const focusHeightDisplay = displayHeight * FOCUS_AREA_HEIGHT;
      const focusXDisplay = (displayWidth - focusWidthDisplay) / 2;
      const focusYDisplay = (displayHeight - focusHeightDisplay) / 2;

      console.log(
        `captureImage: Focus area (display): ${focusXDisplay},${focusYDisplay} ${focusWidthDisplay}x${focusHeightDisplay}`
      );

      const scale = displayHeight / intrinsicHeight;
      const scaledIntrinsicWidth = intrinsicWidth * scale;
      const offsetX = (scaledIntrinsicWidth - displayWidth) / 2;

      const focusX = focusXDisplay / scale + offsetX / scale;
      const focusY = focusYDisplay / scale;
      const focusWidth = focusWidthDisplay / scale;
      const focusHeight = focusHeightDisplay / scale;

      console.log(
        `captureImage: Focus area (intrinsic): ${focusX},${focusY} ${focusWidth}x${focusHeight}`
      );

      canvas.width = intrinsicWidth;
      canvas.height = intrinsicHeight;

      ctx.drawImage(video, 0, 0, intrinsicWidth, intrinsicHeight);

      ctx.strokeStyle = 'green';
      ctx.lineWidth = 4;
      ctx.strokeRect(focusX, focusY, focusWidth, focusHeight);

      const fullImageDataUrl = canvas.toDataURL('image/jpeg', 0.95);

      cropToGreenBox(fullImageDataUrl, focusX, focusY, focusWidth, focusHeight)
        .then(croppedImageDataUrl => {
          canvas.width = Math.round(focusWidth);
          canvas.height = Math.round(focusHeight);
          const img = new Image();
          img.src = croppedImageDataUrl;
          img.onload = () => {
            ctx.drawImage(img, 0, 0);
            onImageCapture(croppedImageDataUrl);
          };
        })
        .catch(err => {
          console.error('captureImage: Crop error:', err);
          alert('Crop failed.');
        });
    } catch (err) {
      console.error('captureImage: Error:', err);
      alert('Capture failed.');
    }
  };

  if (hasPermission === null) {
    return (
      <div className="h-full w-full bg-black rounded-lg overflow-hidden flex items-center justify-center">
        <div className="text-center p-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-white mb-4">Please allow camera access</p>
          <button
            onClick={handleManualPermissionRequest}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Allow Camera
          </button>
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
            onClick={handleManualPermissionRequest}
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
              <button
                onClick={handleManualPermissionRequest}
                className="absolute bottom-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Start Camera
              </button>
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
            title={isVideoReady ? 'Capture Card' : 'Camera not ready'}
          >
            <Camera className="w-8 h-8 text-black mx-auto" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CameraCapture;