import { initializeApp } from "firebase/app";
//import { getAnalytics } from "firebase/analytics";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  onAuthStateChanged  // Add this import
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getPerformance } from 'firebase/performance';

const firebaseConfig = {
  apiKey: process.env.react_app_firebase_api_key,
  authDomain: process.env.react_app_firebase_auth_domain,
  projectId: process.env.react_app_firebase_project_id,
  storageBucket: process.env.react_app_firebase_storage_bucket,
  messagingSenderId: process.env.react_app_firebase_messaging_sender_id,
  appId: process.env.react_app_firebase_app_id,
  measurementId: process.env.react_app_firebase_measurement_id
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
//const analytics = getAnalytics(app);

// Export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Authentication helper functions
export const signIn = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const signUp = (email, password) => createUserWithEmailAndPassword(auth, email, password);
export const logOut = () => signOut(auth);
export const perf = getPerformance(app);
export { onAuthStateChanged };