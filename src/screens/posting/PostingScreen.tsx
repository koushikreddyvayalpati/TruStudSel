/**
 * Import statements 
 */
import React, { useState, useMemo, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Entypoicon from 'react-native-vector-icons/Entypo';
import { PostingScreenProps } from '../../types/navigation.types';
import { useTheme } from '../../hooks';
import { TextInput } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import { launchImageLibrary } from 'react-native-image-picker';
import { uploadProductImages, S3_BASE_URL } from '../../api/fileUpload';
import { createProductWithImageFilenames } from '../../api/products';

// Define the product category type for consistency with ProductsScreen
type ProductCategory = 'electronics' | 'furniture' | 'auto' | 'fashion' | 'sports' | 'stationery' | 'eventpass';

// Define types for better code structure
interface ProductType {
  id: ProductCategory | string;
  name: string;
  icon: string;
  iconType: 'material' | 'fontawesome' | 'entypo';
  color: string;
  subcategories?: string[];
}

interface ProductCondition {
  id: string;
  name: string;
  description: string;
}

// Updated product types with main categories matching ProductsScreen and using consistent icons
const PRODUCT_TYPES: ProductType[] = [
  {
    id: "electronics",
    name: "Electronics",
    icon: "game-controller",
    iconType: "entypo",
    color: "#f7b305",
    subcategories: ["Laptops", "Phones", "Tablets", "Accessories", "Audio", "Other"]
  },
  {
    id: "furniture",
    name: "Furniture",
    icon: "bed",
    iconType: "fontawesome",
    color: "#f7b305",
    subcategories: ["Desks", "Chairs", "Storage", "Lamps", "Bedroom", "Other"]
  },
  {
    id: "auto",
    name: "Auto",
    icon: "directions-car",
    iconType: "material",
    color: "#f7b305",
    subcategories: ["Parts", "Accessories", "Tools", "Other"]
  },
  {
    id: "fashion",
    name: "Fashion",
    icon: "shopping-bag",
    iconType: "fontawesome",
    color: "#f7b305",
    subcategories: ["Tops", "Bottoms", "Outerwear", "Shoes", "Accessories", "Other"]
  },
  {
    id: "sports",
    name: "Sports",
    icon: "sports-cricket",
    iconType: "material",
    color: "#f7b305",
    subcategories: ["Fitness", "Team Sports", "Outdoor", "Other"]
  },
  {
    id: "stationery",
    name: "Stationery",
    icon: "book",
    iconType: "material",
    color: "#f7b305",
    subcategories: ["Notebooks", "Writing Tools", "Organization", "Art Supplies", "Other"]
  },
  {
    id: "eventpass",
    name: "Event Pass",
    icon: "ticket",
    iconType: "fontawesome",
    color: "#f7b305",
    subcategories: ["Sports", "Concerts", "Campus Events", "Other"]
  },
  {
    id: "textbooks",
    name: "Textbooks",
    icon: "book",
    iconType: "material",
    color: "#f7b305",
    subcategories: ["Science & Math", "Humanities", "Business", "Engineering", "Other"]
  },
  {
    id: "other",
    name: "Other",
    icon: "question",
    iconType: "fontawesome",
    color: "#f7b305"
  }
];

// Enhanced product conditions with descriptions for better user guidance
const PRODUCT_CONDITIONS: ProductCondition[] = [
  {
    id: "brand-new",
    name: "Brand New",
    description: "Unused, with original packaging or tags"
  },
  {
    id: "like-new",
    name: "Like New",
    description: "Used once or twice, in perfect condition"
  },
  {
    id: "very-good",
    name: "Very Good",
    description: "Light use with minor signs of wear"
  },
  {
    id: "good",
    name: "Good",
    description: "Some signs of wear but functions perfectly"
  },
  {
    id: "acceptable",
    name: "Acceptable",
    description: "Noticeable wear but fully functional"
  },
  {
    id: "for-parts",
    name: "For Parts",
    description: "Not fully functional, for repair or parts only"
  }
];

const PostingScreen: React.FC<PostingScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [images, setImages] = useState<Array<{uri: string; type: string; name: string}>>([]);
  const [localImageUris, setLocalImageUris] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [selectedType, setSelectedType] = useState<ProductType | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [selectedCondition, setSelectedCondition] = useState<ProductCondition | null>(null);
  const [isSell, setIsSell] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); // 0-100
  
  // State for form validation
  const [errors, setErrors] = useState<{
    title?: string;
    type?: string;
    description?: string;
    price?: string;
    condition?: string;
    images?: string;
  }>({});
  
  // State for dropdown modals
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const [subcategoryModalVisible, setSubcategoryModalVisible] = useState(false);
  const [conditionModalVisible, setConditionModalVisible] = useState(false);

  // Memoized variables for better performance
  const displayType = useMemo(() => selectedType?.name || "", [selectedType]);
  const displaySubcategory = useMemo(() => selectedSubcategory || "", [selectedSubcategory]);
  const displayCondition = useMemo(() => selectedCondition?.name || "", [selectedCondition]);
  const hasSubcategories = useMemo(() => selectedType?.subcategories && selectedType.subcategories.length > 0, [selectedType]);

  // Reference to keep track of images that need to be uploaded
  const selectedImagesRef = useRef<Array<{uri: string; type: string; name: string}>>([]);

  // Real image picker implementation - now stores locally first, uploads only when posting
  const handleImageUpload = useCallback(async () => {
    console.log('[PostingScreen] Starting image selection process');
    if (images.length >= 5) {
      console.log('[PostingScreen] Maximum images limit reached');
      Alert.alert('Maximum Images', 'You can upload up to 5 images');
      return;
    }
    
    try {
      console.log('[PostingScreen] Launching image library picker');
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 1,
      });
      
      console.log('[PostingScreen] Image picker result:', JSON.stringify(result));
      
      if (result.didCancel) {
        console.log('[PostingScreen] Image selection canceled by user');
        return;
      }
      
      if (!result.assets || result.assets.length === 0) {
        console.log('[PostingScreen] No assets returned from picker');
        return;
      }
      
      const selected = result.assets[0];
      console.log('[PostingScreen] Selected image:', JSON.stringify({
        uri: selected.uri,
        type: selected.type,
        name: selected.fileName,
        fileSize: selected.fileSize
      }));
      
      if (!selected.uri) {
        console.error('[PostingScreen] Selected image has no URI');
        Alert.alert('Error', 'Failed to get image');
        return;
      }
      
      // Store the image locally for display
      const newImage = {
        uri: selected.uri,
        type: selected.type || 'image/jpeg',
        name: selected.fileName || `image_${Date.now()}.jpg`
      };
      
      console.log('[PostingScreen] Adding new image to state:', JSON.stringify(newImage));
      
      // Update the local images array for UI display
      const updatedImages = [...images, newImage];
      const updatedLocalUris = [...localImageUris, selected.uri];
      
      setImages(updatedImages);
      setLocalImageUris(updatedLocalUris);
      
      // Save images to ref for later upload 
      selectedImagesRef.current = updatedImages;
      
      // Clear any image-related errors
      if (errors.images) {
        setErrors(prev => ({...prev, images: undefined}));
      }
      
    } catch (error) {
      console.error('[PostingScreen] Error selecting image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  }, [images, localImageUris, errors]);

  // Remove image from array
  const handleRemoveImage = useCallback((index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
    
    const newLocalUris = [...localImageUris];
    newLocalUris.splice(index, 1);
    setLocalImageUris(newLocalUris);
    
    // Also update the ref
    selectedImagesRef.current = newImages;
  }, [images, localImageUris]);

  const selectType = useCallback((type: ProductType) => {
    setSelectedType(type);
    setSelectedSubcategory(null); // Reset subcategory when type changes
    setTypeModalVisible(false);
    
    // Clear type-related errors
    if (errors.type) {
      setErrors(prev => ({...prev, type: undefined}));
    }
    
    // If the selected type has subcategories, show the subcategory modal
    if (type.subcategories && type.subcategories.length > 0) {
      setTimeout(() => {
        setSubcategoryModalVisible(true);
      }, 300); // Small delay for better UX
    }
  }, [errors]);

  const selectSubcategory = useCallback((subcategory: string) => {
    setSelectedSubcategory(subcategory);
    setSubcategoryModalVisible(false);
  }, []);

  const selectCondition = useCallback((condition: ProductCondition) => {
    setSelectedCondition(condition);
    setConditionModalVisible(false);
    
    // Clear condition-related errors
    if (errors.condition) {
      setErrors(prev => ({...prev, condition: undefined}));
    }
  }, [errors]);

  // Validate the form before submission
  const validateForm = useCallback(() => {
    console.log('[PostingScreen] Validating form with data:', JSON.stringify({
      title: title || '(empty)',
      hasType: !!selectedType,
      typeId: selectedType?.id || '(none)',
      descriptionLength: description?.length || 0,
      price: price || '(empty)',
      hasCondition: !!selectedCondition,
      conditionId: selectedCondition?.id || '(none)',
      imageCount: images.length,
      isSellMode: isSell
    }));
    
    const newErrors: {
      title?: string;
      type?: string;
      description?: string;
      price?: string;
      condition?: string;
      images?: string;
    } = {};
    
    if (!title.trim()) {
      console.log('[PostingScreen] Validation failed: Title is empty');
      newErrors.title = "Title is required";
    } else if (title.length < 3) {
      console.log('[PostingScreen] Validation failed: Title is too short:', title.length);
      newErrors.title = "Title must be at least 3 characters";
    }
    
    if (!selectedType) {
      console.log('[PostingScreen] Validation failed: No item type selected');
      newErrors.type = "Please select an item type";
    }
    
    if (!description.trim()) {
      console.log('[PostingScreen] Validation failed: Description is empty');
      newErrors.description = "Description is required";
    } else if (description.length < 10) {
      console.log('[PostingScreen] Validation failed: Description is too short:', description.length);
      newErrors.description = "Please provide a more detailed description (at least 10 characters)";
    }
    
    if (isSell && !price.trim()) {
      console.log('[PostingScreen] Validation failed: Price is empty');
      newErrors.price = "Price is required for items you want to sell";
    } else if (isSell && isNaN(Number(price))) {
      console.log('[PostingScreen] Validation failed: Price is not a number:', price);
      newErrors.price = "Price must be a number";
    }
    
    if (!selectedCondition) {
      console.log('[PostingScreen] Validation failed: No condition selected');
      newErrors.condition = "Please select the item condition";
    }
    
    if (images.length === 0) {
      console.log('[PostingScreen] Validation failed: No images uploaded');
      newErrors.images = "Please upload at least one image";
    }
    
    const isValid = Object.keys(newErrors).length === 0;
    console.log('[PostingScreen] Form validation result:', isValid ? 'PASSED' : 'FAILED');
    if (!isValid) {
      console.log('[PostingScreen] Validation errors:', JSON.stringify(newErrors));
    }
    
    setErrors(newErrors);
    return isValid;
  }, [title, selectedType, description, price, selectedCondition, images, isSell]);

  // Implement the modified post item function that handles uploads first, then creates product
  const handlePostItem = useCallback(async () => {
    console.log('[PostingScreen] Starting product posting process');
    
    if (!validateForm()) {
      console.log('[PostingScreen] Form validation failed');
      
      // Show validation errors to the user
      const errorMessages = Object.entries(errors)
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
    
    if (!user?.email) {
      console.error('[PostingScreen] User email not available');
      Alert.alert('Error', 'You must be logged in to post an item');
      return;
    }
    
    console.log('[PostingScreen] Form data validated, proceeding with upload');
    console.log('[PostingScreen] Images to upload:', selectedImagesRef.current.length);
    console.log('[PostingScreen] Product data:', JSON.stringify({
      title,
      category: selectedType?.id,
      subcategory: selectedSubcategory || '',
      description: description.length > 50 ? description.substring(0, 50) + '...' : description,
      price,
      email: user.email,
      sellerName: user.name || user.username || 'Anonymous User',
      city: user.city || '',
      zipcode: user.zipcode || '',
      university: user.university || '',
      productage: selectedCondition?.id,
      sellingtype: isSell ? 'sell' : 'rent'
    }));
    
    setIsLoading(true);
    setUploadProgress(10);
    
    try {
      if (!selectedImagesRef.current.length) {
        throw new Error('No images to upload');
      }
      
      // Step 1: Upload images to get filenames
      console.log('[PostingScreen] Starting image upload to server...');
      let imageFileNames: string[] = [];
      
      try {
        const uploadResponse = await uploadProductImages(selectedImagesRef.current);
        console.log('[PostingScreen] Image upload response:', JSON.stringify(uploadResponse));
        setUploadProgress(50);
        
        if (!uploadResponse || !uploadResponse.fileNames || uploadResponse.fileNames.length === 0) {
          console.error('[PostingScreen] Upload response missing filenames:', uploadResponse);
          throw new Error('Failed to upload images - no filenames returned');
        }
        
        // Store the filenames (not URLs) returned from the API
        imageFileNames = uploadResponse.fileNames;
        console.log('[PostingScreen] Uploaded image filenames:', imageFileNames);
        
        // Log the image filenames for verification
        console.log('[PostingScreen] Image filenames for product creation:');
        imageFileNames.forEach(filename => {
          console.log(`- ${filename}`);
        });
        
        // Add S3 base URL to each image filename
        const fullImageUrls = imageFileNames.map(filename => `${S3_BASE_URL}${filename}`);
        
        // Step 2: Create the product with the uploaded image filenames WITH the S3 base URL
        const productData = {
          name: title,
          category: selectedType?.id || '',
          subcategory: selectedSubcategory || '',
          description: description,
          price: price,
          email: user.email,
          sellerName: user.name || user.username || 'Anonymous User',
          city: user.city || '',
          zipcode: user.zipcode || '',
          university: user.university || '',
          productage: selectedCondition?.id || '',
          sellingtype: isSell ? 'sell' : 'rent',
          imageFilenames: fullImageUrls,  // Send full URLs including S3 base URL
          allImages: fullImageUrls,
          primaryImage: fullImageUrls.length > 0 ? fullImageUrls[0] : ''  // Use empty string instead of null
        };
        
        console.log('[PostingScreen] Creating product with data:', JSON.stringify(productData));
        setUploadProgress(80);
        
        // Create the product with the image filenames
        try {
          const createdProduct = await createProductWithImageFilenames(productData);
          console.log('[PostingScreen] Product created successfully:', JSON.stringify(createdProduct));
          
          // Clear the images reference after successful upload
          selectedImagesRef.current = [];
          
          setUploadProgress(100);
          setIsLoading(false);
          
          // Log the product with image URLs
          console.log('[PostingScreen] Created product with image URLs:');
          console.log(JSON.stringify({
            id: createdProduct.id,
            name: createdProduct.name,
            primaryImage: createdProduct.primaryImage,
            images: createdProduct.images
          }));
          
          // Show success message
          Alert.alert(
            "Success",
            "Your item has been posted successfully!",
            [{ text: "OK", onPress: () => {
              console.log('[PostingScreen] Navigating back after successful post');
              navigation.goBack();
            }}]
          );
        } catch (productError) {
          console.error('[PostingScreen] Product creation error:', productError);
          setIsLoading(false);
          
          // Log the image filenames for debugging
          console.log('[PostingScreen] Image filenames that were sent:');
          imageFileNames.forEach(filename => {
            console.log(`- ${filename}`);
          });
          
          Alert.alert(
            "Error Creating Listing",
            productError instanceof Error 
              ? `Failed to create product: ${productError.message}` 
              : "Failed to create product. Please try again."
          );
        }
      } catch (uploadError) {
        console.error('[PostingScreen] Image upload error:', uploadError);
        setIsLoading(false);
        Alert.alert(
          "Image Upload Failed",
          uploadError instanceof Error 
            ? `Failed to upload images: ${uploadError.message}` 
            : "Failed to upload images. Please check your connection and try again."
        );
      }
    } catch (error) {
      setIsLoading(false);
      console.error('[PostingScreen] Error posting item:', error);
      
      // Log more details about the error
      if (error instanceof Error) {
        console.error('[PostingScreen] Error name:', error.name);
        console.error('[PostingScreen] Error message:', error.message);
        console.error('[PostingScreen] Error stack:', error.stack);
      }
      
      Alert.alert(
        "Error",
        error instanceof Error 
          ? `Failed to post item: ${error.message}` 
          : "Failed to post item: Unknown error"
      );
    }
  }, [validateForm, title, selectedType, description, price, user, selectedCondition, isSell, navigation, errors, selectedSubcategory]);

  // Render individual type option with icon
  const renderTypeOptionItem = ({ item }: { item: ProductType }) => (
    <TouchableOpacity 
      style={[
        styles.optionItem, 
        selectedType?.id === item.id && styles.selectedOption,
        { backgroundColor: selectedType?.id === item.id ? `${item.color}20` : theme.colors.surface }
      ]}
      onPress={() => selectType(item)}
    >
      <View style={[
        styles.iconContainer, 
        { 
          backgroundColor: item.color,
          borderRadius: 27.5,
          padding: 8,
          width: 55,
          height: 55,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
          elevation: 5,
        }
      ]}>
        {item.iconType === 'material' && <MaterialIcons name={item.icon} size={24} color="black" />}
        {item.iconType === 'fontawesome' && <Icon name={item.icon} size={24} color="black" />}
        {item.iconType === 'entypo' && <Entypoicon name={item.icon} size={24} color="black" />}
      </View>
      <Text style={[
        styles.optionText, 
        { color: theme.colors.text },
        selectedType?.id === item.id && { fontWeight: 'bold' }
      ]}>
        {item.name}
      </Text>
      {selectedType?.id === item.id && (
        <Icon name="check" size={18} color={item.color} style={styles.checkIcon} />
      )}
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.contentContainer}>
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => navigation.goBack()}
            >
              <Icon name="chevron-left" size={20} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Upload Item</Text>
            <View style={styles.headerSpacer} />
          </View>
          
          {/* Enhanced Photo Upload Section */}
          <View style={styles.sectionWrapper}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  Photos {errors.images && <Text style={styles.errorText}>({errors.images})</Text>}
                </Text>
                <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
                  Add up to 5 photos to showcase your item
                </Text>
              </View>
              <Text style={[styles.photoCount, { color: theme.colors.primary }]}>
                {images.length}/5
              </Text>
            </View>
            
            <View style={styles.photoGalleryContainer}>
              {/* Main photo upload button */}
              {images.length === 0 ? (
                <TouchableOpacity 
                  style={[styles.mainPhotoButton, { borderColor: theme.colors.border }]} 
                  onPress={handleImageUpload}
                >
                  <View style={styles.addImageIconContainer}>
                    <Icon name="camera" size={28} color={theme.colors.primary} />
                    <Text style={[styles.mainPhotoText, { color: theme.colors.text }]}>
                      Add Main Photo
                    </Text>
                    <Text style={[styles.photoTip, { color: theme.colors.textSecondary }]}>
                      This will be the cover image
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={styles.mainPhotoWrapper}>
                  <Image 
                    source={{ uri: localImageUris[0] }} 
                    style={styles.mainPhoto} 
                    resizeMode="cover"
                  />
                  <TouchableOpacity 
                    style={styles.removeMainPhotoButton}
                    onPress={() => handleRemoveImage(0)}
                  >
                    <Icon name="trash" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                  <View style={styles.mainPhotoLabel}>
                    <Text style={styles.mainPhotoLabelText}>Main Photo</Text>
                  </View>
                </View>
              )}
              
              {/* Additional photos row */}
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.additionalPhotosContainer}
              >
                {localImageUris.slice(1).map((imageUri, index) => (
                  <View key={index} style={styles.thumbnailWrapper}>
                    <Image source={{ uri: imageUri }} style={styles.thumbnailImage} />
                    <TouchableOpacity 
                      style={styles.removeThumbnailButton}
                      onPress={() => handleRemoveImage(index + 1)}
                    >
                      <Icon name="times" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
                
                {images.length > 0 && images.length < 5 && (
                  <TouchableOpacity 
                    style={[styles.addThumbnailButton, { borderColor: theme.colors.border }]} 
                    onPress={handleImageUpload}
                  >
                    <Icon name="plus" size={20} color={theme.colors.primary} />
                  </TouchableOpacity>
                )}
              </ScrollView>
              
              {/* Photo upload tips */}
              {images.length === 0 && (
                <View style={styles.photoTipsContainer}>
                  <View style={styles.photoTipRow}>
                    <Icon name="check-circle" size={14} color={theme.colors.primary} style={styles.tipIcon} />
                    <Text style={[styles.photoTipText, { color: theme.colors.textSecondary }]}>
                      Use good lighting and clean background
                    </Text>
                  </View>
                  <View style={styles.photoTipRow}>
                    <Icon name="check-circle" size={14} color={theme.colors.primary} style={styles.tipIcon} />
                    <Text style={[styles.photoTipText, { color: theme.colors.textSecondary }]}>
                      Include multiple angles
                    </Text>
                  </View>
                  <View style={styles.photoTipRow}>
                    <Icon name="check-circle" size={14} color={theme.colors.primary} style={styles.tipIcon} />
                    <Text style={[styles.photoTipText, { color: theme.colors.textSecondary }]}>
                      Show any defects or wear
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
          
          {/* Sell/Rent Toggle Section */}
          <View style={styles.sectionWrapper}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Listing Type</Text>
            <View style={styles.toggleWrapper}>
              <View style={styles.toggleContainer}>
                <TouchableOpacity 
                  style={[
                    styles.toggleButton, 
                    { backgroundColor: isSell ? '#f7b305' : 'transparent' }
                  ]} 
                  onPress={() => setIsSell(true)}
                >
                  <Text style={[
                    styles.toggleText, 
                    { color: isSell ? '#FFFFFF' : theme.colors.text }
                  ]}>
                    Sell
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.toggleButton, 
                    { backgroundColor: !isSell ? '#f7b305' : 'transparent' }
                  ]} 
                  onPress={() => setIsSell(false)}
                >
                  <Text style={[
                    styles.toggleText, 
                    { color: !isSell ? '#FFFFFF' : theme.colors.text }
                  ]}>
                    Rent
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          
          {/* Item Details Section */}
          <View style={styles.sectionWrapper}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Item Details</Text>
            
            <TextInput
              label="Title"
              value={title}
              onChangeText={(text) => {
                setTitle(text);
                if (errors.title) {
                  setErrors(prev => ({...prev, title: undefined}));
                }
              }}
              placeholder="Enter item title"
              containerStyle={styles.inputContainer}
              error={errors.title}
            />
            
            {/* Type Dropdown */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                Type {errors.type && <Text style={styles.errorText}>({errors.type})</Text>}
              </Text>
              <TouchableOpacity 
                style={[
                  styles.dropdown, 
                  { 
                    borderColor: errors.type ? '#e74c3c' : theme.colors.border, 
                    backgroundColor: theme.colors.surface 
                  }
                ]} 
                onPress={() => setTypeModalVisible(true)}
              >
                <Text style={[styles.dropdownText, { 
                  color: displayType ? theme.colors.text : theme.colors.textSecondary 
                }]}>
                  {displayType || "Select item type"}
                </Text>
                <Icon name="chevron-down" size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            {/* Subcategory Dropdown - Only shown if selected type has subcategories */}
            {hasSubcategories && selectedType && (
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: theme.colors.text }]}>Subcategory</Text>
                <TouchableOpacity 
                  style={[styles.dropdown, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]} 
                  onPress={() => setSubcategoryModalVisible(true)}
                >
                  <Text style={[styles.dropdownText, { 
                    color: displaySubcategory ? theme.colors.text : theme.colors.textSecondary 
                  }]}>
                    {displaySubcategory || `Select ${selectedType.name.toLowerCase()} subcategory`}
                  </Text>
                  <Icon name="chevron-down" size={16} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}
            
            <TextInput
              label="Description"
              value={description}
              onChangeText={(text) => {
                setDescription(text);
                if (errors.description) {
                  setErrors(prev => ({...prev, description: undefined}));
                }
              }}
              placeholder="Describe your item (condition, features, etc.)"
              multiline
              textAlignVertical="top"
              containerStyle={styles.textAreaContainer}
              inputStyle={styles.textArea}
              error={errors.description}
            />
          </View>
          
          {/* Pricing & Condition Section */}
          <View style={styles.sectionWrapper}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Pricing & Condition</Text>
            
            <TextInput
              label={`Price${isSell ? '' : ' (per day)'}`}
              value={price}
              onChangeText={(text) => {
                setPrice(text);
                if (errors.price) {
                  setErrors(prev => ({...prev, price: undefined}));
                }
              }}
              placeholder={`Enter price in $${isSell ? '' : ' per day'}`}
              keyboardType="numeric"
              containerStyle={styles.inputContainer}
              error={errors.price}
            />
            
            {/* Condition Dropdown */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                Condition {errors.condition && <Text style={styles.errorText}>({errors.condition})</Text>}
              </Text>
              <TouchableOpacity 
                style={[
                  styles.dropdown, 
                  { 
                    borderColor: errors.condition ? '#e74c3c' : theme.colors.border, 
                    backgroundColor: theme.colors.surface 
                  }
                ]} 
                onPress={() => setConditionModalVisible(true)}
              >
                <Text style={[styles.dropdownText, { 
                  color: displayCondition ? theme.colors.text : theme.colors.textSecondary 
                }]}>
                  {displayCondition || "Select item condition"}
                </Text>
                <Icon name="chevron-down" size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              {selectedCondition && (
                <Text style={[styles.conditionDescription, { color: theme.colors.textSecondary }]}>
                  {selectedCondition.description}
                </Text>
              )}
            </View>
          </View>
          
          {/* Post Button with Progress */}
          <TouchableOpacity 
            style={[
              styles.button, 
              { 
                backgroundColor: isLoading ? 'rgba(247, 179, 5, 0.7)' : '#f7b305',
                opacity: isLoading ? 0.8 : 1
              }
            ]}
            activeOpacity={0.7}
            onPress={handlePostItem}
            disabled={isLoading}
          >
            {isLoading ? (
              <View style={styles.uploadProgressContainer}>
                <ActivityIndicator color="#FFFFFF" size="small" style={styles.uploadingIndicator} />
                <Text style={[styles.uploadingText, { color: '#FFFFFF' }]}>
                  {uploadProgress < 50 ? "Uploading images..." : 
                   uploadProgress < 90 ? "Creating listing..." : "Almost done..."}
                </Text>
              </View>
            ) : (
              <View style={styles.buttonContent}>
                <Icon name="check" size={18} color="#FFFFFF" style={styles.buttonIcon} />
                <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
                  Post Item
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Type Selection Modal */}
      <Modal
        visible={typeModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setTypeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Select Item Type</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setTypeModalVisible(false)}
              >
                <Icon name="times" size={22} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={PRODUCT_TYPES}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderTypeOptionItem}
            />
          </View>
        </View>
      </Modal>

      {/* Subcategory Selection Modal */}
      {selectedType && selectedType.subcategories && (
        <Modal
          visible={subcategoryModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setSubcategoryModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                  Select {selectedType.name} Subcategory
                </Text>
                <TouchableOpacity 
                  style={styles.modalCloseButton}
                  onPress={() => setSubcategoryModalVisible(false)}
                >
                  <Icon name="times" size={22} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={selectedType.subcategories}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={[styles.optionItem, { 
                      backgroundColor: selectedSubcategory === item ? theme.colors.primaryLight : 'transparent'
                    }]}
                    onPress={() => selectSubcategory(item)}
                  >
                    <Text style={[styles.optionText, { color: theme.colors.text }]}>{item}</Text>
                    {selectedSubcategory === item && (
                      <Icon name="check" size={16} color={theme.colors.primary} />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Condition Selection Modal */}
      <Modal
        visible={conditionModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setConditionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Select Condition</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setConditionModalVisible(false)}
              >
                <Icon name="times" size={22} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={PRODUCT_CONDITIONS}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.optionItem, { 
                    backgroundColor: selectedCondition?.id === item.id ? theme.colors.primaryLight : 'transparent'
                  }]}
                  onPress={() => selectCondition(item)}
                >
                  <View style={styles.conditionOption}>
                    <Text style={[styles.optionText, { color: theme.colors.text }]}>{item.name}</Text>
                    <Text style={[styles.optionDescription, { color: theme.colors.textSecondary }]}>
                      {item.description}
                    </Text>
                  </View>
                  {selectedCondition?.id === item.id && (
                    <Icon name="check" size={16} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  contentContainer: {
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backButton: {
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: -0.3,
  },
  headerSpacer: {
    width: 35, // Same width as back button to ensure title stays centered
  },
  sectionWrapper: {
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 18,
  },
  photoCount: {
    fontSize: 15,
    fontWeight: '600',
  },
  photoGalleryContainer: {
    marginTop: 4,
  },
  mainPhotoButton: {
    width: '100%',
    height: 180,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.02)',
    marginBottom: 14,
  },
  addImageIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainPhotoText: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 4,
  },
  photoTip: {
    fontSize: 13,
  },
  mainPhotoWrapper: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 14,
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  mainPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  removeMainPhotoButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainPhotoLabel: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  mainPhotoLabelText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  additionalPhotosContainer: {
    flexDirection: 'row',
    paddingBottom: 8,
  },
  thumbnailWrapper: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 10,
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeThumbnailButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addThumbnailButton: {
    width: 80,
    height: 80,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  photoTipsContainer: {
    marginTop: 12,
    marginBottom: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  photoTipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  tipIcon: {
    marginRight: 8,
  },
  photoTipText: {
    fontSize: 13,
    lineHeight: 18,
  },
  toggleWrapper: {
    alignItems: 'center',
    marginTop: 8,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 3,
    width: '70%',
  },
  toggleButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleText: {
    fontWeight: '600',
    fontSize: 15,
  },
  inputContainer: {
    marginBottom: 16,
  },
  textAreaContainer: {
    marginBottom: 16,
  },
  textArea: {
    height: 120,
    paddingTop: 12,
    fontSize: 15,
    textAlignVertical: 'top',
    borderRadius: 10,
  },
  button: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 30,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.2,
  },
  label: {
    marginBottom: 8,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  dropdown: {
    height: 48,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownText: {
    fontSize: 15,
  },
  conditionDescription: {
    marginTop: 6,
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
    paddingHorizontal: 3,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: 24,
    maxHeight: '70%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: -0.3,
  },
  modalCloseButton: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    marginVertical: 2,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  optionDescription: {
    fontSize: 13,
    marginTop: 3,
    opacity: 0.7,
    lineHeight: 17,
  },
  conditionOption: {
    flex: 1,
  },
  errorText: {
    color: '#e74c3c',
    fontWeight: 'normal',
    fontSize: 13,
  },
  uploadProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadingIndicator: {
    marginRight: 10,
  },
  uploadingText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  iconContainer: {
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedOption: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  checkIcon: {
    marginLeft: 10,
  },
});

export default PostingScreen; 