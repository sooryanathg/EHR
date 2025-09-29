import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBHFZB9455Y8KmucLkNpzd2X2sEpjg7r3k",
  authDomain: "nexus-it-44cb1.firebaseapp.com",
  projectId: "nexus-it-44cb1",
  storageBucket: "nexus-it-44cb1.appspot.com",
  messagingSenderId: "505288933029",
  appId: "1:505288933029:web:b18b502726f9eb1d9e974c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;