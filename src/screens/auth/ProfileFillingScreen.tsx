import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { ProfileFillingScreenProps } from '../../types/navigation.types';
import { useTheme } from '../../hooks';
import { useAuth } from '../../contexts';
import { TextInput } from '../../components/common';

const ProfileFillingScreen: React.FC<ProfileFillingScreenProps> = ({ route, navigation }) => {
  const { theme } = useTheme();
  const { updateUserAttributes } = useAuth();
  const { email, username } = route.params;
  
  const [name, setName] = useState(username || '');
  const [university, setUniversity] = useState('');
  const [preferredCategory, setPreferredCategory] = useState('');
  const [dob, setDob] = useState('');
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    if (!university) {
      Alert.alert('Error', 'Please enter your university');
      return;
    }

    setLoading(true);
    try {
      // Update user attributes if supported by your backend
      if (updateUserAttributes) {
        await updateUserAttributes({
          'custom:university': university,
          'custom:preferredCategory': preferredCategory,
          'birthdate': dob,
        });
      }
      
      // Navigate to the home screen
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadProfilePicture = () => {
    // Implement profile picture upload functionality
    Alert.alert(
      'Upload Profile Picture', 
      'Profile picture upload feature will be implemented in future updates.'
    );
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.contentContainer}>
          <Text style={[styles.title, { color: theme.colors.primary }]}>You're Almost Done</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Please fill in the following details
          </Text>
          
          <View style={styles.profilePicContainer}>
            <View style={[styles.profilePicPlaceholder, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.profilePicText, { color: theme.colors.textSecondary }]}>
                {name ? name.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.uploadButton, { backgroundColor: theme.colors.secondary }]}
              onPress={handleUploadProfilePicture}
            >
              <Text style={[styles.uploadButtonText, { color: theme.colors.buttonText }]}>
                Upload Profile Picture
              </Text>
            </TouchableOpacity>
          </View>
          
          <TextInput
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            editable={false}
            containerStyle={styles.inputContainer}
          />
          
          <TextInput
            label="Email"
            value={email}
            placeholder="Your email"
            editable={false}
            containerStyle={styles.inputContainer}
          />
          
          <TextInput
            label="University"
            value={university}
            onChangeText={setUniversity}
            placeholder="Enter your university"
            containerStyle={styles.inputContainer}
          />
          
          <TextInput
            label="Preferred Categories"
            value={preferredCategory}
            onChangeText={setPreferredCategory}
            placeholder="E.g., Electronics, Books, Furniture"
            containerStyle={styles.inputContainer}
          />
          
          <TextInput
            label="Date of Birth"
            value={dob}
            onChangeText={setDob}
            placeholder="YYYY-MM-DD"
            containerStyle={styles.inputContainer}
          />
          
          <TouchableOpacity 
            style={[
              styles.button, 
              { backgroundColor: theme.colors.primary }
            ]}
            onPress={handleNext}
            disabled={loading}
          >
            <Text style={[styles.buttonText, { color: theme.colors.buttonText }]}>
              Complete Profile
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    flex: 1,
    minHeight: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 60,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
  },
  profilePicContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profilePicPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  profilePicText: {
    fontSize: 40,
    fontWeight: 'bold',
  },
  uploadButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 16,
  },
  button: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ProfileFillingScreen; 