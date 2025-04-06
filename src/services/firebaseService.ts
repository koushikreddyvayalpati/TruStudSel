import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAYRBEbZO-bKlXdjckswIuqbXEgK-JR4m0",
  authDomain: "trustudsel.firebaseapp.com",
  projectId: "trustudsel",
  storageBucket: "trustudsel.appspot.com",
  messagingSenderId: "772246629586",
  appId: "1:772246629586:web:8d2a8f9a0f53e5bdf975b5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// We're not using Firebase Auth for authentication as per user request
// The app will continue using AWS Cognito for authentication
// Firebase Auth is only initialized for Firebase internal usage

/**
 * Add a new user to Firebase Firestore
 * @param email User's email address
 * @param name User's name
 * @param phoneNumber User's phone number (optional)
 * @param additionalData Any additional user data (optional)
 * @returns Promise that resolves when the user is added successfully
 */
export const addUserToFirebase = async (
  email: string,
  name?: string,
  phoneNumber?: string,
  additionalData?: Record<string, any>
): Promise<void> => {
  try {
    // Create a document in the users collection with email as the document ID
    const userRef = doc(db, 'users', email);
    
    // Prepare user data
    const userData = {
      email,
      name: name || '',
      phoneNumber: phoneNumber || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isOnline: true,
      lastSeen: serverTimestamp(),
      ...additionalData
    };
    
    // Add the user to Firestore
    await setDoc(userRef, userData);
    
    console.log('[FirebaseService] User added successfully:', email);
    return;
  } catch (error) {
    console.error('[FirebaseService] Error adding user to Firebase:', error);
    throw error;
  }
};

export { app, db, auth }; 