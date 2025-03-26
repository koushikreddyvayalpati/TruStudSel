import React, { useState, useMemo, useCallback } from 'react';
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
import { PostingScreenProps } from '../../types/navigation.types';
import { useTheme } from '../../hooks';
import { TextInput } from '../../components/common';

// Define types for better code structure
interface ProductType {
  id: string;
  name: string;
  subcategories?: string[];
}

interface ProductCondition {
  id: string;
  name: string;
  description: string;
}

// Optimized product types with subcategories for better organization
const PRODUCT_TYPES: ProductType[] = [
  {
    id: "textbooks",
    name: "Textbooks",
    subcategories: ["Science & Math", "Humanities", "Business", "Engineering", "Other"]
  },
  {
    id: "course-materials",
    name: "Course Materials",
    subcategories: ["Notes", "Study Guides", "Lab Equipment", "Other"]
  },
  {
    id: "electronics",
    name: "Electronics",
    subcategories: ["Laptops", "Phones", "Tablets", "Accessories", "Audio", "Other"]
  },
  {
    id: "furniture",
    name: "Furniture",
    subcategories: ["Desks", "Chairs", "Storage", "Lamps", "Bedroom", "Other"]
  },
  {
    id: "clothing",
    name: "Clothing",
    subcategories: ["Tops", "Bottoms", "Outerwear", "Shoes", "Accessories", "Other"]
  },
  {
    id: "dorm-supplies",
    name: "Dorm Supplies",
    subcategories: ["Kitchen", "Bathroom", "Decor", "Organization", "Other"]
  },
  {
    id: "sports-equipment",
    name: "Sports Equipment",
    subcategories: ["Fitness", "Team Sports", "Outdoor", "Other"]
  },
  {
    id: "musical-instruments",
    name: "Musical Instruments",
    subcategories: ["String", "Percussion", "Wind", "Electronic", "Other"]
  },
  {
    id: "art-supplies",
    name: "Art Supplies",
    subcategories: ["Drawing", "Painting", "Crafting", "Digital", "Other"]
  },
  {
    id: "other",
    name: "Other"
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
  const [images, setImages] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [selectedType, setSelectedType] = useState<ProductType | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [selectedCondition, setSelectedCondition] = useState<ProductCondition | null>(null);
  const [isSell, setIsSell] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
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

  // Mock function for image upload - would be replaced with actual implementation
  const handleImageUpload = useCallback(() => {
    // In a real implementation, this would use image-picker or similar library
    // For demo purposes, we'll add a placeholder image
    if (images.length < 5) {
      const newImageUrl = `https://via.placeholder.com/300?text=Image+${images.length + 1}`;
      setImages([...images, newImageUrl]);
      
      // Clear any image-related errors
      if (errors.images) {
        setErrors(prev => ({...prev, images: undefined}));
      }
    } else {
      Alert.alert('Maximum Images', 'You can upload up to 5 images');
    }
  }, [images, errors]);

  // Remove image from array
  const handleRemoveImage = useCallback((index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  }, [images]);

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
    const newErrors: {
      title?: string;
      type?: string;
      description?: string;
      price?: string;
      condition?: string;
      images?: string;
    } = {};
    
    if (!title.trim()) {
      newErrors.title = "Title is required";
    } else if (title.length < 3) {
      newErrors.title = "Title must be at least 3 characters";
    }
    
    if (!selectedType) {
      newErrors.type = "Please select an item type";
    }
    
    if (!description.trim()) {
      newErrors.description = "Description is required";
    } else if (description.length < 10) {
      newErrors.description = "Please provide a more detailed description (at least 10 characters)";
    }
    
    if (isSell && !price.trim()) {
      newErrors.price = "Price is required for items you want to sell";
    } else if (isSell && isNaN(Number(price))) {
      newErrors.price = "Price must be a number";
    }
    
    if (!selectedCondition) {
      newErrors.condition = "Please select the item condition";
    }
    
    if (images.length === 0) {
      newErrors.images = "Please upload at least one image";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [title, selectedType, description, price, selectedCondition, images, isSell]);

  // Handle post item
  const handlePostItem = useCallback(() => {
    if (validateForm()) {
      setIsLoading(true);
      
      // In a real app, this would be an API call to create the posting
      setTimeout(() => {
        setIsLoading(false);
        
        // Show success message
        Alert.alert(
          "Success",
          "Your item has been posted successfully!",
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
      }, 1500);
    }
  }, [validateForm, navigation]);

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
                    source={{ uri: images[0] }} 
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
                {images.slice(1).map((image, index) => (
                  <View key={index} style={styles.thumbnailWrapper}>
                    <Image source={{ uri: image }} style={styles.thumbnailImage} />
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
                    { backgroundColor: isSell ? theme.colors.primary : 'transparent' }
                  ]} 
                  onPress={() => setIsSell(true)}
                >
                  <Text style={[
                    styles.toggleText, 
                    { color: isSell ? theme.colors.buttonText : theme.colors.text }
                  ]}>
                    Sell
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.toggleButton, 
                    { backgroundColor: !isSell ? theme.colors.primary : 'transparent' }
                  ]} 
                  onPress={() => setIsSell(false)}
                >
                  <Text style={[
                    styles.toggleText, 
                    { color: !isSell ? theme.colors.buttonText : theme.colors.text }
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
          
          {/* Post Button */}
          <TouchableOpacity 
            style={[
              styles.button, 
              { 
                backgroundColor: isLoading ? theme.colors.primaryLight : theme.colors.primary,
                opacity: isLoading ? 0.8 : 1
              }
            ]}
            activeOpacity={0.7}
            onPress={handlePostItem}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={theme.colors.buttonText} size="small" />
            ) : (
              <View style={styles.buttonContent}>
                <Icon name="check" size={18} color={theme.colors.buttonText} style={styles.buttonIcon} />
                <Text style={[styles.buttonText, { color: theme.colors.buttonText }]}>
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
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.optionItem, { 
                    backgroundColor: selectedType?.id === item.id ? theme.colors.primaryLight : 'transparent'
                  }]}
                  onPress={() => selectType(item)}
                >
                  <Text style={[styles.optionText, { color: theme.colors.text }]}>{item.name}</Text>
                  {selectedType?.id === item.id && (
                    <Icon name="check" size={16} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              )}
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
});

export default PostingScreen; 