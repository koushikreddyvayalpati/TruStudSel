import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Auth } from 'aws-amplify';
import { useAuth } from '../../contexts/AuthContext';

const DeleteAccountScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleOpenDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  const handleDeleteAccount = async () => {
    // First confirmation step
    if (!confirmStep) {
      setConfirmStep(true);
      return;
    }

    // Second confirmation step - check if the user typed "DELETE" correctly
    if (confirmText !== 'DELETE') {
      Alert.alert('Error', 'Please type DELETE to confirm account deletion');
      return;
    }

    // Validate password is not empty
    if (!password) {
      Alert.alert('Error', 'Please enter your password to continue');
      return;
    }

    setLoading(true);

    try {
      // Sign in again to verify credentials
      await Auth.signIn(user?.email || '', password);
      
      // Delete the user
      const currentUser = await Auth.currentAuthenticatedUser();
      await currentUser.deleteUser((err: any, _result: any) => {
        if (err) {
          console.error('Error deleting account:', err);
          Alert.alert(
            'Error',
            'There was a problem deleting your account. Please try again later.'
          );
          setLoading(false);
          return;
        }

        // Successfully deleted
        Alert.alert(
          'Account Deleted',
          'Your account has been successfully deleted.',
          [
            {
              text: 'OK',
              onPress: async () => {
                // Sign out and navigate to auth screen
                await signOut();
              }
            }
          ]
        );
      });
    } catch (error) {
      console.error('Error during account deletion:', error);
      
      let errorMessage = 'There was a problem deleting your account. Please try again later.';
      if (error instanceof Error) {
        if (error.name === 'NotAuthorizedException') {
          errorMessage = 'Incorrect password. Please try again.';
        }
      }
      
      Alert.alert('Error', errorMessage);
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleOpenDrawer} style={styles.menuButton}>
          <MaterialIcons name="menu" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Future account settings options could go here */}

        {/* Account Deletion Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Delete Account</Text>
          <View style={styles.warningContainer}>
            <MaterialIcons name="warning" size={48} color="#FF3B30" />
            <Text style={styles.warningTitle}>Delete Your Account</Text>
            <Text style={styles.warningText}>
              This action is permanent and cannot be undone. When you delete your account:
            </Text>
            <View style={styles.bulletPoints}>
              <Text style={styles.bulletPoint}>• All your personal information will be deleted</Text>
              <Text style={styles.bulletPoint}>• Your product listings will be removed</Text>
              <Text style={styles.bulletPoint}>• Your messages will be deleted</Text>
              <Text style={styles.bulletPoint}>• You will lose access to purchase history</Text>
            </View>
          </View>

          {!confirmStep ? (
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={handleDeleteAccount}
            >
              <Text style={styles.deleteButtonText}>Continue to Delete Account</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.confirmContainer}>
              <Text style={styles.confirmLabel}>
                To confirm deletion, please type DELETE below:
              </Text>
              <TextInput
                style={styles.confirmInput}
                value={confirmText}
                onChangeText={setConfirmText}
                placeholder="Type DELETE here"
                autoCapitalize="characters"
              />

              <Text style={styles.passwordLabel}>
                Enter your password to verify:
              </Text>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                placeholder="Your password"
                secureTextEntry
              />

              <TouchableOpacity 
                style={[
                  styles.finalDeleteButton,
                  (confirmText !== 'DELETE' || !password) && styles.disabledButton
                ]}
                onPress={handleDeleteAccount}
                disabled={loading || confirmText !== 'DELETE' || !password}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.deleteButtonText}>Delete My Account</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  menuButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 24,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionContainer: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  warningContainer: {
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFCCCC',
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 12,
    color: '#333',
  },
  warningText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  bulletPoints: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  bulletPoint: {
    fontSize: 15,
    color: '#333',
    marginBottom: 6,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 40,
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmContainer: {
    marginTop: 12,
  },
  confirmLabel: {
    fontSize: 16,
    marginBottom: 12,
    fontWeight: '500',
  },
  confirmInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 24,
  },
  passwordLabel: {
    fontSize: 16,
    marginBottom: 12,
    fontWeight: '500',
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 24,
  },
  finalDeleteButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 40,
  },
  disabledButton: {
    backgroundColor: '#ffb3b3',
    opacity: 0.7,
  },
});

export default DeleteAccountScreen; 