/**
 * File Upload API Service
 * 
 * This service handles file upload operations for the application.
 */
import { API_URL, fetchWithTimeout } from './config';

// File upload endpoints
export const FILE_UPLOAD_API_URL = `${API_URL}/api/files`;

// AWS S3 base URL for accessing uploaded files
export const S3_BASE_URL = 'https://trustedproductimages.s3.us-east-2.amazonaws.com/';

/**
 * Interface for the response when uploading product images
 */
export interface ProductImagesUploadResponse {
  fileNames: string[];
  primaryImage: string;
  additionalImages: string[];
  message: string;
}

/**
 * Upload multiple product images (up to 5)
 * 
 * @param images Array of image objects with uri, type, and name properties
 * @returns Promise with the upload response containing image filenames
 */
export const uploadProductImages = async (
  images: Array<{ uri: string; type: string; name: string }>
): Promise<ProductImagesUploadResponse> => {
  console.log('[API:fileUpload] Starting uploadProductImages with images:', images.length);
  
  if (!images || images.length === 0) {
    console.error('[API:fileUpload] No images provided for upload');
    throw new Error('No images provided');
  }
  
  if (images.length > 5) {
    console.error('[API:fileUpload] Too many images provided:', images.length);
    throw new Error('Maximum 5 images allowed per product');
  }
  
  try {
    const formData = new FormData();
    
    // Detailed logging for each image
    console.log('[API:fileUpload] Images to upload:');
    images.forEach((image, index) => {
      console.log(`[API:fileUpload] Image ${index + 1}:`, JSON.stringify({
        uri: image.uri,
        type: image.type || 'image/jpeg',
        name: image.name || `image_${Date.now()}.jpg`
      }));
      
      // Verify the URI is valid
      if (!image.uri || !image.uri.startsWith('file://')) {
        console.error(`[API:fileUpload] Image ${index + 1} has invalid URI:`, image.uri);
      }
      
      // Check if file exists
      if (image.uri) {
        console.log(`[API:fileUpload] Adding image ${index + 1} to FormData`);
        const imageToUpload = {
          uri: image.uri,
          type: image.type || 'image/jpeg',
          name: image.name || `image_${Date.now()}.jpg`
        };
        
        // Append to FormData
        formData.append('images', imageToUpload as any);
      }
    });
    
    // Log the FormData structure
    try {
      const formDataEntries = [...(formData as any)._parts];
      console.log('[API:fileUpload] FormData structure:', 
        formDataEntries.map(part => {
          const fieldName = part[0];
          const value = part[1];
          if (value && typeof value === 'object') {
            return {
              field: fieldName,
              type: value.type,
              name: value.name,
              uri: value.uri ? (value.uri.substring(0, 50) + '...') : 'undefined'
            };
          }
          return { field: fieldName, value };
        })
      );
    } catch (error) {
      console.error('[API:fileUpload] Error logging FormData:', error);
    }
    
    const endpoint = `${FILE_UPLOAD_API_URL}/product-images`;
    console.log('[API:fileUpload] Sending request to endpoint:', endpoint);
    
    // Log request headers
    console.log('[API:fileUpload] Request headers:', {
      'Content-Type': 'multipart/form-data'
    });
    
    const response = await fetchWithTimeout(
      endpoint,
      {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      }
    );
    
    console.log('[API:fileUpload] Response status:', response.status);
    console.log('[API:fileUpload] Response status text:', response.statusText);
    
    // For successful responses
    if (response.ok) {
      try {
        const responseText = await response.text();
        console.log('[API:fileUpload] Raw response text:', responseText.length > 200 
          ? responseText.substring(0, 200) + '...' 
          : responseText);
        
        // Try to parse as JSON
        const result = JSON.parse(responseText) as ProductImagesUploadResponse;
        
        // Log the full S3 URLs for verification
        if (result.fileNames && result.fileNames.length > 0) {
          console.log('[API:fileUpload] Full S3 image URLs:');
          result.fileNames.forEach(fileName => {
            console.log(`- ${S3_BASE_URL}${fileName}`);
          });
        }
        
        console.log('[API:fileUpload] Upload successful, response:', JSON.stringify(result));
        return result;
      } catch (parseError) {
        console.error('[API:fileUpload] Error parsing response as JSON:', parseError);
        throw new Error('Failed to parse upload response');
      }
    } else {
      // For error responses
      const errorText = await response.text();
      console.error('[API:fileUpload] Server error response:', errorText);
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('[API:fileUpload] Error uploading product images:', error);
    if (error instanceof Error) {
      console.error('[API:fileUpload] Error name:', error.name);
      console.error('[API:fileUpload] Error message:', error.message);
      console.error('[API:fileUpload] Error stack:', error.stack);
    }
    throw error instanceof Error 
      ? error 
      : new Error('Failed to upload product images');
  }
};

export default {
  uploadProductImages,
  S3_BASE_URL
}; 