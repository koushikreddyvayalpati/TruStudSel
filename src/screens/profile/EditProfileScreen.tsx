import React, { useState } from 'react';
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
  SafeAreaView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../contexts/AuthContext';
import { TextInput, Button } from '../../components/common';
import { EditProfileScreenNavigationProp } from '../../types/navigation.types';

const EditProfileScreen = () => {
  const navigation = useNavigation<EditProfileScreenNavigationProp>();
  const { user, updateUserAttributes, updateUserInfo } = useAuth();
  
  const [name, setName] = useState(user?.name || '');
  const [university, setUniversity] = useState(user?.university || '');
  const [loading, setLoading] = useState(false);
  const [profilePicture] = useState(user?.profileImage || null);
  
  // Function to handle profile update
  const handleUpdateProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    
    setLoading(true);
    try {
      // Update user attributes in backend
      await updateUserAttributes({
        'name': name,
        'custom:university': university,
      });
      
      // Update local user info
      updateUserInfo({
        name,
        university
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
        <ScrollView style={styles.scrollView}>
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-left" size={20} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Profile</Text>
            <View style={{ width: 40 }} />
          </View>
          
          <View style={styles.profilePictureContainer}>
            {profilePicture ? (
              <Image source={{ uri: profilePicture }} style={styles.profilePicture} />
            ) : (
              <View style={styles.profilePicturePlaceholder}>
                <Text style={styles.profileInitial}>{getInitial()}</Text>
              </View>
            )}
            
            <TouchableOpacity 
              style={styles.uploadPictureButton}
              onPress={handleUploadProfilePicture}
            >
              <Icon name="camera" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.form}>
            <TextInput
              label="Name"
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              containerStyle={styles.inputContainer}
              leftIcon={<MaterialIcons name="account" size={22} color="grey" />}
            />
            
            <TextInput
              label="Email"
              value={user?.email || ''}
              placeholder="Your email"
              editable={false}
              containerStyle={styles.inputContainer}
              leftIcon={<MaterialIcons name="email" size={22} color="grey" />}
            />
            
            <TextInput
              label="University"
              value={university}
              onChangeText={setUniversity}
              placeholder="Enter your university"
              containerStyle={styles.inputContainer}
              leftIcon={<MaterialIcons name="school" size={22} color="grey" />}
            />
            
            <Button
              title="Save Changes"
              onPress={handleUpdateProfile}
              variant="primary"
              style={styles.saveButton}
              loading={loading}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  backButton: {
    padding: 10,
  },
  profilePictureContainer: {
    alignItems: 'center',
    marginBottom: 30,
    position: 'relative',
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#f7b305',
  },
  profilePicturePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f7b305',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#eaeaea',
  },
  profileInitial: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
  },
  uploadPictureButton: {
    position: 'absolute',
    bottom: 0,
    right: '35%',
    backgroundColor: '#333',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  form: {
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  saveButton: {
    marginTop: 20,
  },
});

export default EditProfileScreen; 