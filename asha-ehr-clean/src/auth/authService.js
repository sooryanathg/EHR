import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';
import { auth, db } from '../lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, signInAnonymously } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

const PIN_KEY = 'asha_pin';
const USER_ROLE_KEY = 'user_role';
const SECRET_KEY = 'asha_ehr_secret_key_2024';

export const AuthService = {
  // Hash PIN using SHA-256
  hashPIN: (pin) => {
    return CryptoJS.SHA256(pin).toString();
  },

  // Set ASHA PIN
  setASHA_PIN: async (pin) => {
    try {
      const hashedPIN = AuthService.hashPIN(pin);
      await AsyncStorage.setItem(PIN_KEY, hashedPIN);
      await AsyncStorage.setItem(USER_ROLE_KEY, 'asha');
      return true;
    } catch (error) {
      console.error('Error setting PIN:', error);
      return false;
    }
  },

  // Register ASHA using email/password in Firebase
  // Accept optional name to create a users/{uid} profile in Firestore
  registerASHA: async (email, password, name = '') => {
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      await AsyncStorage.setItem(USER_ROLE_KEY, 'asha');
      // persist firebase uid for sync
      if (userCred && userCred.user && userCred.user.uid) {
        const uid = userCred.user.uid;
        await AsyncStorage.setItem('firebase_uid', uid);

        // Create a basic user profile document so PHC can show names
        try {
          await setDoc(doc(db, 'users', uid), {
            name: name || '',
            email: email || '',
            role: 'asha',
            created_at: new Date().toISOString()
          });
        } catch (profileErr) {
          console.warn('Failed to write ASHA profile to users collection:', profileErr);
        }
      }
      return userCred.user;
    } catch (error) {
      console.error('Error registering ASHA:', error);
      throw error;
    }
  },

  // Login ASHA using Firebase email/password
  loginASHA: async (email, password) => {
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      await AsyncStorage.setItem(USER_ROLE_KEY, 'asha');
      await AsyncStorage.setItem('asha_email', email);
      await AsyncStorage.setItem('asha_password', password);
      
      if (userCred && userCred.user && userCred.user.uid) {
        const uid = userCred.user.uid;
        await AsyncStorage.setItem('firebase_uid', uid);
        
        // Ensure user document exists
        try {
          await setDoc(doc(db, 'users', uid), {
            email: email,
            role: 'asha',
            updated_at: new Date().toISOString()
          }, { merge: true });
        } catch (err) {
          console.warn('Failed to update user document:', err);
        }

        // Assign any unassigned patients to this ASHA
        try {
          const { PatientService } = require('../database/patientService');
          await PatientService.assignUnassignedPatientsToCurrentAsha();
        } catch (err) {
          console.warn('Failed to assign patients to ASHA:', err);
        }
      }
      return userCred.user;
    } catch (error) {
      console.error('Error logging in ASHA:', error);
      throw error;
    }
  },

  // Verify ASHA PIN
  verifyASHA_PIN: async (pin) => {
    try {
      const storedHashedPIN = await AsyncStorage.getItem(PIN_KEY);
      if (!storedHashedPIN) return false;
      
      const hashedInputPIN = AuthService.hashPIN(pin);
      const isValid = storedHashedPIN === hashedInputPIN;
      if (isValid) {
        // Ensure we have a proper Firebase user signed in, not anonymous
        try {
          const currentUser = auth.currentUser;
          if (!currentUser || currentUser.isAnonymous) {
            // Try to get stored email/password from AsyncStorage
            const email = await AsyncStorage.getItem('asha_email');
            const password = await AsyncStorage.getItem('asha_password');
            
            if (email && password) {
              await AuthService.loginASHA(email, password);
            } else {
              console.warn('No stored credentials for Firebase login');
            }
          }
        } catch (firebaseError) {
          console.warn('Firebase sign-in failed:', firebaseError);
        }
      }

      return isValid;
    } catch (error) {
      console.error('Error verifying PIN:', error);
      return false;
    }
  },

  // Check if PIN is set
  isPINSet: async () => {
    try {
      const pin = await AsyncStorage.getItem(PIN_KEY);
      return pin !== null;
    } catch (error) {
      console.error('Error checking PIN:', error);
      return false;
    }
  },

  // Clear stored PIN (for logout)
  clearPIN: async () => {
    try {
      await AsyncStorage.multiRemove([PIN_KEY, USER_ROLE_KEY, 'firebase_uid']);
      // Also sign out from Firebase when clearing local PIN
      try {
        await signOut(auth);
      } catch (firebaseSignOutError) {
        console.warn('Firebase signOut failed:', firebaseSignOutError);
      }
      return true;
    } catch (error) {
      console.error('Error clearing PIN:', error);
      return false;
    }
  }

  ,

  // Logout helper: sign out from Firebase and clear stored uid and role
  logout: async () => {
    try {
      try {
        await signOut(auth);
      } catch (e) {
        console.warn('Firebase signOut failed during logout:', e);
      }
      await AsyncStorage.multiRemove([USER_ROLE_KEY, 'firebase_uid', PIN_KEY]);
      return true;
    } catch (error) {
      console.error('Error during logout:', error);
      return false;
    }
  }
};