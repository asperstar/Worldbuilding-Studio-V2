// src/utils/visionAPI.js
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth } from '../firebase';

export const analyzeImage = async (file) => {
  try {
    // Need to be authenticated
    if (!auth.currentUser) {
      throw new Error('Must be logged in to analyze images');
    }
    
    // 1. Upload image to Firebase Storage
    const storage = getStorage();
    const storageRef = ref(storage, `images/${auth.currentUser.uid}/${Date.now()}-${file.name}`);
    await uploadBytes(storageRef, file);
    
    // 2. Get download URL
    const imageUrl = await getDownloadURL(storageRef);
    
    // 3. Call Cloud Function
    const functions = getFunctions();
    const analyzeImageFn = httpsCallable(functions, 'analyzeImage');
    const result = await analyzeImageFn({ imageUrl });
    
    return result.data;
  } catch (error) {
    console.error("Error analyzing image:", error);
    throw error;
  }
};