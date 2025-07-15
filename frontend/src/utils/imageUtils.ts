
// Utility functions for image processing and optimization

export const resizeImage = (
  file: File, 
  maxWidth: number = 800, 
  maxHeight: number = 600, 
  quality: number = 0.8
): Promise<Blob> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress the image
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          resolve(blob!);
        },
        'image/jpeg',
        quality
      );
    };
    
    img.src = URL.createObjectURL(file);
  });
};

export function validateImageFile(file: File, maxSizeMB = 10): { isValid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Please upload a valid image file (JPEG, PNG, or WebP)'
    };
  }
  if (file.size > maxSizeMB * 1024 * 1024) {
    return {
      isValid: false,
      error: `Image file is too large. Please upload an image smaller than ${maxSizeMB}MB`
    };
  }
  return { isValid: true };
}

export function resetFileInput(input: HTMLInputElement | null) {
  if (input) input.value = '';
}

export const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = URL.createObjectURL(file);
  });
};

export function getCroppedImg(
  image: HTMLImageElement,
  crop: { x: number; y: number; width: number; height: number }
): Promise<string> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2d context');

  // Calculate scale factors
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  // Calculate actual crop dimensions in natural image coordinates
  const naturalCropX = crop.x * scaleX;
  const naturalCropY = crop.y * scaleY;
  const naturalCropWidth = crop.width * scaleX;
  const naturalCropHeight = crop.height * scaleY;

  canvas.width = naturalCropWidth;
  canvas.height = naturalCropHeight;

  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    image,
    naturalCropX,
    naturalCropY,
    naturalCropWidth,
    naturalCropHeight,
    0,
    0,
    naturalCropWidth,
    naturalCropHeight
  );

  return new Promise((resolve) => {
    resolve(canvas.toDataURL('image/jpeg', 0.95));
  });
}

/**
 * Loads an image from a data URL, crops it, and returns the cropped image as a data URL.
 * Calls onCropped with the result, or onError if something fails.
 */
export async function handleCropCompleteUtil(
  imageDataUrl: string | null,
  crop: { x: number; y: number; width: number; height: number } | undefined,
  onCropped: (croppedUrl: string) => void,
  onError?: (err: any) => void
) {
  if (!imageDataUrl || !crop) return;
  const image = new Image();
  image.src = imageDataUrl;
  await new Promise((resolve) => {
    image.onload = resolve;
  });
  try {
    const croppedImageUrl = await getCroppedImg(image, crop);
    onCropped(croppedImageUrl);
  } catch (err) {
    if (onError) onError(err);
    else alert('Crop failed.');
  }
}
