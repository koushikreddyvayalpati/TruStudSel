/**
 * Import statements
 */
import React, { useCallback, memo, useEffect } from 'react';
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
  Alert,
  Dimensions,
  SafeAreaView,
  Linking,
  PermissionsAndroid,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Entypoicon from 'react-native-vector-icons/Entypo';
import { PostingScreenProps } from '../../types/navigation.types';
import { useTheme } from '../../hooks';
import { TextInput } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import { launchImageLibrary } from 'react-native-image-picker';
import LinearGradient from 'react-native-linear-gradient';

// Import the Zustand store
import usePostingStore, { ProductType, ProductCondition } from '../../store/postingStore';

// Get device dimensions for responsive layout
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const THUMBNAIL_SIZE = SCREEN_WIDTH > 400 ? 85 : 75;
const MAIN_PHOTO_HEIGHT = SCREEN_WIDTH * 0.5;

// Updated product types with main categories matching ProductsScreen and using consistent icons
const PRODUCT_TYPES: ProductType[] = [
  {
    id: 'electronics',
    name: 'Electronics',
    icon: 'game-controller',
    iconType: 'entypo',
    color: '#f7b305',
    subcategories: ['Laptops', 'Phones', 'Tablets', 'Accessories', 'Audio', 'Other'],
  },
  {
    id: 'furniture',
    name: 'Furniture',
    icon: 'bed',
    iconType: 'fontawesome',
    color: '#f7b305',
    subcategories: ['Desks', 'Chairs', 'Storage', 'Lamps', 'Bedroom', 'Other'],
  },
  {
    id: 'auto',
    name: 'Auto',
    icon: 'directions-car',
    iconType: 'material',
    color: '#f7b305',
    subcategories: ['Parts', 'Accessories', 'Tools', 'Other'],
  },
  {
    id: 'fashion',
    name: 'Fashion',
    icon: 'shopping-bag',
    iconType: 'fontawesome',
    color: '#f7b305',
    subcategories: ['Tops', 'Bottoms', 'Outerwear', 'Shoes', 'Accessories', 'Other'],
  },
  {
    id: 'sports',
    name: 'Sports',
    icon: 'sports-cricket',
    iconType: 'material',
    color: '#f7b305',
    subcategories: ['Fitness', 'Team Sports', 'Outdoor', 'Other'],
  },
  {
    id: 'stationery',
    name: 'Stationery',
    icon: 'book',
    iconType: 'material',
    color: '#f7b305',
    subcategories: ['Notebooks', 'Writing Tools', 'Organization', 'Art Supplies', 'Other'],
  },
  {
    id: 'eventpass',
    name: 'Event Pass',
    icon: 'ticket',
    iconType: 'fontawesome',
    color: '#f7b305',
    subcategories: ['Sports', 'Concerts', 'Campus Events', 'Other'],
  },
  {
    id: 'textbooks',
    name: 'Textbooks',
    icon: 'book',
    iconType: 'material',
    color: '#f7b305',
    subcategories: ['Science & Math', 'Humanities', 'Business', 'Engineering', 'Other'],
  },
  {
    id: 'other',
    name: 'Other',
    icon: 'question',
    iconType: 'fontawesome',
    color: '#f7b305',
  },
];

// Enhanced product conditions with descriptions for better user guidance
const PRODUCT_CONDITIONS: ProductCondition[] = [
  {
    id: 'brand-new',
    name: 'Brand New',
    description: 'Unused, with original packaging or tags',
  },
  {
    id: 'like-new',
    name: 'Like New',
    description: 'Used once or twice, in perfect condition',
  },
  {
    id: 'very-good',
    name: 'Very Good',
    description: 'Light use with minor signs of wear',
  },
  {
    id: 'good',
    name: 'Good',
    description: 'Some signs of wear but functions perfectly',
  },
  {
    id: 'acceptable',
    name: 'Acceptable',
    description: 'Noticeable wear but fully functional',
  },
  {
    id: 'for-parts',
    name: 'For Parts',
    description: 'Not fully functional, for repair or parts only',
  },
];

// Type definition for photo placeholder props
type PhotoPlaceholderProps = {
  onPress: () => void;
  theme: {
    colors: {
      text: string;
      textSecondary: string;
      border: string;
    };
  };
};

