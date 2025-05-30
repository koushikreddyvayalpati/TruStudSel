import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Auth } from 'aws-amplify';
import { useAuth } from '../../contexts/AuthContext';
import { DeleteAccountScreenNavigationProp } from '../../types/navigation.types';

const DeleteAccountScreen: React.FC = () => {
  const navigation = useNavigation<DeleteAccountScreenNavigationProp>();
  const { user, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const handleOpenDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  // Handle password change
  const handleChangePassword = async () => {
    // Validate inputs
    if (!currentPassword) {
      Alert.alert('Error', 'Please enter your current password');
      return;
    }
    
    if (!newPassword) {
      Alert.alert('Error', 'Please enter a new password');
      return;
    }
    
    if (newPassword.length < 8) {
      Alert.alert('Error', 'New password must be at least 8 characters long');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }
    
    setChangingPassword(true);
    
    try {
      const user = await Auth.currentAuthenticatedUser();
      await Auth.changePassword(
        user,
        currentPassword,
        newPassword
      );
      
      // Reset fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      Alert.alert(
        'Success',
        'Your password has been changed successfully',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error changing password:', error);
      
      let errorMessage = 'There was a problem changing your password. Please try again.';
      if (error instanceof Error) {
        if (error.name === 'NotAuthorizedException') {
          errorMessage = 'Incorrect current password. Please try again.';
        }
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setChangingPassword(false);
    }
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
              },
            },
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleOpenDrawer} style={styles.menuButton}>
          <MaterialIcons name="menu" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Change Password Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="lock" size={26} color="#f7b305" />
            <Text style={styles.sectionTitle}>Change Password</Text>
          </View>

          <View style={styles.passwordFormContainer}>
            <View style={styles.compactForm}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Current Password</Text>
                <TextInput
                  style={styles.passwordInput}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter current password"
                  secureTextEntry
                  placeholderTextColor="#999"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>New Password</Text>
                <TextInput
                  style={styles.passwordInput}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  secureTextEntry
                  placeholderTextColor="#999"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Confirm New Password</Text>
                <TextInput
                  style={styles.passwordInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  secureTextEntry
                  placeholderTextColor="#999"
                />
              </View>
            </View>
            
            <TouchableOpacity
              style={[
                styles.changePasswordButton,
                changingPassword && styles.disabledButton
              ]}
              onPress={handleChangePassword}
              disabled={changingPassword}
              activeOpacity={0.8}
            >
              {changingPassword ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <MaterialIcons name="vpn-key" size={22} color="#fff" />
                  <Text style={styles.buttonText}>Update Password</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Deletion Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="delete-forever" size={26} color="#FF3B30" />
            <Text style={styles.sectionTitle}>Delete Account</Text>
          </View>

          <View style={styles.warningContainer}>
            <MaterialIcons name="warning" size={48} color="#FF3B30" />
            <Text style={styles.warningTitle}>Delete Your Account</Text>
            <Text style={styles.warningText}>
              This action is permanent and cannot be undone. When you delete your account:
            </Text>
            <View style={styles.bulletPoints}>
              <View style={styles.bulletPoint}>
                <MaterialIcons name="remove-circle" size={18} color="#FF3B30" />
                <Text style={styles.bulletPointText}>All your personal information will be deleted</Text>
              </View>
              <View style={styles.bulletPoint}>
                <MaterialIcons name="remove-circle" size={18} color="#FF3B30" />
                <Text style={styles.bulletPointText}>Your product listings will be removed</Text>
              </View>
              <View style={styles.bulletPoint}>
                <MaterialIcons name="remove-circle" size={18} color="#FF3B30" />
                <Text style={styles.bulletPointText}>Your messages will be deleted</Text>
              </View>
              <View style={styles.bulletPoint}>
                <MaterialIcons name="remove-circle" size={18} color="#FF3B30" />
                <Text style={styles.bulletPointText}>You will lose access to purchase history</Text>
              </View>
            </View>
          </View>

          {!confirmStep ? (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDeleteAccount}
              activeOpacity={0.8}
            >
              <MaterialIcons name="delete-forever" size={22} color="#fff" />
              <Text style={styles.deleteButtonText}>Continue to Delete Account</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.confirmContainer}>
              <Text style={styles.confirmInstructions}>
                To permanently delete your account, please confirm by completing the steps below:
              </Text>

              <View style={styles.confirmStepContainer}>
                <View style={styles.stepNumberContainer}>
                  <Text style={styles.stepNumber}>1</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.confirmLabel}>
                    Type DELETE in all caps:
                  </Text>
                  <TextInput
                    style={styles.confirmInput}
                    value={confirmText}
                    onChangeText={setConfirmText}
                    placeholder="Type DELETE here"
                    autoCapitalize="characters"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              <View style={styles.confirmStepContainer}>
                <View style={styles.stepNumberContainer}>
                  <Text style={styles.stepNumber}>2</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.passwordLabel}>
                    Verify your password:
                  </Text>
                  <TextInput
                    style={styles.passwordInput}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    secureTextEntry
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.finalDeleteButton,
                  (confirmText !== 'DELETE' || !password) && styles.disabledButton,
                ]}
                onPress={handleDeleteAccount}
                disabled={loading || confirmText !== 'DELETE' || !password}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <MaterialIcons name="delete-forever" size={22} color="#fff" />
                    <Text style={styles.deleteButtonText}>Delete My Account</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setConfirmStep(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
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
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 0,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
      },
    }),
  },
  menuButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  settingsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
        backgroundColor: '#fff',
      },
    }),
  },
  settingsIcon: {
    marginBottom: 10,
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  settingsDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  sectionContainer: {
    marginBottom: 32,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 0,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
      },
    }),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
    color: '#333',
  },
  warningContainer: {
    backgroundColor: '#FFF8F8',
    padding: 20,
    alignItems: 'center',
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 12,
    color: '#333',
  },
  warningText: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  bulletPoints: {
    alignSelf: 'stretch',
    marginTop: 8,
  },
  bulletPoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  bulletPointText: {
    fontSize: 15,
    color: '#444',
    marginLeft: 10,
    flex: 1,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    paddingVertical: 16,
    marginHorizontal: 20,
    marginVertical: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    ...Platform.select({
      android: {
        elevation: 0,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
    }),
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  confirmContainer: {
    padding: 20,
  },
  confirmInstructions: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
    marginBottom: 24,
  },
  confirmStepContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  stepNumberContainer: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
    ...Platform.select({
      android: {
        elevation: 0,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1,
      },
    }),
  },
  stepNumber: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  stepContent: {
    flex: 1,
  },
  confirmLabel: {
    fontSize: 16,
    marginBottom: 12,
    fontWeight: '500',
    color: '#333',
  },
  confirmInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#fff',
    width: '100%',
    ...Platform.select({
      android: {
        elevation: 0,
        borderColor: '#ccc',
      },
    }),
  },
  passwordLabel: {
    fontSize: 16,
    marginBottom: 12,
    fontWeight: '500',
    color: '#333',
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#fff',
    width: '100%',
    ...Platform.select({
      android: {
        elevation: 0,
        borderColor: '#ccc',
      },
    }),
  },
  finalDeleteButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    ...Platform.select({
      android: {
        elevation: 0,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
    }),
  },
  disabledButton: {
    backgroundColor: '#f7b305',
    opacity: 0.7,
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#555',
    fontSize: 16,
    fontWeight: '500',
  },
  passwordFormContainer: {
    padding: 12,
  },
  compactForm: {
    marginBottom: 10,
  },
  passwordInstructions: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 15,
    marginBottom: 4,
    fontWeight: '500',
    color: '#333',
  },
  changePasswordButton: {
    backgroundColor: '#f7b305',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    ...Platform.select({
      android: {
        elevation: 0,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
    }),
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  descriptionContainer: {
    padding: 20,
    alignItems: 'center',
  },
  descriptionText: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
    marginBottom: 20,
  },
  testButton: {
    backgroundColor: '#f7b305',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    ...Platform.select({
      android: {
        elevation: 2,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
    }),
  },
});

export default DeleteAccountScreen;
