import { create } from 'zustand';
import { uploadProductImages, S3_BASE_URL } from '../api/fileUpload';
import { createProductWithImageFilenames, updateProduct, CreateProductWithImagesRequest, Product } from '../api/products';
import { Alert } from 'react-native';
import { ProductType, ProductCondition, PRODUCT_TYPES, PRODUCT_CONDITIONS } from '../constants/productConstants';

// Define types
export type ProductCategory = 'electronics' | 'furniture' | 'auto' | 'fashion' | 'sports' | 'stationery' | 'eventpass';

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

  // Edit mode state
  isEditMode: boolean;
  productId: string | null;
  initialProductData: Partial<Product> | null;

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
  removeImage: (index: number, isExisting: boolean) => void;

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

  // Edit mode methods
  setEditMode: (isEdit: boolean) => void;
  setProductId: (id: string | null) => void;
  populateFormWithProduct: (product: Product) => void;
  updateExistingProduct: (
    userEmail: string,
    userName: string,
    userZipcode: string,
    onSuccess: () => void
  ) => Promise<void>;

  // Reset state
  resetState: () => void;

  // New state for deletion tracking
  imagesToDelete: string[];
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

  // Edit mode state
  isEditMode: false,
  productId: null,
  initialProductData: null,
  imagesToDelete: [],

  // Display computed values
  get displayType() { return get().selectedType?.name || ''; },
  get displaySubcategory() { return get().selectedSubcategory || ''; },
  get displayCondition() { return get().selectedCondition?.name || ''; },
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
      selectedSubcategory: null, // Reset subcategory when type changes
    });
    // Clear type-related errors
    if (get().errors.type) {
      set(state => ({
        errors: { ...state.errors, type: undefined },
      }));
    }
  },
  setSelectedSubcategory: (subcategory) => set({ selectedSubcategory: subcategory }),
  setDescription: (description) => {
    set({ description });
    // Clear description-related errors
    if (get().errors.description) {
      set(state => ({
        errors: { ...state.errors, description: undefined },
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
        errors: { ...state.errors, price: undefined },
      }));
    }
  },
  setSelectedCondition: (condition) => {
    set({ selectedCondition: condition });
    // Clear condition-related errors
    if (get().errors.condition) {
      set(state => ({
        errors: { ...state.errors, condition: undefined },
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
    }));
    if (get().errors.images) {
      set(state => ({ errors: { ...state.errors, images: undefined } }));
    }
  },
  removeImage: (index, isExisting) => {
    set(state => {
      const newImages = [...state.images];
      const newLocalUris = [...state.localImageUris];
      let newImagesToDelete = [...state.imagesToDelete];

      if (isExisting) {
        // Removing an image that was initially present
        if (index < newLocalUris.length) {
          const removedUrl = newLocalUris[index];
          console.log("[PostingStore] Marking existing image for deletion:", removedUrl);
          newImagesToDelete.push(removedUrl);
          newLocalUris.splice(index, 1);
        }
      } else {
        // Removing a newly added image (index corresponds to state.images)
        if (index < newImages.length) {
            console.log("[PostingStore] Removing newly added image at index:", index);
            newImages.splice(index, 1);
        }
      }

      return {
        images: newImages, // Updated list of NEW images
        localImageUris: newLocalUris, // Updated list of currently displayed images
        imagesToDelete: newImagesToDelete, // Updated list of images marked for deletion
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
      newErrors.title = 'Title is required';
      isValid = false;
    } else if (state.title.length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
      isValid = false;
    }

    // Validate type
    if (!state.selectedType) {
      newErrors.type = 'Please select a type';
      isValid = false;
    }

    // Validate description
    if (!state.description.trim()) {
      newErrors.description = 'Description is required';
      isValid = false;
    } else if (state.description.length < 10) {
      newErrors.description = 'Description is too short';
      isValid = false;
    }

    // Validate price
    if (state.isSell && (!state.price.trim() || parseFloat(state.price) <= 0)) {
      newErrors.price = 'Please enter a valid price';
      isValid = false;
    }

    // Validate condition
    if (!state.selectedCondition) {
      newErrors.condition = 'Please select condition';
      isValid = false;
    }

    // Validate images only if NOT in edit mode
    if (!state.isEditMode && state.localImageUris.length === 0 && state.images.length === 0) {
      newErrors.images = 'At least one image is required';
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
          'Please Fix These Issues',
          errorMessages,
          [{ text: 'OK' }]
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
      sellingtype: state.isSell ? 'sell' : 'rent',
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
          primaryImage: fullImageUrls.length > 0 ? fullImageUrls[0] : '',
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
            'Success',
            'Your item has been posted successfully!',
            [{ text: 'OK', onPress: () => {
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
            'Error Creating Listing',
            productError instanceof Error
              ? `Failed to create product: ${productError.message}`
              : 'Failed to create product. Please try again.'
          );
        }
      } catch (uploadError: any) {
        console.error('[PostingStore] Image upload error:', uploadError);
        set({ isLoading: false });

        // Check specifically for 413 error (Payload Too Large)
        if (uploadError.message && uploadError.message.includes('413')) {
          Alert.alert(
            'Images Too Large',
            'Your images are too large to upload. Please try using smaller images (under 5MB each) or fewer images.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Image Upload Failed',
            uploadError instanceof Error
              ? `Failed to upload images: ${uploadError.message}`
              : 'Failed to upload images. Please check your connection and try again.'
          );
        }
      }
    } catch (error) {
      set({ isLoading: false });
      console.error('[PostingStore] Error posting item:', error);

      Alert.alert(
        'Error',
        'Something went wrong while posting your item. Please try again.'
      );
    }
  },

  // Edit mode methods
  setEditMode: (isEdit) => set({ isEditMode: isEdit }),
  
  // Set product ID for editing
  setProductId: (id) => set({ productId: id }),
  
  // Populate form with existing product data
  populateFormWithProduct: (product: Product) => {
    if (!product) return;
    
    const productType = product.category 
      ? PRODUCT_TYPES.find((type: ProductType) => type.id === product.category?.toLowerCase())
      : null;
      
    const condition = product.productage 
      ? PRODUCT_CONDITIONS.find((c: ProductCondition) => c.id === product.productage)
      : null;
      
    const isSell = product.sellingtype === 'sell';
    
    // Use robust logic to extract image URLs
    let imageUrls: string[] = [];
    if (product.allImages && Array.isArray(product.allImages) && product.allImages.length > 0) {
      imageUrls = product.allImages;
    } else if (product.imageUrls && Array.isArray(product.imageUrls) && product.imageUrls.length > 0) {
      imageUrls = product.imageUrls;
    } else if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      imageUrls = product.images;
    } else if (product.primaryImage) {
      imageUrls = [product.primaryImage, ...(product.additionalImages || [])];
    } else if (product.image) {
      imageUrls = [product.image];
    }
    // Filter out any invalid URLs
    const validImageUrls = imageUrls
      .map(img => (typeof img === 'string' && img.trim() !== '') ? img.trim() : undefined)
      .filter((img): img is string => img !== undefined);

    console.log("[PostingStore] Populating form with product:", product.id, "Image URLs found:", validImageUrls);

    set({
      title: product.name || '',
      selectedType: productType,
      selectedSubcategory: (product as any).subcategory || null, // Keep potential subcategory
      description: product.description || '',
      price: product.price || '',
      selectedCondition: condition,
      isSell: isSell,
      localImageUris: validImageUrls, // Set the extracted URLs
      images: [], // Start with no new images
      initialProductData: { ...product }, // Store copy
      cityToUse: product.city || '', // Populate cityToUse from product data
      // Reset display values based on populated data
      displayType: productType ? productType.name : 'Select Type',
      displaySubcategory: (product as any).subcategory || 'Select Subcategory',
      displayCondition: condition ? condition.name : 'Select Condition',
      hasSubcategories: !!(productType && productType.subcategories),
    });
  },
  
  // Update existing product
  updateExistingProduct: async (userEmail, userName, userZipcode, onSuccess) => {
    const state = get();
    const isValid = state.validateForm();
    
    if (!isValid) return;
    if (!state.productId || !state.initialProductData) {
      Alert.alert('Error', 'Cannot update. Initial product data missing.');
      return;
    }
    
    set({ isLoading: true, uploadProgress: 0 });
    
    try {
      const updateData: Partial<CreateProductWithImagesRequest> = {};
      const initial = state.initialProductData;

      // Compare text/selection fields and add to updateData if changed
      if (state.title !== initial.name) {
        updateData.name = state.title;
      }
      const currentCategoryId = state.selectedType?.id || '';
      // Compare with initial.type (assuming type corresponds to category)
      if (currentCategoryId !== (initial.type || '')) { 
        updateData.category = currentCategoryId;
        // Reset subcategory if category changes
        updateData.subcategory = state.selectedSubcategory || ''; 
      } else if (state.selectedSubcategory !== (initial as any).subcategory) { // Use type assertion for subcategory as it's not in Product type
        // Update subcategory only if it changed within the same category
        updateData.subcategory = state.selectedSubcategory || '';
      }
      if (state.description !== initial.description) {
        updateData.description = state.description;
      }
      if (state.price !== initial.price) {
        updateData.price = state.price;
      }
      
      // Check if city changed
      if (state.cityToUse !== (initial.city || '')) {
        updateData.city = state.cityToUse || '';
      }
      
      const currentConditionId = state.selectedCondition?.id || '';
      // Compare with initial.productage (assuming productage corresponds to condition)
      if (currentConditionId !== (initial.productage || '')) { 
        updateData.productage = currentConditionId;
      }
      const currentSellingType = state.isSell ? 'sell' : 'rent';
      if (currentSellingType !== initial.sellingtype) {
        updateData.sellingtype = currentSellingType;
      }

      let newImageUrls: string[] = [];
      let imageUpdateNeeded = false;

      // 1. Upload NEWLY added images (if any)
      if (state.images.length > 0) {
        console.log('[PostingStore] New images selected, starting upload...');
        imageUpdateNeeded = true; // Mark that images need updating
        set({ uploadProgress: 20 });
        try {
          const uploadResponse = await uploadProductImages(state.images);
          set({ uploadProgress: 50 });
          if (!uploadResponse?.fileNames?.length) throw new Error('Failed to upload images - no filenames returned');
          newImageUrls = uploadResponse.fileNames.map(filename => `${S3_BASE_URL}${filename}`);
          console.log('[PostingStore] New images uploaded:', newImageUrls);
        } catch (uploadError: any) {
          console.error('[PostingStore] Image upload error during update:', uploadError);
          set({ isLoading: false });
          Alert.alert('Image Upload Failed', uploadError instanceof Error ? uploadError.message : 'Failed to upload new images.');
          return; // Stop update if new image upload fails
        }
      }

      // 2. Determine the final list of image URLs
      const initialImageUrls = state.initialProductData.allImages || 
                               state.initialProductData.imageUrls || 
                               state.initialProductData.images || 
                               (state.initialProductData.primaryImage ? [state.initialProductData.primaryImage, ...(state.initialProductData.additionalImages || [])] : []) ||
                               [];
                               
      const validInitialUrls = initialImageUrls
                                .map(img => typeof img === 'string' && img.trim() !== '' ? img.trim() : undefined)
                                .filter((img): img is string => img !== undefined);

      // Filter out images marked for deletion
      const remainingInitialUrls = validInitialUrls.filter(url => !state.imagesToDelete.includes(url));
      
      // Combine remaining initial URLs with newly uploaded URLs
      const finalImageUrls = [...remainingInitialUrls, ...newImageUrls];

      // 3. Check if the final image list is different from the initial list
      const initialUrlsSet = new Set(validInitialUrls);
      const finalUrlsSet = new Set(finalImageUrls);
      if (initialUrlsSet.size !== finalUrlsSet.size || !validInitialUrls.every(url => finalUrlsSet.has(url))) {
        imageUpdateNeeded = true; // Mark update needed if list composition changed
        console.log("[PostingStore] Image list changed. Initial:", validInitialUrls, "Final:", finalImageUrls);
      }

      // 4. Add image data to updateData ONLY if an update is needed
      if (imageUpdateNeeded) {
        console.log("[PostingStore] Including final image list in update payload.");
        updateData.allImages = finalImageUrls;
        updateData.primaryImage = finalImageUrls.length > 0 ? finalImageUrls[0] : '';
        // Optionally send imageFilenames if your backend uses it specifically for updates
        // updateData.imageFilenames = finalImageUrls; 
      }

      // 5. Check if anything actually changed (text fields or images)
      if (Object.keys(updateData).length === 0) {
        console.log('[PostingStore] No changes detected. Skipping update.');
        set({ isLoading: false });
        Alert.alert('No Changes', 'You haven\'t made any changes to the listing.', [{ text: 'OK', onPress: () => {
            onSuccess(); 
            get().resetState();
        }}]);
        return;
      }

      console.log('[PostingStore] Updating product with changed data:', JSON.stringify(updateData));
      set({ uploadProgress: 80 });
      
      // Update the product API call
      try {
        const updatedProduct = await updateProduct(state.productId, updateData);
        console.log('[PostingStore] Product updated successfully:', JSON.stringify(updatedProduct));
        set({ uploadProgress: 100, isLoading: false });
        Alert.alert('Success', 'Your item has been updated successfully!', [{ text: 'OK', onPress: () => {
            console.log('[PostingStore] Navigating back after successful update');
            onSuccess();
            get().resetState();
          }}]);
      } catch (productError) {
        console.error('[PostingStore] Product update error:', productError);
        set({ isLoading: false });
        Alert.alert(
          'Error Updating Listing',
          productError instanceof Error
            ? `Failed to update product: ${productError.message}`
            : 'Failed to update product. Please try again.'
        );
      }
    } catch (error: any) {
      console.error('[PostingStore] General update error:', error);
      set({ isLoading: false });
      Alert.alert(
        'Update Failed',
        error instanceof Error
          ? `Failed to update product: ${error.message}`
          : 'Failed to update product. Please try again.'
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
    conditionModalVisible: false,
    displayType: 'Select Type',
    displaySubcategory: 'Select Subcategory',
    displayCondition: 'Select Condition',
    hasSubcategories: false,
    isEditMode: false,
    productId: null,
    imagesToDelete: [],
    initialProductData: null,
  }),
}));

export default usePostingStore;