// Type definition for image component props
type PhotoProps = {
  uri: string;
  onRemove: () => void;
};

// Photo components moved outside of the main component
const PhotoTips = memo(() => (
  <View style={styles.photoTipsContainer}>
    <View style={styles.photoTipRow}>
      <Icon name="check-circle" size={14} color="#f7b305" style={styles.tipIcon} />
      <Text style={[styles.photoTipText, { color: 'rgba(0,0,0,0.6)' }]}>
        Use good lighting and clean background
      </Text>
    </View>
    <View style={styles.photoTipRow}>
      <Icon name="check-circle" size={14} color="#f7b305" style={styles.tipIcon} />
      <Text style={[styles.photoTipText, { color: 'rgba(0,0,0,0.6)' }]}>
        Include multiple angles
      </Text>
    </View>
    <View style={styles.photoTipRow}>
      <Icon name="check-circle" size={14} color="#f7b305" style={styles.tipIcon} />
      <Text style={[styles.photoTipText, { color: 'rgba(0,0,0,0.6)' }]}>
        Show any defects or wear
      </Text>
    </View>
  </View>
));

const MainPhotoPlaceholder = memo(({ onPress, theme }: PhotoPlaceholderProps) => (
  <TouchableOpacity
    style={[styles.mainPhotoButton, {
      borderColor: 'rgba(247, 179, 5, 0.4)',
      backgroundColor: 'rgba(247, 179, 5, 0.05)',
    }]}
    onPress={onPress}
    activeOpacity={0.7}
    accessible={true}
    accessibilityLabel="Add main photo"
    accessibilityHint="Opens image picker to select main photo"
  >
    <View style={styles.addImageIconContainer}>
      <View style={styles.cameraIconOuter}>
        <View style={styles.cameraIconCircle}>
          <Icon name="camera" size={28} color="#f7b305" />
        </View>
      </View>
      <Text style={[styles.mainPhotoText, { color: theme.colors.text }]}>
        Add Main Photo
      </Text>
      <Text style={[styles.photoTip, { color: theme.colors.textSecondary }]}>
        This will be the cover image
      </Text>
      <View style={styles.photoUpgradeBadge}>
        <LinearGradient
          colors={['#f7b305', '#f59000']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.photoUpgradeBadgeGradient}
        >
          <Icon name="image" size={12} color="#ffffff" style={{marginRight: 6}} />
          <Text style={styles.photoUpgradeBadgeText}>Better pics = faster sales</Text>
        </LinearGradient>
      </View>
    </View>
  </TouchableOpacity>
));

const MainPhoto = memo(({ uri, onRemove }: PhotoProps) => (
  <View style={styles.mainPhotoWrapper}>
    <Image
      source={{ uri }}
      style={styles.mainPhoto}
      resizeMode="cover"
      resizeMethod="resize"
      accessible={true}
      accessibilityLabel="Main product photo"
    />
    <TouchableOpacity
      style={styles.removeMainPhotoButton}
      onPress={onRemove}
      hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
      accessible={true}
      accessibilityLabel="Remove main photo"
    >
      <Icon name="trash" size={16} color="#FFFFFF" />
    </TouchableOpacity>
    <View style={styles.mainPhotoLabel}>
      <Text style={styles.mainPhotoLabelText}>Main Photo</Text>
    </View>
  </View>
));

const ThumbnailPhoto = memo(({ uri, onRemove }: PhotoProps) => (
  <View style={styles.thumbnailWrapper}>
    <Image
      source={{ uri }}
      style={styles.thumbnailImage}
      resizeMethod="resize"
      accessible={true}
      accessibilityLabel="Product photo thumbnail"
    />
    <TouchableOpacity
      style={styles.removeThumbnailButton}
      onPress={onRemove}
      hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
      accessible={true}
      accessibilityLabel="Remove this photo"
    >
      <Icon name="times" size={14} color="#FFFFFF" />
    </TouchableOpacity>
  </View>
));

