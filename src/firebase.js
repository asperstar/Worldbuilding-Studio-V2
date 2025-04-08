// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || '',
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.REACT_APP_FIREBASE_APP_ID || '',
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || null,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = firebaseConfig.measurementId ? getAnalytics(app) : null;
export const storage = getStorage(app); 
export const signIn = async (email, password) => {
  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error("Authentication error:", error.code, error.message);
    throw error;
  }
};

export default app;