import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  SafeAreaView,
  InteractionManager,
  ActivityIndicator
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { useAuth } from '../../contexts/AuthContext';
import { TextInput } from '../../components/common';
import { EditProfileScreenNavigationProp, EditProfileScreenRouteProp } from '../../types/navigation.types';
import { launchImageLibrary } from 'react-native-image-picker';
import { uploadFile, updateUserProfileData } from '../../api/users';

const EditProfileScreen = () => {
  const navigation = useNavigation<EditProfileScreenNavigationProp>();
  const route = useRoute<EditProfileScreenRouteProp>();
  const { user, updateUserInfo } = useAuth();
  
  // Get data from route params or use defaults
  const routeParams = useMemo(() => route.params || {}, [route.params]);
  
  // Debug log to check the received profile image URL
  console.log('Received userphoto from route params:', routeParams.userphoto);
  
  const [name, setName] = useState(routeParams.name || user?.name || '');
  const [university, setUniversity] = useState(routeParams.university || user?.university || '');
  const [city, setCity] = useState(routeParams.city || '');
  const [zipcode, setZipcode] = useState(routeParams.zipcode || '');
  const [mobile] = useState(routeParams.mobile || ''); // mobile is non-editable
  const [loading, setLoading] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(routeParams.userphoto || user?.profileImage || null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Add cleanup for any animation-related operations
  useEffect(() => {
    // Defer non-critical operations to avoid animation warnings
    const interactionPromise = InteractionManager.runAfterInteractions(() => {
      // Any animations or heavy operations should be started here
    });
    
    return () => {
      // Cleanup any subscriptions or pending interactions
      interactionPromise.cancel();
    };
  }, []);
  
  // Add effect to detect changes in profile data
  useEffect(() => {
    // Function to check if current values differ from initial values
    const checkForChanges = () => {
      const initialName = routeParams.name || user?.name || '';
      const initialUniversity = routeParams.university || user?.university || '';
      const initialCity = routeParams.city || '';
      const initialZipcode = routeParams.zipcode || '';
      const initialPhoto = routeParams.userphoto || user?.profileImage || null;
      
      // Check if any values have changed
      const hasChanged = 
        name !== initialName ||
        university !== initialUniversity ||
        city !== initialCity ||
        zipcode !== initialZipcode ||
        profilePicture !== initialPhoto;
      
      setHasUnsavedChanges(hasChanged);
    };
    
    checkForChanges();
  }, [name, university, city, zipcode, profilePicture, routeParams, user]);
  
  // Add a ref to store the selected image for upload on save
  const selectedImageRef = React.useRef<any>(null);
  
  // Function to handle profile update
  const handleUpdateProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    
    setLoading(true);
    
    try {
      const email = routeParams.email || user?.email;
      
      if (!email) {
        Alert.alert('Error', 'Email is required for updating profile');
        setLoading(false);
        return;
      }
      
      // Check if we have a new image to upload
      let imageUrl = routeParams.userphoto || user?.profileImage || '';
      
      // If we have a selected image that needs to be uploaded
      if (selectedImageRef.current) {
        let uploadResponse: any = null;
        try {
          console.log('Uploading new image to server...');
          
          // Create form data for upload
          const formData = new FormData();
          formData.append('file', {
            uri: selectedImageRef.current.uri,
            type: selectedImageRef.current.type || 'image/jpeg',
            name: selectedImageRef.current.fileName || 'profile_image.jpg'
          } as any);
          
          // Upload the image to get the filename
          uploadResponse = await uploadFile(formData);
          console.log('Upload response:', uploadResponse);
          
          if (uploadResponse && uploadResponse.fileName) {
            // Construct the full image URL
            imageUrl = `https://trustedproductimages.s3.us-east-2.amazonaws.com/${uploadResponse.fileName}`;
            console.log('Image uploaded successfully, URL:', imageUrl);
          } else {
            throw new Error('Failed to get image URL from server');
          }
        } catch (uploadError) {
          console.error('Failed to upload image:', uploadError);
          
          // Ask user if they want to continue without the image
          return new Promise<void>((resolve, reject) => {
            Alert.alert(
              'Image Upload Failed',
              'Could not upload profile image. Do you want to continue updating other profile information?',
              [
                { 
                  text: 'Cancel', 
                  style: 'cancel',
                  onPress: () => {
                    setLoading(false);
                    reject(new Error('Image upload cancelled'));
                  }
                },
                { 
                  text: 'Continue', 
                  onPress: () => {
                    console.log('Continuing without image update');
                    resolve();
                  }
                }
              ]
            );
          });
        }
      }
      
      // Now prepare the data with the new image URL if we have one
      const updateData = {
        name: name.trim(),
        university: university.trim(),
        city: city.trim(),
        zipcode: zipcode.trim(),
        userphoto: imageUrl
      };
      
      console.log('Updating profile with data:', updateData);
      
      // Now call the PUT API to update the profile with all data including image URL
      await updateUserProfileData(email, updateData);
      
      // Clear the selected image ref after successful upload
      selectedImageRef.current = null;
      
      // Also update local user info in Auth context
      updateUserInfo({
        name: name.trim(),
        university: university.trim(),
        profileImage: imageUrl
      });
      
      Alert.alert('Success', 'Profile updated successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };
  
  // Function to handle profile picture upload - now only stores the image locally
  const handleUploadProfilePicture = async () => {
    if (uploadingImage) return;
    
    setUploadingImage(true);
    
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 500,
        maxHeight: 500,
      });
      
      if (result.didCancel) {
        console.log('User cancelled image picker');
        setUploadingImage(false);
        return;
      }
      
      if (result.errorCode) {
        console.error('ImagePicker Error:', result.errorMessage);
        Alert.alert('Error', result.errorMessage || 'Failed to pick image');
        setUploadingImage(false);
        return;
      }
      
      if (!result.assets || result.assets.length === 0 || !result.assets[0].uri) {
        Alert.alert('Error', 'No image selected');
        setUploadingImage(false);
        return;
      }
      
      // Get the selected image and store it temporarily for display
      const selectedImage = result.assets[0];
      console.log('Selected image locally:', selectedImage.uri);
      
      // Just store the local image URI in state - no upload yet
      // We'll upload it only when the Save button is clicked
      setProfilePicture(selectedImage.uri || null);
      
      // Store the selected image in a ref for later upload
      selectedImageRef.current = selectedImage;
      
      // Notify user they need to save changes
      Alert.alert(
        'Image Selected',
        'Your profile image has been selected. Click "Save Changes" to upload and update your profile.',
        [{ text: 'OK', style: 'default' }]
      );
    } catch (error: any) {
      console.error('Image selection error:', error);
      Alert.alert('Error', error.message || 'Failed to select profile picture');
    } finally {
      setUploadingImage(false);
    }
  };
  
  // Get the first letter of the user's name for the profile circle
  const getInitial = () => {
    if (name) {
      return name.charAt(0).toUpperCase();
    }
    if (user?.username) {
      return user.username.charAt(0).toUpperCase();
    }
    return 'U'; // Default if no name is available
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-left" size={18} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Profile</Text>
            <View style={{ width: 40 }} />
          </View>
          
          <View style={styles.profileSection}>
            <View style={styles.profilePictureContainer}>
              {profilePicture ? (
                <Image 
                  source={{ uri: profilePicture }} 
                  style={styles.profilePicture} 
                />
              ) : (
                <View style={styles.profilePicturePlaceholder}>
                  <View style={styles.profileGradient} />
                  <Text style={styles.profileInitial}>{getInitial()}</Text>
                </View>
              )}
              
              <TouchableOpacity 
                style={styles.uploadPictureButton}
                onPress={handleUploadProfilePicture}
                disabled={uploadingImage}
              >
                {uploadingImage ? (
                  <ActivityIndicator size="small" color="#1b74e4" />
                ) : (
                  <Icon name="camera" size={14} color="#1b74e4" />
                )}
              </TouchableOpacity>
            </View>
            
            <Text style={styles.namePreview}>{name || 'Your Name'}</Text>
            <Text style={styles.universityPreview}>{university || 'University'}</Text>
          </View>
          
          <View style={styles.form}>
            <View style={styles.formCard}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>FULL NAME</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your full name"
                  containerStyle={styles.inputContainer}
                  leftIcon={<MaterialIcons name="account-outline" size={22} color="#222" />}
                />
              </View>
              
              <View style={styles.divider} />

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>EMAIL</Text>
                <View style={styles.disabledField}>
                  <MaterialIcons name="email-outline" size={22} color="#222" style={styles.disabledFieldIcon} />
                  <Text style={styles.disabledFieldText}>{routeParams.email || user?.email || 'No email available'}</Text>
                  <View style={styles.lockIconContainer}>
                    <Icon name="lock" size={12} color="#999" />
                  </View>
                </View>
              </View>
              
              <View style={styles.divider} />

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>UNIVERSITY</Text>
                <TextInput
                  value={university}
                  onChangeText={setUniversity}
                  placeholder="Enter your university"
                  containerStyle={styles.inputContainer}
                  leftIcon={<MaterialIcons name="school-outline" size={22} color="#222" />}
                />
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>PHONE NUMBER</Text>
                <View style={styles.disabledField}>
                  <FontAwesome5 name="phone-alt" size={18} color="#222" style={styles.disabledFieldIcon} />
                  <Text style={styles.disabledFieldText}>{mobile || 'No phone number available'}</Text>
                  <View style={styles.lockIconContainer}>
                    <Icon name="lock" size={12} color="#999" />
                  </View>
                </View>
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>CITY</Text>
                <TextInput
                  value={city}
                  onChangeText={setCity}
                  placeholder="Enter your city"
                  containerStyle={styles.inputContainer}
                  leftIcon={<FontAwesome5 name="city" size={18} color="#222" />}
                />
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>ZIPCODE</Text>
                <TextInput
                  value={zipcode}
                  onChangeText={setZipcode}
                  placeholder="Enter your zipcode"
                  containerStyle={styles.inputContainer}
                  leftIcon={<FontAwesome5 name="map-pin" size={18} color="#222" />}
                  keyboardType="number-pad"
                />
              </View>
            </View>
            
            <TouchableOpacity
              style={[
                styles.saveButton, 
                (loading || uploadingImage) && styles.saveButtonLoading,
                hasUnsavedChanges && !loading && !uploadingImage && styles.saveButtonHighlighted
              ]}
              onPress={handleUpdateProfile}
              disabled={loading || uploadingImage}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <View style={styles.loadingDot} />
                  <View style={[styles.loadingDot, styles.loadingDotMiddle]} />
                  <View style={styles.loadingDot} />
                </View>
              ) : uploadingImage ? (
                <Text style={styles.saveButtonText}>UPLOADING IMAGE...</Text>
              ) : hasUnsavedChanges ? (
                <Text style={styles.saveButtonText}>
                  {profilePicture !== (routeParams.userphoto || user?.profileImage) 
                    ? 'SAVE PROFILE & IMAGE' 
                    : 'SAVE CHANGES'}
                </Text>
              ) : (
                <Text style={styles.saveButtonText}>NO CHANGES</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profilePictureContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  profilePicture: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  profilePicturePlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#f7b305',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#f7b305',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  profileGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'black',
    opacity: 0.9,
  },
  profileInitial: {
    fontSize: 42,
    fontWeight: 'bold',
    color: 'white',
    zIndex: 2,
  },
  namePreview: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
    marginBottom: 4,
  },
  universityPreview: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  uploadPictureButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'white',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1b74e4',
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  form: {
    marginBottom: 20,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.03)',
  },
  fieldGroup: {
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#777',
    marginBottom: 8,
    letterSpacing: 0.8,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    marginVertical: 20,
  },
  inputContainer: {
    marginBottom: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    height: 48,
  },
  disabledField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  disabledFieldIcon: {
    marginRight: 12,
  },
  disabledFieldText: {
    fontSize: 15,
    color: '#999',
    flex: 1,
  },
  lockIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#f7b305',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  saveButtonLoading: {
    backgroundColor: '#222',
  },
  saveButtonHighlighted: {
    backgroundColor: '#1b74e4',
    shadowColor: '#1b74e4',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
    transform: [{ scale: 1.02 }],
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 1,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f7b305',
    marginHorizontal: 2,
    opacity: 0.8,
  },
  loadingDotMiddle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    opacity: 1,
  },
});

export default EditProfileScreen; 