import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBHFZB9455Y8KmucLkNpzd2X2sEpjg7r3k",
  authDomain: "nexus-it-44cb1.firebaseapp.com",
  projectId: "nexus-it-44cb1",
  storageBucket: "nexus-it-44cb1.appspot.com",
  messagingSenderId: "505288933029",
  appId: "1:505288933029:web:b18b502726f9eb1d9e974c",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
// Use React Native AsyncStorage for auth persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;