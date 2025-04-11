import { create } from 'zustand';
import { uploadProductImages, S3_BASE_URL } from '../api/fileUpload';
import { createProductWithImageFilenames } from '../api/products';
import { Alert } from 'react-native';

// Define types
export type ProductCategory = 'electronics' | 'furniture' | 'auto' | 'fashion' | 'sports' | 'stationery' | 'eventpass';

export interface ProductType {
  id: ProductCategory | string;
  name: string;
  icon: string;
  iconType: 'material' | 'fontawesome' | 'entypo';
  color: string;
  subcategories?: string[];
}

export interface ProductCondition {
  id: string;
  name: string;
  description: string;
}

export interface ImageFile {
  uri: string;
  type: string;
  name: string;
  fileSize?: number;
}

export interface PostingErrors {
  title?: string;
  type?: string;
  description?: string;
  price?: string;
  condition?: string;
  images?: string;
}

// Define the store state
interface PostingState {
  // Form data
  images: ImageFile[];
  localImageUris: string[];
  title: string;
  selectedType: ProductType | null;
  selectedSubcategory: string | null;
  description: string;
  price: string;
  selectedCondition: ProductCondition | null;
  isSell: boolean;
  
  // UI state
  isLoading: boolean;
  uploadProgress: number;
  errors: PostingErrors;
  typeModalVisible: boolean;
  subcategoryModalVisible: boolean;
  conditionModalVisible: boolean;
  
  // Display computed values
  displayType: string;
  displaySubcategory: string;
  displayCondition: string;
  hasSubcategories: boolean;
  
  // Extra context
  universityToUse: string;
  cityToUse: string;
  
  // Actions
  setTitle: (title: string) => void;
  setSelectedType: (type: ProductType | null) => void;
  setSelectedSubcategory: (subcategory: string | null) => void;
  setDescription: (description: string) => void;
  setPrice: (price: string) => void;
  setSelectedCondition: (condition: ProductCondition | null) => void;
  setIsSell: (isSell: boolean) => void;
  
  // Modal actions
  setTypeModalVisible: (visible: boolean) => void;
  setSubcategoryModalVisible: (visible: boolean) => void;
  setConditionModalVisible: (visible: boolean) => void;
  
  // Context setters
  setUniversityToUse: (university: string) => void;
  setCityToUse: (city: string) => void;
  
  // Image handling
  addImage: (image: ImageFile) => void;
  removeImage: (index: number) => void;
  
  // Form validation
  validateForm: () => boolean;
  clearErrors: () => void;
  
  // Posting functionality
  postItem: (
    userEmail: string, 
    userName: string, 
    userZipcode: string, 
    onSuccess: () => void
  ) => Promise<void>;
  
  // Reset state
  resetState: () => void;
}

