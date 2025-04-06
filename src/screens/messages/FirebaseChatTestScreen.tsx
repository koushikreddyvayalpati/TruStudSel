import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getCurrentUser } from '../../services/firebaseChatService';

const FirebaseChatTestScreen = () => {
  const navigation = useNavigation();
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ email: string; name: string } | null>(null);

  // Get current user on mount
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        setIsLoading(true);
        const user = await getCurrentUser();
        if (user && user.email) {
          setCurrentUser({
            email: user.email,
            name: user.name || user.username || 'User'
          });
        } else {
          Alert.alert('Error', 'You must be logged in to use chat.');
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
        Alert.alert('Error', 'Failed to get user information.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCurrentUser();
  }, []);

  const handleStartChat = () => {
    if (!recipientEmail.trim()) {
      Alert.alert('Error', 'Please enter a recipient email address.');
      return;
    }

    try {
      // Use type assertion to work around TypeScript navigation issues
      // This is a common workaround for React Navigation typing with drawer navigators
      (navigation as any).navigate('FirebaseChatScreen', {
        recipientEmail: recipientEmail.trim(),
        recipientName: recipientName.trim() || recipientEmail.trim()
      });
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert(
        'Navigation Error',
        'Unable to open chat screen. Please try again.'
      );
    }
  };

  // Add a function to navigate to the Firebase Test screen
  const navigateToFirebaseTest = () => {
    try {
      // Use any type to avoid TypeScript issues with nested navigators
      (navigation as any).navigate('FirebaseTest');
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert(
        'Navigation Error',
        'Unable to open Firebase Test screen. Please try again.'
      );
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffb300" />
        <Text style={styles.loadingText}>Loading user information...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Firebase Chat Test</Text>
        </View>

        <View style={styles.currentUserInfo}>
          <Text style={styles.label}>Your Information:</Text>
          <Text style={styles.userInfo}>Email: {currentUser?.email}</Text>
          <Text style={styles.userInfo}>Name: {currentUser?.name}</Text>
        </View>

        {/* Add a button to navigate to the Firebase Test screen */}
        <TouchableOpacity 
          style={styles.firebaseTestButton}
          onPress={navigateToFirebaseTest}
        >
          <Text style={styles.buttonText}>Go to Firebase Connectivity Test</Text>
        </TouchableOpacity>

        <View style={styles.formContainer}>
          <Text style={styles.label}>Enter Recipient Information:</Text>
          
          <TextInput
            style={styles.input}
            value={recipientEmail}
            onChangeText={setRecipientEmail}
            placeholder="Recipient Email Address"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          <TextInput
            style={styles.input}
            value={recipientName}
            onChangeText={setRecipientName}
            placeholder="Recipient Name (optional)"
            placeholderTextColor="#999"
          />
          
          <TouchableOpacity
            style={styles.button}
            onPress={handleStartChat}
          >
            <Text style={styles.buttonText}>Start Chat</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            This is a test screen for the Firebase Chat functionality.
            Enter the email address of another user to start a chat with them.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  scrollContent: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  currentUserInfo: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  formContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  userInfo: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#f1f1f1',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#ffb300',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoContainer: {
    backgroundColor: '#eef5ff',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cce0ff',
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  firebaseTestButton: {
    backgroundColor: '#ffb300',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },
});

export default FirebaseChatTestScreen; 