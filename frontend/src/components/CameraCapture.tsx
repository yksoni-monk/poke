import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, VideoOff } from 'lucide-react';

interface CameraCaptureProps {
  onImageCapture: (imageDataUrl: string) => void;
}

const FOCUS_AREA_WIDTH = 0.8; // 80% of video width
const FOCUS_AREA_HEIGHT = 0.6; // 60% of video height

const CameraCapture: React.FC<CameraCaptureProps> = ({ onImageCapture }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string>('');
  const [isVideoReady, setIsVideoReady] = useState(false);
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

      ctx.drawImage(videoRef.current, 0, 0, intrinsicWidth, intrinsicHeight);

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
  }, [isVideoReady, onImageCapture]);

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