// Create the store
const usePostingStore = create<PostingState>((set, get) => ({
  // Form data
  images: [],
  localImageUris: [],
  title: '',
  selectedType: null,
  selectedSubcategory: null,
  description: '',
  price: '',
  selectedCondition: null,
  isSell: true,
  
  // UI state
  isLoading: false,
  uploadProgress: 0,
  errors: {},
  typeModalVisible: false,
  subcategoryModalVisible: false,
  conditionModalVisible: false,
  
  // Display computed values
  get displayType() { return get().selectedType?.name || ""; },
  get displaySubcategory() { return get().selectedSubcategory || ""; },
  get displayCondition() { return get().selectedCondition?.name || ""; },
  get hasSubcategories() { 
    const selectedType = get().selectedType;
    return !!(selectedType && selectedType.subcategories && selectedType.subcategories.length > 0); 
  },
  
  // Extra context
  universityToUse: '',
  cityToUse: '',
  
  // Actions
  setTitle: (title) => set({ title }),
  setSelectedType: (type) => {
    set({ 
      selectedType: type,
      selectedSubcategory: null // Reset subcategory when type changes
    });
    // Clear type-related errors
    if (get().errors.type) {
      set(state => ({ 
        errors: { ...state.errors, type: undefined } 
      }));
    }
  },
  setSelectedSubcategory: (subcategory) => set({ selectedSubcategory: subcategory }),
  setDescription: (description) => {
    set({ description });
    // Clear description-related errors
    if (get().errors.description) {
      set(state => ({ 
        errors: { ...state.errors, description: undefined } 
      }));
    }
  },
  setPrice: (price) => {
    // Remove non-numeric characters except the decimal point
    const sanitizedPrice = price.replace(/[^0-9.]/g, '');
    // Ensure only one decimal point
    const parts = sanitizedPrice.split('.');
    const formattedPrice = parts.length > 1 
      ? `${parts[0]}.${parts.slice(1).join('')}`
      : sanitizedPrice;
    
    set({ price: formattedPrice });
    
    // Clear price-related errors
    if (get().errors.price) {
      set(state => ({ 
        errors: { ...state.errors, price: undefined } 
      }));
    }
  },
  setSelectedCondition: (condition) => {
    set({ selectedCondition: condition });
    // Clear condition-related errors
    if (get().errors.condition) {
      set(state => ({ 
        errors: { ...state.errors, condition: undefined } 
      }));
    }
  },
  setIsSell: (isSell) => set({ isSell }),
  
  // Modal actions
  setTypeModalVisible: (visible) => set({ typeModalVisible: visible }),
  setSubcategoryModalVisible: (visible) => set({ subcategoryModalVisible: visible }),
  setConditionModalVisible: (visible) => set({ conditionModalVisible: visible }),
  
  // Context setters
  setUniversityToUse: (university) => set({ universityToUse: university }),
  setCityToUse: (city) => set({ cityToUse: city }),
  
  // Image handling
  addImage: (image) => {
    set(state => ({ 
      images: [...state.images, image],
      localImageUris: [...state.localImageUris, image.uri]
    }));
    
    // Clear any image-related errors
    if (get().errors.images) {
      set(state => ({ 
        errors: { ...state.errors, images: undefined } 
      }));
    }
  },
  removeImage: (index) => {
    set(state => {
      const newImages = [...state.images];
      newImages.splice(index, 1);
      
      const newLocalUris = [...state.localImageUris];
      newLocalUris.splice(index, 1);
      
      return {
        images: newImages,
        localImageUris: newLocalUris
      };
    });
  },
  
  // Form validation
  validateForm: () => {
    const state = get();
    let isValid = true;
    const newErrors: PostingErrors = {};
    
    // Validate title
    if (!state.title.trim()) {
      newErrors.title = "Title is required";
      isValid = false;
    } else if (state.title.length < 3) {
      newErrors.title = "Title must be at least 3 characters";
      isValid = false;
    }
    
    // Validate type
    if (!state.selectedType) {
      newErrors.type = "Please select a type";
      isValid = false;
    }
    
    // Validate description
    if (!state.description.trim()) {
      newErrors.description = "Description is required";
      isValid = false;
    } else if (state.description.length < 10) {
      newErrors.description = "Description is too short";
      isValid = false;
    }
    
    // Validate price
    if (state.isSell && (!state.price.trim() || parseFloat(state.price) <= 0)) {
      newErrors.price = "Please enter a valid price";
      isValid = false;
    }
    
    // Validate condition
    if (!state.selectedCondition) {
      newErrors.condition = "Please select condition";
      isValid = false;
    }
    
    // Validate images
    if (state.images.length === 0) {
      newErrors.images = "At least one image is required";
      isValid = false;
    }
    
    set({ errors: newErrors });
    return isValid;
  },
  clearErrors: () => set({ errors: {} }),
  
  // Posting functionality
  postItem: async (userEmail, userName, userZipcode, onSuccess) => {
    console.log('[PostingStore] Starting product posting process');
    
    if (!get().validateForm()) {
      console.log('[PostingStore] Form validation failed');
      
      // Show validation errors to the user
      const errorMessages = Object.entries(get().errors)
        .filter(([_, value]) => value)
        .map(([_field, message]) => `• ${message}`)
        .join('\n');
      
      if (errorMessages) {
        Alert.alert(
          "Please Fix These Issues",
          errorMessages,
          [{ text: "OK" }]
        );
      }
      
      return;
    }
    
    if (!userEmail) {
      console.error('[PostingStore] User email not available');
      Alert.alert('Error', 'You must be logged in to post an item');
      return;
    }

    // Check total size of all images
    const MAX_TOTAL_SIZE = 20 * 1024 * 1024; // 20MB total
    const totalSize = get().images.reduce((size, img) => {
      // Try to get file size if available
      const fileSize = img.fileSize || 0;
      return size + fileSize;
    }, 0);

    if (totalSize > MAX_TOTAL_SIZE) {
      Alert.alert(
        'Images Too Large',
        'The total size of all images exceeds our 20MB limit. Please use smaller or fewer images.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    console.log('[PostingStore] Form data validated, proceeding with upload');
    console.log('[PostingStore] Images to upload:', get().images.length);
    
    const state = get();
    
    console.log('[PostingStore] Product data:', JSON.stringify({
      title: state.title,
      category: state.selectedType?.id,
      subcategory: state.selectedSubcategory || '',
      description: state.description.length > 50 ? state.description.substring(0, 50) + '...' : state.description,
      price: state.price,
      email: userEmail,
      sellerName: userName || 'Anonymous User',
      city: state.cityToUse || '',
      zipcode: userZipcode || '',
      university: state.universityToUse,
      productage: state.selectedCondition?.id,
      sellingtype: state.isSell ? 'sell' : 'rent'
    }));
    
    set({ isLoading: true, uploadProgress: 10 });
    
    try {
      if (!state.images.length) {
        throw new Error('No images to upload');
      }
      
      // Step 1: Upload images to get filenames
      console.log('[PostingStore] Starting image upload to server...');
      let imageFileNames: string[] = [];
      
      try {
        const uploadResponse = await uploadProductImages(state.images);
        console.log('[PostingStore] Image upload response:', JSON.stringify(uploadResponse));
        set({ uploadProgress: 50 });
        
        if (!uploadResponse || !uploadResponse.fileNames || uploadResponse.fileNames.length === 0) {
          console.error('[PostingStore] Upload response missing filenames:', uploadResponse);
          throw new Error('Failed to upload images - no filenames returned');
        }
        
        // Store the filenames (not URLs) returned from the API
        imageFileNames = uploadResponse.fileNames;
        console.log('[PostingStore] Uploaded image filenames:', imageFileNames);
        
        // Add S3 base URL to each image filename
        const fullImageUrls = imageFileNames.map(filename => `${S3_BASE_URL}${filename}`);
        
        // Step 2: Create the product with the uploaded image filenames WITH the S3 base URL
        const productData = {
          name: state.title,
          category: state.selectedType?.id || '',
          subcategory: state.selectedSubcategory || '',
          description: state.description,
          price: state.price,
          email: userEmail,
          sellerName: userName || 'Anonymous User',
          city: state.cityToUse || '',
          zipcode: userZipcode || '',
          university: state.universityToUse,
          productage: state.selectedCondition?.id || '',
          sellingtype: state.isSell ? 'sell' : 'rent',
          imageFilenames: fullImageUrls,  // Send full URLs including S3 base URL
          allImages: fullImageUrls,
          primaryImage: fullImageUrls.length > 0 ? fullImageUrls[0] : ''
        };
        
        console.log('[PostingStore] Creating product with data:', JSON.stringify(productData));
        set({ uploadProgress: 80 });
        
        // Create the product with the image filenames
        try {
          const createdProduct = await createProductWithImageFilenames(productData);
          console.log('[PostingStore] Product created successfully:', JSON.stringify(createdProduct));
          
          set({ uploadProgress: 100, isLoading: false });
          
          // Show success message
          Alert.alert(
            "Success",
            "Your item has been posted successfully!",
            [{ text: "OK", onPress: () => {
              console.log('[PostingStore] Navigating back after successful post');
              // Call the success callback
              onSuccess();
              // Reset the store state
              get().resetState();
            }}]
          );
        } catch (productError) {
          console.error('[PostingStore] Product creation error:', productError);
          set({ isLoading: false });
          
          Alert.alert(
            "Error Creating Listing",
            productError instanceof Error 
              ? `Failed to create product: ${productError.message}` 
              : "Failed to create product. Please try again."
          );
        }
      } catch (uploadError: any) {
        console.error('[PostingStore] Image upload error:', uploadError);
        set({ isLoading: false });
        
        // Check specifically for 413 error (Payload Too Large)
        if (uploadError.message && uploadError.message.includes('413')) {
          Alert.alert(
            "Images Too Large",
            "Your images are too large to upload. Please try using smaller images (under 5MB each) or fewer images.",
            [{ text: "OK" }]
          );
        } else {
          Alert.alert(
            "Image Upload Failed",
            uploadError instanceof Error 
              ? `Failed to upload images: ${uploadError.message}` 
              : "Failed to upload images. Please check your connection and try again."
          );
        }
      }
    } catch (error) {
      set({ isLoading: false });
      console.error('[PostingStore] Error posting item:', error);
      
      Alert.alert(
        "Error",
        "Something went wrong while posting your item. Please try again."
      );
    }
  },
  
  // Reset state
  resetState: () => set({
    images: [],
    localImageUris: [],
    title: '',
    selectedType: null,
    selectedSubcategory: null,
    description: '',
    price: '',
    selectedCondition: null,
    isSell: true,
    isLoading: false,
    uploadProgress: 0,
    errors: {},
    typeModalVisible: false,
    subcategoryModalVisible: false,
    conditionModalVisible: false
  })
}));

export default usePostingStore; 