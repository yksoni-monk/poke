
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

export async function getCroppedImg(
  image: HTMLImageElement,
  crop: { x: number; y: number; width: number; height: number }
): Promise<string> {
  console.log('[getCroppedImg] crop:', crop);
  console.log('[getCroppedImg] image.naturalWidth:', image.naturalWidth, 'image.naturalHeight:', image.naturalHeight);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2d context');

  canvas.width = crop.width;
  canvas.height = crop.height;

  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height
  );
  console.log('[getCroppedImg] canvas.width:', canvas.width, 'canvas.height:', canvas.height);

  return new Promise((resolve) => {
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    console.log('[getCroppedImg] dataUrl.length:', dataUrl.length);
    resolve(dataUrl);
  });
}

/**
 * Converts a percent crop object to pixel crop based on image natural size.
 */
export function percentCropToPixels(
  percentCrop: { x: number; y: number; width: number; height: number; unit?: string },
  image: HTMLImageElement
) {
  if (percentCrop.unit === '%' || percentCrop.unit === undefined) {
    return {
      x: Math.round((percentCrop.x / 100) * image.naturalWidth),
      y: Math.round((percentCrop.y / 100) * image.naturalHeight),
      width: Math.round((percentCrop.width / 100) * image.naturalWidth),
      height: Math.round((percentCrop.height / 100) * image.naturalHeight),
    };
  }
  // Already in px
  return {
    x: Math.round(percentCrop.x),
    y: Math.round(percentCrop.y),
    width: Math.round(percentCrop.width),
    height: Math.round(percentCrop.height),
  };
}

/**
 * Adjusts crop coordinates for letterboxing when the displayed image size differs from the natural size.
 * Returns a pixel crop in natural image coordinates.
 */
export function adjustCropForLetterbox(
  percentCrop: { x: number; y: number; width: number; height: number; unit?: string },
  image: HTMLImageElement,
  displayedWidth: number,
  displayedHeight: number
) {
  // Calculate scale factors
  const scaleX = image.naturalWidth / displayedWidth;
  const scaleY = image.naturalHeight / displayedHeight;

  // Calculate letterbox offsets
  let offsetX = 0;
  let offsetY = 0;
  const imageAspect = image.naturalWidth / image.naturalHeight;
  const displayAspect = displayedWidth / displayedHeight;
  if (imageAspect > displayAspect) {
    // Letterboxed top/bottom
    const fittedHeight = displayedWidth / imageAspect;
    offsetY = (displayedHeight - fittedHeight) / 2;
  } else if (imageAspect < displayAspect) {
    // Letterboxed left/right
    const fittedWidth = displayedHeight * imageAspect;
    offsetX = (displayedWidth - fittedWidth) / 2;
  }

  // Convert percent crop to displayed image pixels
  const cropX = (percentCrop.x / 100) * displayedWidth;
  const cropY = (percentCrop.y / 100) * displayedHeight;
  const cropW = (percentCrop.width / 100) * displayedWidth;
  const cropH = (percentCrop.height / 100) * displayedHeight;

  // Adjust for letterboxing and scale to natural image
  const natX = Math.round((cropX - offsetX) * scaleX);
  const natY = Math.round((cropY - offsetY) * scaleY);
  const natW = Math.round(cropW * scaleX);
  const natH = Math.round(cropH * scaleY);

  console.log('[adjustCropForLetterbox]', {
    percentCrop,
    displayedWidth,
    displayedHeight,
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
    scaleX,
    scaleY,
    offsetX,
    offsetY,
    natX,
    natY,
    natW,
    natH,
  });

  return {
    x: natX,
    y: natY,
    width: natW,
    height: natH,
  };
}

/**
 * Loads an image from a data URL, crops it, and returns the cropped image as a data URL.
 * Calls onCropped with the result, or onError if something fails.
 */
export async function handleCropCompleteUtil(
  imageDataUrl: string | null,
  crop: { x: number; y: number; width: number; height: number; unit?: string } | undefined,
  onCropped: (croppedUrl: string) => void,
  onError?: (err: any) => void,
  displayedWidth?: number,
  displayedHeight?: number
) {
  if (!imageDataUrl || !crop) {
    console.log('[handleCropCompleteUtil] Missing imageDataUrl or crop', { imageDataUrl, crop });
    return;
  }
  const image = new Image();
  image.src = imageDataUrl;
  await new Promise((resolve) => {
    image.onload = resolve;
  });
  console.log('[handleCropCompleteUtil] Loaded image', {
    src: image.src,
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
    crop,
    displayedWidth,
    displayedHeight,
  });
  let pixelCrop;
  if (
    displayedWidth &&
    displayedHeight &&
    (crop.unit === '%' || crop.unit === undefined)
  ) {
    pixelCrop = adjustCropForLetterbox(crop, image, displayedWidth, displayedHeight);
  } else {
    pixelCrop = percentCropToPixels(crop, image);
  }
  console.log('[handleCropCompleteUtil] pixelCrop:', pixelCrop);
  try {
    const croppedImageUrl = await getCroppedImg(image, pixelCrop);
    onCropped(croppedImageUrl);
  } catch (err) {
    if (onError) onError(err);
    else alert('Crop failed.');
  }
}