const PostingScreen: React.FC<PostingScreenProps> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { user } = useAuth();

  // Get userUniversity from route params with enhanced validation
  const routeParams = route.params || {};
  const routeUniversity = typeof routeParams.userUniversity === 'string' ? routeParams.userUniversity : '';
  const routeCity = typeof routeParams.userCity === 'string' ? routeParams.userCity : '';

  // console.log('[PostingScreen] Route params:', JSON.stringify(routeParams));
  // console.log('[PostingScreen] Route university:', routeUniversity);
  // console.log('[PostingScreen] Route city:', routeCity);
  // console.log('[PostingScreen] User university from auth:', user?.university || 'not set');
  // console.log('[PostingScreen] User city from auth:', user?.city || 'not set');

  // Use the Zustand store for state management
  const {
    // Form state
    images,
    localImageUris,
    title,
    selectedType,
    selectedSubcategory,
    description,
    price,
    selectedCondition,
    isSell,
    isLoading,
    uploadProgress,
    errors,

    // UI state
    typeModalVisible,
    subcategoryModalVisible,
    conditionModalVisible,

    // Computed values

    displayCondition,

    // Context
    setUniversityToUse,
    setCityToUse,

    // Actions
    setTitle,
    setSelectedType,
    setSelectedSubcategory,
    setDescription,
    setPrice,
    setSelectedCondition,
    setIsSell,

    // Modal actions
    setTypeModalVisible,
    setSubcategoryModalVisible,
    setConditionModalVisible,

    // Image handling
    addImage,
    removeImage,

    // Posting functionality
    postItem,

    // Reset state
    resetState,
  } = usePostingStore();
  // Set university and city from route params
  useEffect(() => {
    setUniversityToUse(routeUniversity || 'University not provided');
    setCityToUse(routeCity || 'City not provided');
  }, [routeUniversity, routeCity, setUniversityToUse, setCityToUse]);

  // Debug log of navigation params when component mounts
  useEffect(() => {
    // console.log('[PostingScreen] Component mounted with route params:', JSON.stringify(route.params));
    // console.log('[PostingScreen] User object available:', user ? 'yes' : 'no');
    if (user) {
      // console.log('[PostingScreen] User university from user object:', user.university || 'not set');
    }

    // Reset the store state when component mounts
    resetState();
  }, [route.params, user, resetState]);

  // Real image picker implementation - now uses the store's addImage function
  const handleImageUpload = useCallback(async () => {
    console.log('[PostingScreen] Starting image selection process');
    if (images.length >= 5) {
      console.log('[PostingScreen] Maximum images limit reached');
      Alert.alert('Maximum Images', 'You can upload up to 5 images');
      return;
    }

    try {
      console.log('[PostingScreen] Requesting permissions and launching image library picker');
      
      // On Android, we need to explicitly request permissions before using the image picker
      if (Platform.OS === 'android') {
        // For Android 13+ (API level 33+)
        if (Platform.Version >= 33) {
          const permission = PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES;
          const hasPermission = await PermissionsAndroid.check(permission);
          
          if (!hasPermission) {
            const status = await PermissionsAndroid.request(permission, {
              title: "Photo Gallery Permission",
              message: "TruStudSel needs access to your photos " +
                "so you can upload product images.",
              buttonNeutral: "Ask Me Later",
              buttonNegative: "Cancel",
              buttonPositive: "OK"
            });
            
            if (status !== PermissionsAndroid.RESULTS.GRANTED) {
              console.log('[PostingScreen] Permission denied for accessing photos');
              Alert.alert(
                'Permission Required',
                'To upload photos, please allow access to your photo gallery in app settings.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Open Settings', 
                    onPress: () => Linking.openSettings()
                  }
                ]
              );
              return;
            }
          }
        } 
        // For Android 12 and below
        else {
          const permission = PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
          const hasPermission = await PermissionsAndroid.check(permission);
          
          if (!hasPermission) {
            const status = await PermissionsAndroid.request(permission, {
              title: "Photo Gallery Permission",
              message: "TruStudSel needs access to your photos " +
                "so you can upload product images.",
              buttonNeutral: "Ask Me Later",
              buttonNegative: "Cancel",
              buttonPositive: "OK"
            });
            
            if (status !== PermissionsAndroid.RESULTS.GRANTED) {
              console.log('[PostingScreen] Permission denied for accessing photos');
              Alert.alert(
                'Permission Required',
                'To upload photos, please allow access to your photo gallery in app settings.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Open Settings', 
                    onPress: () => Linking.openSettings()
                  }
                ]
              );
              return;
            }
          }
        }
      }
      
      // Launch image picker with options
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 1,
        maxWidth: 1200, // Limit image dimensions
        maxHeight: 1200, // Limit image dimensions
        includeBase64: false,
      });

      console.log('[PostingScreen] Image picker result:', JSON.stringify(result));

      if (result.didCancel) {
        console.log('[PostingScreen] Image selection canceled by user');
        return;
      }

      // Handle permission denied case
      if (result.errorCode === 'permission') {
        console.log('[PostingScreen] Permission denied for accessing photos');
        Alert.alert(
          'Permission Required',
          'To upload photos, please allow access to your photo library in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Open Settings', 
              onPress: () => {
                // Open app settings so user can enable permissions
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              } 
            }
          ]
        );
        return;
      }

      if (result.errorCode) {
        console.error('[PostingScreen] Image picker error:', result.errorCode, result.errorMessage);
        Alert.alert('Error', result.errorMessage || 'Failed to select image');
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
        fileSize: selected.fileSize,
      }));

      if (!selected.uri) {
        console.error('[PostingScreen] Selected image has no URI');
        Alert.alert('Error', 'Failed to get image');
        return;
      }

      // Check file size (limit to 5MB)
      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
      if (selected.fileSize && selected.fileSize > MAX_FILE_SIZE) {
        console.warn('[PostingScreen] Image too large:', selected.fileSize);
        Alert.alert(
          'Image Too Large',
          'The selected image exceeds the 5MB size limit. Please choose a smaller image or compress this one.',
          [
            { text: 'OK', style: 'default' },
          ]
        );
        return;
      }

      // Add the image to the store
      const newImage = {
        uri: selected.uri,
        type: selected.type || 'image/jpeg',
        name: selected.fileName || `image_${Date.now()}.jpg`,
        fileSize: selected.fileSize,
      };

      console.log('[PostingScreen] Adding new image to store:', JSON.stringify(newImage));
      addImage(newImage);

    } catch (error) {
      console.error('[PostingScreen] Error selecting image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  }, [images.length, addImage]);

  // Handle removing images - uses the store's removeImage function
  const handleRemoveImage = useCallback((index: number) => {
    removeImage(index);
  }, [removeImage]);

  // Select a product type - uses the store's setSelectedType function
  const selectType = useCallback((type: ProductType) => {
    setSelectedType(type);
    setTypeModalVisible(false);
  }, [setSelectedType, setTypeModalVisible]);

  // Select a subcategory - uses the store's setSelectedSubcategory function
  const selectSubcategory = useCallback((subcategory: string) => {
    setSelectedSubcategory(subcategory);
    setSubcategoryModalVisible(false);
  }, [setSelectedSubcategory, setSubcategoryModalVisible]);

  // Select a condition - uses the store's setSelectedCondition function
  const selectCondition = useCallback((condition: ProductCondition) => {
    setSelectedCondition(condition);
    setConditionModalVisible(false);
  }, [setSelectedCondition, setConditionModalVisible]);

  // Handle post item - uses the store's postItem function
  const handlePostItem = useCallback(() => {
    if (!user?.email) {
      Alert.alert('Error', 'You must be logged in to post an item');
      return;
    }

    postItem(
      user.email,
      user.name || user.username || 'Anonymous User',
      user.zipcode || '',
      () => navigation.goBack()
    );
  }, [user, postItem, navigation]);

  // Render individual type option with icon
  const renderTypeOptionItem = ({ item }: { item: ProductType }) => (
    <TouchableOpacity
      style={[
        styles.optionItem,
        selectedType?.id === item.id && styles.selectedOption,
        { backgroundColor: selectedType?.id === item.id ? `${item.color}20` : theme.colors.surface },
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
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
            },
            android: {
              elevation: 0,
              borderWidth: 1,
              borderColor: '#e0e0e0',
            },
          }),
        },
      ]}>
        {item.iconType === 'material' && <MaterialIcons name={item.icon} size={24} color="black" />}
        {item.iconType === 'fontawesome' && <Icon name={item.icon} size={24} color="black" />}
        {item.iconType === 'entypo' && <Entypoicon name={item.icon} size={24} color="black" />}
      </View>
      <Text style={[
        styles.optionText,
        { color: theme.colors.text },
        selectedType?.id === item.id && { fontWeight: 'bold' },
      ]}>
        {item.name}
      </Text>
      {selectedType?.id === item.id && (
        <Icon name="check" size={18} color={item.color} style={styles.checkIcon} />
      )}
    </TouchableOpacity>
  );

  // Memoized section headers for consistent styling
  const renderSectionHeader = useCallback((title: string, error?: string, subtitle?: string) => (
    <View style={styles.sectionHeaderRow}>
      <View>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          {title} {error && <Text style={styles.errorText}>({error})</Text>}
        </Text>
        {subtitle && (
          <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
            {subtitle}
          </Text>
        )}
      </View>
    </View>
  ), [theme.colors]);

  // Move PostButton component outside renderPhotoGallery
  const PostButton = useCallback(() => (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: isLoading ? 'rgba(247, 179, 5, 0.7)' : '#f7b305',
          opacity: isLoading ? 0.8 : 1,
        },
      ]}
      activeOpacity={0.7}
      onPress={handlePostItem}
      disabled={isLoading}
    >
      {isLoading ? (
        <View style={styles.uploadProgressContainer}>
          <ActivityIndicator color="#FFFFFF" size="small" style={styles.uploadingIndicator} />
          <Text style={[styles.uploadingText, { color: '#FFFFFF' }]}>
            {uploadProgress < 50 ? 'Uploading images...' :
             uploadProgress < 90 ? 'Creating listing...' : 'Almost done...'}
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
  ), [isLoading, uploadProgress, handlePostItem]);

  // Optimized photo gallery rendering
  const renderPhotoGallery = useCallback(() => (
    <View style={styles.photoGalleryContainer}>
      {/* Main photo upload button or first image */}
      {images.length === 0 ? (
        <MainPhotoPlaceholder onPress={handleImageUpload} theme={theme} />
      ) : (
        <MainPhoto uri={localImageUris[0]} onRemove={() => handleRemoveImage(0)} />
      )}

      {/* Additional photos row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.additionalPhotosContainer}
      >
        {localImageUris.slice(1).map((imageUri, index) => (
          <ThumbnailPhoto
            key={`thumb-${index}`}
            uri={imageUri}
            onRemove={() => handleRemoveImage(index + 1)}
          />
        ))}

        {images.length > 0 && images.length < 5 && (
          <TouchableOpacity
            style={[styles.addThumbnailButton, {
              borderColor: 'rgba(247, 179, 5, 0.3)',
              backgroundColor: 'rgba(247, 179, 5, 0.05)',
            }]}
            onPress={handleImageUpload}
            activeOpacity={0.7}
          >
            <Icon name="plus" size={20} color="#f7b305" />
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Photo upload tips */}
      {images.length === 0 && <PhotoTips />}
    </View>
  ), [localImageUris, images.length, theme, handleImageUpload, handleRemoveImage]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.contentContainer}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
                hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              >
                <Icon name="chevron-left" size={20} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Upload Item</Text>
              <View style={styles.headerSpacer} />
            </View>

            {/* Photo Upload Section */}
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
                <View style={styles.photoCountContainer}>
                  <Text style={styles.photoCount}>
                    {images.length}/5
                  </Text>
                </View>
              </View>

              {renderPhotoGallery()}
            </View>

            {/* Sell/Rent Toggle Section */}
            <View style={styles.sectionWrapper}>
              {renderSectionHeader('Listing Type')}
              <View style={styles.toggleWrapper}>
                <View style={styles.toggleContainer}>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      { backgroundColor: isSell ? '#f7b305' : 'transparent' },
                    ]}
                    onPress={() => setIsSell(true)}
                  >
                    <Text style={[
                      styles.toggleText,
                      { color: isSell ? '#FFFFFF' : theme.colors.text },
                    ]}>
                      Sell
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      { backgroundColor: !isSell ? '#f7b305' : 'transparent' },
                    ]}
                    onPress={() => setIsSell(false)}
                  >
                    <Text style={[
                      styles.toggleText,
                      { color: !isSell ? '#FFFFFF' : theme.colors.text },
                    ]}>
                      Rent
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Item Details Section */}
            <View style={styles.sectionWrapper}>
              {renderSectionHeader('Item Details')}

              <TextInput
                label="Title"
                value={title}
                onChangeText={setTitle}
                placeholder="Enter item title"
                containerStyle={styles.inputContainer}
                error={errors.title}
                maxLength={100}
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
                      backgroundColor: theme.colors.surface,
                      borderWidth: 1.5,
                    },
                    selectedType && { borderColor: '#f7b305', borderWidth: 2 },
                  ]}
                  onPress={() => setTypeModalVisible(true)}
                >
                  <Text style={[
                    styles.dropdownText,
                    {
                      color: selectedType ? theme.colors.text : theme.colors.textSecondary,
                      fontWeight: selectedType ? '600' : 'normal',
                    },
                  ]}>
                    {selectedType?.name || 'Select item type'}
                  </Text>
                  <Icon name="chevron-down" size={16} color={theme.colors.textSecondary} />
                </TouchableOpacity>
                {selectedType && (
                  <Text style={[styles.selectedSubcategoryNote, { color: '#f7b305' }]}>
                    {selectedType.name}
                  </Text>
                )}
              </View>

              {/* Subcategory Dropdown - Only shown if selected type has subcategories */}
              {selectedType && selectedType.subcategories && selectedType.subcategories.length > 0 && (
                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>Subcategory</Text>
                  <TouchableOpacity
                    style={[
                      styles.dropdown,
                      {
                        borderColor: theme.colors.border,
                        backgroundColor: theme.colors.surface,
                        borderWidth: 1.5,
                      },
                    ]}
                    onPress={() => setSubcategoryModalVisible(true)}
                  >
                    <Text style={[
                      styles.dropdownText,
                      {
                        color: selectedSubcategory ? theme.colors.text : theme.colors.textSecondary,
                        fontWeight: selectedSubcategory ? '500' : 'normal',
                      },
                    ]}>
                      {selectedSubcategory || `Select ${selectedType.name.toLowerCase()} subcategory`}
                    </Text>
                    <Icon name="chevron-down" size={16} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                  {selectedSubcategory && (
                    <Text style={[styles.selectedSubcategoryNote, { color: theme.colors.primary }]}>
                      {selectedType.name} → {selectedSubcategory}
                    </Text>
                  )}
                </View>
              )}

              <TextInput
                label="Description"
                value={description}
                onChangeText={setDescription}
                placeholder="Describe your item (condition, features, etc.)"
                multiline
                textAlignVertical="top"
                containerStyle={styles.textAreaContainer}
                inputStyle={styles.textArea}
                error={errors.description}
                maxLength={1000}
              />
            </View>

            {/* Pricing & Condition Section */}
            <View style={styles.sectionWrapper}>
              {renderSectionHeader('Pricing & Condition')}

              <TextInput
                label={`Price${isSell ? '' : ' (per day)'}`}
                value={price}
                onChangeText={setPrice}
                placeholder={`Enter price in $${isSell ? '' : ' per day'}`}
                keyboardType="numeric"
                containerStyle={styles.inputContainer}
                inputStyle={Platform.OS === 'android' ? {backgroundColor: 'white', borderColor: 'rgba(0,0,0,0.15)'} : {}}
                error={errors.price}
                maxLength={12}
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
                      backgroundColor: theme.colors.surface,
                      borderWidth: 1.5,
                    },
                  ]}
                  onPress={() => setConditionModalVisible(true)}
                >
                  <Text style={[
                    styles.dropdownText,
                    {
                      color: displayCondition ? theme.colors.text : theme.colors.textSecondary,
                      fontWeight: displayCondition ? '500' : 'normal',
                    },
                  ]}>
                    {selectedCondition?.name || 'Select item condition'}
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

            {/* Post Button */}
            <PostButton />
          </View>
        </ScrollView>
      </SafeAreaView>

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
                hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              >
                <Icon name="times" size={22} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={PRODUCT_TYPES}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderTypeOptionItem}
              initialNumToRender={6}
              maxToRenderPerBatch={10}
              windowSize={5}
              removeClippedSubviews={true}
            />
          </View>
        </View>
      </Modal>

      {/* Subcategory Selection Modal */}
      {selectedType && selectedType.subcategories && selectedType.subcategories.length > 0 && (
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
                  hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                >
                  <Icon name="times" size={22} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={selectedType.subcategories}
                keyExtractor={(item) => item}
                initialNumToRender={6}
                windowSize={5}
                removeClippedSubviews={true}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.optionItem, {
                      backgroundColor: selectedSubcategory === item ? theme.colors.primaryLight : 'transparent',
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
                hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              >
                <Icon name="times" size={22} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={PRODUCT_CONDITIONS}
              keyExtractor={(item) => item.id}
              initialNumToRender={6}
              windowSize={3}
              removeClippedSubviews={true}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.optionItem, {
                    backgroundColor: selectedCondition?.id === item.id ? theme.colors.primaryLight : 'transparent',
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
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  contentContainer: {
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 5 : 30,
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
    borderRadius: 10,
    ...Platform.select({
      ios: {
        backgroundColor: '',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        marginTop: 10,
        backgroundColor: '',
        elevation: 0,
        borderWidth: 0,
      },
    }),
  },
  headerTitle: {
    fontSize: SCREEN_WIDTH > 400 ? 22 : 20,
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
    paddingTop: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 0,
        borderWidth: 1,
        borderColor: '#e0e0e0',
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
    fontSize: SCREEN_WIDTH > 400 ? 18 : 17,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 2,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 18,
    opacity: 0.7,
  },
  photoCountContainer: {
    backgroundColor: '#f7b305',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 4,
  },
  photoCount: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
  photoGalleryContainer: {
    marginTop: 4,
  },
  mainPhotoButton: {
    width: '100%',
    height: MAIN_PHOTO_HEIGHT,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  cameraIconOuter: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(247, 179, 5, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#f7b305',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
      },
      android: {
        elevation: 0,
        borderWidth: 1,
        borderColor: '#e0e0e0',
      },
    }),
  },
  cameraIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(247, 179, 5, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(247, 179, 5, 0.3)',
    ...Platform.select({
      ios: {
        shadowColor: '#f7b305',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 0,
        borderWidth: 1,
        borderColor: '#e0e0e0',
      },
    }),
  },
  addImageIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    width: '100%',
  },
  mainPhotoText: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  photoTip: {
    fontSize: 14,
  },
  photoUpgradeBadge: {
    marginTop: 12,
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  photoUpgradeBadgeGradient: {
    flexDirection: 'row',
    paddingHorizontal: 2,
    paddingVertical: 0,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: SCREEN_WIDTH * 0.60, // Responsive width based on screen width instead of fixed percentage
  },
  photoUpgradeBadgeText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginRight: 10,
    ...Platform.select({
      ios: {
        fontSize: 14,
      },
    }),
  },
  mainPhotoWrapper: {
    width: '100%',
    height: MAIN_PHOTO_HEIGHT,
    borderRadius: 16,
    marginBottom: 14,
    position: 'relative',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 0,
        borderWidth: 1,
        borderColor: '#e0e0e0',
      },
    }),
  },
  mainPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  removeMainPhotoButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  mainPhotoLabel: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: '#f7b305',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  mainPhotoLabelText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  additionalPhotosContainer: {
    flexDirection: 'row',
    paddingBottom: 12,
  },
  thumbnailWrapper: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: 12,
    marginRight: 12,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'white',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  removeThumbnailButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  addThumbnailButton: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoTipsContainer: {
    marginTop: 14,
    marginBottom: 8,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(247, 179, 5, 0.2)',
    backgroundColor: 'rgba(247, 179, 5, 0.03)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  photoTipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipIcon: {
    marginRight: 10,
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
    ...Platform.select({
      android: {
        shadowColor: 'transparent',
        elevation: 0,
      },
    }),
  },
  textAreaContainer: {
    marginBottom: 16,
    ...Platform.select({
      android: {
        shadowColor: 'transparent',
        elevation: 0,
      },
    }),
  },
  textArea: {
    height: 120,
    paddingTop: 12,
    fontSize: 15,
    textAlignVertical: 'top',
    borderRadius: 10,
  },
  button: {
    height: 54,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 0,
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
    fontSize: SCREEN_WIDTH > 400 ? 16 : 15,
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
    ...Platform.select({
      ios: {},
      android: {
        borderColor: 'rgba(0,0,0,0.15)',
        elevation: 0,
        backgroundColor: 'white',
        shadowColor: 'transparent',
      },
    }),
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
    opacity: 0.7,
    ...Platform.select({
      android: {
        paddingHorizontal: 5,
        paddingVertical: 3,
        backgroundColor: 'rgba(247, 179, 5, 0.05)',
        borderRadius: 4,
      },
    }),
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
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '80%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 0,
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
    padding: 8,
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
  selectedSubcategoryNote: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '500',
  },
});

export default PostingScreen;
