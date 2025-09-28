import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';

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

  // Verify ASHA PIN
  verifyASHA_PIN: async (pin) => {
    try {
      const storedPIN = await AsyncStorage.getItem(PIN_KEY);
      const hashedPIN = AuthService.hashPIN(pin);
      return storedPIN === hashedPIN;
    } catch (error) {
      console.error('Error verifying PIN:', error);
      return false;
    }
  },

  // PHC Staff login with Firebase
  loginPHCStaff: async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await AsyncStorage.setItem(USER_ROLE_KEY, 'phc');
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('PHC login error:', error);
      return { success: false, error: error.message };
    }
  },

  // Create PHC Staff account
  createPHCStaff: async (email, password) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await AsyncStorage.setItem(USER_ROLE_KEY, 'phc');
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('PHC account creation error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get current user role
  getUserRole: async () => {
    try {
      const role = await AsyncStorage.getItem(USER_ROLE_KEY);
      return role;
    } catch (error) {
      console.error('Error getting user role:', error);
      return null;
    }
  },

  // Logout
  logout: async () => {
    try {
      await AsyncStorage.removeItem(USER_ROLE_KEY);
      // Don't remove PIN for ASHA users
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  },

  // Check if user is logged in
  isLoggedIn: async () => {
    try {
      const role = await AsyncStorage.getItem(USER_ROLE_KEY);
      return role !== null;
    } catch (error) {
      console.error('Error checking login status:', error);
      return false;
    }
  },

  // Encrypt sensitive data
  encryptData: (data) => {
    return CryptoJS.AES.encrypt(JSON.stringify(data), SECRET_KEY).toString();
  },

  // Decrypt sensitive data
  decryptData: (encryptedData) => {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, SECRET_KEY);
      return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    } catch (error) {
      console.error('Decryption error:', error);
      return null;
    }
  }
};

