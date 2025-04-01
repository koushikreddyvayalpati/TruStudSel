/**
 * Image URL Helper Utilities
 * 
 * Functions to standardize image URL handling throughout the app.
 */
import { S3_BASE_URL } from '../api/fileUpload';
import { Image } from 'react-native';
import { manipulateAsync, SaveFormat } from 'react-native-image-manipulator';

/**
 * Get the full S3 URL for an image filename
 * 
 * @param filename The image filename returned from the backend
 * @returns The full S3 URL to the image
 */
export const getFullImageUrl = (filename: string): string => {
  // If the filename is already a full URL, return it as is
  if (!filename) return '';
  if (filename.startsWith('http')) return filename;
  
  // Otherwise, append it to the S3 base URL
  return `${S3_BASE_URL}${filename}`;
};

/**
 * Convert an array of image filenames to full S3 URLs
 * 
 * @param filenames Array of image filenames
 * @returns Array of full S3 URLs
 */
export const getFullImageUrls = (filenames: string[]): string[] => {
  if (!filenames || !Array.isArray(filenames)) return [];
  
  return filenames.map(filename => getFullImageUrl(filename));
};

/**
 * Resize and compress an image to make it suitable for upload
 * 
 * @param imageUri URI of the image to resize
 * @param maxWidth Maximum width of the resized image (default: 1000)
 * @param quality JPEG quality (0-1) (default: 0.7)
 * @returns Promise resolving to the URI of the resized image
 */
export const resizeImageForUpload = async (
  imageUri: string,
  maxWidth: number = 1000,
  quality: number = 0.7
): Promise<string> => {
  console.log(`[imageHelpers] Resizing image: ${imageUri}`);
  
  try {
    // Get original image dimensions
    return new Promise((resolve, reject) => {
      Image.getSize(
        imageUri, 
        async (width, height) => {
          console.log(`[imageHelpers] Original image size: ${width}x${height}`);
          
          // If image is already smaller than maxWidth, just compress it
          if (width <= maxWidth) {
            try {
              const result = await manipulateAsync(
                imageUri,
                [],
                { compress: quality, format: SaveFormat.JPEG }
              );
              console.log(`[imageHelpers] Image compressed, new URI: ${result.uri.substring(0, 50)}...`);
              resolve(result.uri);
            } catch (error) {
              console.error('[imageHelpers] Error compressing image:', error);
              // Return original if compression fails
              resolve(imageUri);
            }
          } else {
            // Calculate new height to maintain aspect ratio
            const newHeight = Math.floor((height / width) * maxWidth);
            console.log(`[imageHelpers] Resizing to: ${maxWidth}x${newHeight}`);
            
            try {
              const result = await manipulateAsync(
                imageUri,
                [{ resize: { width: maxWidth, height: newHeight } }],
                { compress: quality, format: SaveFormat.JPEG }
              );
              console.log(`[imageHelpers] Image resized and compressed, new URI: ${result.uri.substring(0, 50)}...`);
              resolve(result.uri);
            } catch (error) {
              console.error('[imageHelpers] Error resizing image:', error);
              // Return original if resizing fails
              resolve(imageUri);
            }
          }
        },
        (error) => {
          console.error('[imageHelpers] Error getting image dimensions:', error);
          reject(error);
        }
      );
    });
  } catch (error) {
    console.error('[imageHelpers] Error in resizeImageForUpload:', error);
    // Return original URI if there's an error
    return imageUri;
  }
};

/**
 * Process multiple images for upload (resize and compress)
 * 
 * @param images Array of image objects with uri, type, and name
 * @returns Promise resolving to processed images array
 */
export const processImagesForUpload = async (
  images: Array<{ uri: string; type: string; name: string }>
): Promise<Array<{ uri: string; type: string; name: string }>> => {
  console.log(`[imageHelpers] Processing ${images.length} images for upload`);
  
  try {
    const processedImages = await Promise.all(
      images.map(async (image) => {
        try {
          // Resize and compress the image
          const resizedUri = await resizeImageForUpload(image.uri);
          
          return {
            uri: resizedUri,
            type: image.type || 'image/jpeg',
            name: image.name || `image_${Date.now()}.jpg`,
          };
        } catch (error) {
          console.error('[imageHelpers] Error processing image:', error);
          // Return original image if processing fails
          return image;
        }
      })
    );
    
    console.log(`[imageHelpers] Finished processing ${processedImages.length} images`);
    return processedImages;
  } catch (error) {
    console.error('[imageHelpers] Error in processImagesForUpload:', error);
    // Return original images if there's an error
    return images;
  }
};

/**
 * Process a product to ensure all image properties have full URLs
 * 
 * @param product The product object from the API
 * @returns Product with updated image URLs
 */
export const processProductImages = (product: any): any => {
  if (!product) return product;
  
  const processedProduct = { ...product };
  
  // Process main image property if it exists
  if (product.image) {
    processedProduct.image = getFullImageUrl(product.image);
  }
  
  // Process primaryImage if it exists
  if (product.primaryImage) {
    processedProduct.primaryImage = getFullImageUrl(product.primaryImage);
  }
  
  // Process images array if it exists
  if (product.images && Array.isArray(product.images)) {
    processedProduct.images = getFullImageUrls(product.images);
  }
  
  // Process additionalImages array if it exists
  if (product.additionalImages && Array.isArray(product.additionalImages)) {
    processedProduct.additionalImages = getFullImageUrls(product.additionalImages);
  }
  
  // Add an imageUrls property with all full URLs for convenience
  if (product.images && Array.isArray(product.images)) {
    processedProduct.imageUrls = getFullImageUrls(product.images);
  }
  
  return processedProduct;
};

export default {
  getFullImageUrl,
  getFullImageUrls,
  processProductImages,
  resizeImageForUpload,
  processImagesForUpload
}; 