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
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.contentContainer}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Icon name="chevron-left" size={20} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Upload Item</Text>
          </View>
          
          {/* Multiple Image Upload Section */}
          <View style={styles.imagesSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Photos {errors.images && <Text style={styles.errorText}>({errors.images})</Text>}
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
              Add up to 5 photos to showcase your item
            </Text>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesContainer}>
              {images.map((image, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image source={{ uri: image }} style={styles.thumbnailImage} />
                  <TouchableOpacity 
                    style={styles.removeImageButton}
                    onPress={() => handleRemoveImage(index)}
                  >
                    <Icon name="times-circle" size={22} color="#e74c3c" />
                  </TouchableOpacity>
                </View>
              ))}
              
              {images.length < 5 && (
                <TouchableOpacity 
                  style={[styles.addImageButton, { borderColor: theme.colors.border }]} 
                  onPress={handleImageUpload}
                >
                  <Icon name="plus" size={24} color={theme.colors.primary} />
                  <Text style={[styles.addImageText, { color: theme.colors.textSecondary }]}>
                    Add Photo
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
          
          <View style={styles.toggleContainer}>
            <TouchableOpacity 
              style={[
                styles.toggleButton, 
                { backgroundColor: isSell ? theme.colors.primary : theme.colors.surface }
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
                { backgroundColor: !isSell ? theme.colors.primary : theme.colors.surface }
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
              <Text style={[styles.buttonText, { color: theme.colors.buttonText }]}>
                Post Item
              </Text>
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
              <TouchableOpacity onPress={() => setTypeModalVisible(false)}>
                <Icon name="times" size={24} color={theme.colors.text} />
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
                <TouchableOpacity onPress={() => setSubcategoryModalVisible(false)}>
                  <Icon name="times" size={24} color={theme.colors.text} />
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
              <TouchableOpacity onPress={() => setConditionModalVisible(false)}>
                <Icon name="times" size={24} color={theme.colors.text} />
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
  contentContainer: {
    padding: 20,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  backButton: {
    padding: 10,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 12,
  },
  imagesSection: {
    marginBottom: 25,
  },
  imagesContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  thumbnailImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 2,
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageText: {
    marginTop: 8,
    fontSize: 14,
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
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  toggleButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  toggleText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  button: {
    height: 55,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  label: {
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  dropdown: {
    height: 55,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownText: {
    fontSize: 16,
  },
  conditionDescription: {
    marginTop: 6,
    fontSize: 14,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  optionDescription: {
    fontSize: 14,
    marginTop: 4,
  },
  conditionOption: {
    flex: 1,
  },
  errorText: {
    color: '#e74c3c',
    fontWeight: 'normal',
    fontSize: 14,
  },
});

export default PostingScreen; 