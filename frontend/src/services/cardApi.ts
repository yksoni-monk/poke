import { CardData, ScanResult } from '../types/card';

export class CardApiService {
  static async scanCard(imageBlob: Blob): Promise<ScanResult> {
    try {
      const formData = new FormData();
      formData.append('image', imageBlob, 'card.jpg');

      // Use the current domain for API calls
      const apiBaseUrl = window.location.protocol + '//' + window.location.host;
      const response = await fetch(`${apiBaseUrl}/v1/api/scan-card`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        return {
          success: false,
          error: data.error || 'Failed to identify card'
        };
      }

      return {
        success: true,
        cardData: data.cardData
      };
    } catch (error) {
      console.error('Error scanning card:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error. Please check your connection and try again."
      };
    }
  }
  
  static dataURLToBlob(dataURL: string): Blob {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }
}