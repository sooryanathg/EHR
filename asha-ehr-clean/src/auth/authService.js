import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const USER_ROLE_KEY = 'user_role';

export const AuthService = {

  // Register ASHA using email/password in Firebase
  // Accept optional name to create a users/{uid} profile in Firestore
  registerASHA: async (email, password, name = '') => {
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      await AsyncStorage.setItem(USER_ROLE_KEY, 'asha');
      if (name) {
        await AsyncStorage.setItem('asha_name', name);
      }
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
      // Clear any existing auth state first
      await AuthService.logout();
      
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      await AsyncStorage.setItem(USER_ROLE_KEY, 'asha');
      await AsyncStorage.setItem('asha_email', email);
      await AsyncStorage.setItem('asha_password', password);
      // Store login timestamp for session expiry
      await AsyncStorage.setItem('asha_login_timestamp', Date.now().toString());
      // Get and store ASHA name and user ID
      if (userCred && userCred.user && userCred.user.uid) {
        const uid = userCred.user.uid;
        await AsyncStorage.setItem('firebase_uid', uid);
        
        try {
          // Try to get name from Firestore first
          const userDoc = await getDoc(doc(db, 'users', uid));
          const name = userDoc.exists() ? userDoc.data()?.name : '';
          
          if (name) {
            await AsyncStorage.setItem('asha_name', name);
          } else if (userCred.user.displayName) {
            await AsyncStorage.setItem('asha_name', userCred.user.displayName);
          }
        } catch (e) {
          console.warn('Failed to get ASHA name:', e);
          if (userCred.user.displayName) {
            await AsyncStorage.setItem('asha_name', userCred.user.displayName);
          }
        }
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

  // Check if current session is valid
  checkSession: async () => {
    try {
      // Force reload the current user state
      await auth.currentUser?.reload();
      
      const loginTimestamp = await AsyncStorage.getItem('asha_login_timestamp');
      const currentUser = auth.currentUser;
      const email = await AsyncStorage.getItem('asha_email');
      const uid = await AsyncStorage.getItem('firebase_uid');

      // If any of these are missing, session is invalid
      if (!loginTimestamp || !currentUser || !email || !uid) {
        await AuthService.logout();
        return false;
      }

      // Check if session has expired (7 days)
      const sessionAge = Date.now() - parseInt(loginTimestamp);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (sessionAge > sevenDays) {
        await AuthService.logout();
        return false;
      }

      // Verify Firebase auth matches stored UID
      if (!currentUser || currentUser.isAnonymous || currentUser.uid !== uid) {
        await AuthService.logout();
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking session:', error);
      await AuthService.logout();
      return false;
    }
  }

  ,

  // Logout helper: sign out from Firebase and clear all stored credentials
  logout: async () => {
    try {
      // Clear AsyncStorage first
      try {
        // Clear all authentication related items
        const keysToRemove = [
          USER_ROLE_KEY,
          'firebase_uid',
          'asha_email',
          'asha_password',
          'asha_login_timestamp',
          'asha_name'
        ];
        await AsyncStorage.multiRemove(keysToRemove);
        
        // Clear all AsyncStorage for complete cleanup
        await AsyncStorage.clear();
      } catch (e) {
        console.warn('AsyncStorage clear failed:', e);
      }

      // Sign out from Firebase
      try {
        await auth.signOut();
      } catch (e) {
        console.warn('Firebase signOut failed:', e);
      }

      // Force reload auth state
      auth.currentUser?.reload();

      return true;
    } catch (error) {
      console.error('Error during logout:', error);
      return false;
    }
  }
};