import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';

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
      const storedHashedPIN = await AsyncStorage.getItem(PIN_KEY);
      if (!storedHashedPIN) return false;
      
      const hashedInputPIN = AuthService.hashPIN(pin);
      return storedHashedPIN === hashedInputPIN;
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
      await AsyncStorage.multiRemove([PIN_KEY, USER_ROLE_KEY]);
      return true;
    } catch (error) {
      console.error('Error clearing PIN:', error);
      return false;
    }
  }
};