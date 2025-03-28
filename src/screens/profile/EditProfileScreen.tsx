import React, { useState, useMemo, useEffect } from 'react';
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
  InteractionManager
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../contexts/AuthContext';
import { TextInput } from '../../components/common';
import { EditProfileScreenNavigationProp } from '../../types/navigation.types';

const EditProfileScreen = () => {
  const navigation = useNavigation<EditProfileScreenNavigationProp>();
  const { user, updateUserAttributes, updateUserInfo } = useAuth();
  
  const [name, setName] = useState(user?.name || '');
  const [loading, setLoading] = useState(false);
  const [profilePicture] = useState(user?.profileImage || null);
  
  // Memoize the university value to avoid unnecessary re-renders
  const university = useMemo(() => user?.university || '', [user?.university]);
  
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
  
  // Function to handle profile update
  const handleUpdateProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    
    setLoading(true);
    try {
      // Update user attributes in backend - only updating name
      await updateUserAttributes({
        'name': name,
      });
      
      // Update local user info
      updateUserInfo({
        name,
        university, // Preserve existing university
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
  
  // Function to handle profile picture upload
  const handleUploadProfilePicture = () => {
    // This would typically use image picker and upload to storage
    Alert.alert(
      'Upload Profile Picture', 
      'Profile picture upload feature will be implemented in future updates.'
    );
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
              >
                <Icon name="camera" size={14} color="#1b74e4" />
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
                  <Text style={styles.disabledFieldText}>{user?.email || 'No email available'}</Text>
                  <View style={styles.lockIconContainer}>
                    <Icon name="lock" size={12} color="#999" />
                  </View>
                </View>
              </View>
              
              <View style={styles.divider} />

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>UNIVERSITY</Text>
                <View style={styles.disabledField}>
                  <MaterialIcons name="school-outline" size={22} color="#222" style={styles.disabledFieldIcon} />
                  <Text style={styles.disabledFieldText}>{university || 'No university set'}</Text>
                  <View style={styles.lockIconContainer}>
                    <Icon name="lock" size={12} color="#999" />
                  </View>
                </View>
              </View>
            </View>
            
            <TouchableOpacity
              style={[styles.saveButton, loading && styles.saveButtonLoading]}
              onPress={handleUpdateProfile}
              disabled={loading}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <View style={styles.loadingDot} />
                  <View style={[styles.loadingDot, styles.loadingDotMiddle]} />
                  <View style={styles.loadingDot} />
                </View>
              ) : (
                <Text style={styles.saveButtonText}>SAVE CHANGES</Text>
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