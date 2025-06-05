// src/services/storage.js - NEW FILE
import { 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    setDoc, 
    deleteDoc, 
    query, 
    where,
    orderBy 
  } from 'firebase/firestore';
  import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
  import { auth, db, storage } from '../firebase';
  
  // Helper to get current user ID
  const getCurrentUserId = () => {
    if (!auth.currentUser) {
      throw new Error('User not authenticated. Please log in.');
    }
    return auth.currentUser.uid;
  };
  
  // Helper to clean data for Firestore (removes undefined values)
  const cleanForFirestore = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(item => cleanForFirestore(item));
    }
    
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = typeof value === 'object' ? cleanForFirestore(value) : value;
      }
    }
    return cleaned;
  };
  
  // CHARACTERS
  export const characters = {
    async getAll() {
      const userId = getCurrentUserId();
      const snapshot = await getDocs(collection(db, `users/${userId}/characters`));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
  
    async getById(characterId) {
      const userId = getCurrentUserId();
      const docRef = doc(db, `users/${userId}/characters`, characterId);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
    },
  
    async save(character) {
      const userId = getCurrentUserId();
      const characterId = character.id || `char_${Date.now()}`;
      
      // Handle image upload if needed
      let imageUrl = character.imageUrl || '';
      if (character.imageFile) {
        const imageRef = ref(storage, `users/${userId}/characters/${characterId}`);
        await uploadBytes(imageRef, character.imageFile);
        imageUrl = await getDownloadURL(imageRef);
      }
      
      const characterData = cleanForFirestore({
        ...character,
        id: characterId,
        imageUrl,
        userId,
        updated: new Date().toISOString()
      });
      
      // Remove imageFile before saving to Firestore
      delete characterData.imageFile;
      
      await setDoc(doc(db, `users/${userId}/characters`, characterId), characterData);
      return { id: characterId, ...characterData };
    },
  
    async delete(characterId) {
      const userId = getCurrentUserId();
      await deleteDoc(doc(db, `users/${userId}/characters`, characterId));
    }
  };
  
  // WORLDS
  export const worlds = {
    async getAll() {
      const userId = getCurrentUserId();
      const snapshot = await getDocs(collection(db, `users/${userId}/worlds`));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
  
    async getById(worldId) {
      const userId = getCurrentUserId();
      const docRef = doc(db, `users/${userId}/worlds`, worldId);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
    },
  
    async save(world) {
      const userId = getCurrentUserId();
      const worldId = world.id || `world_${Date.now()}`;
      
      // Handle image upload if needed
      let imageUrl = world.imageUrl || '';
      if (world.imageFile) {
        const imageRef = ref(storage, `users/${userId}/worlds/${worldId}`);
        await uploadBytes(imageRef, world.imageFile);
        imageUrl = await getDownloadURL(imageRef);
      }
      
      const worldData = cleanForFirestore({
        ...world,
        id: worldId,
        imageUrl,
        userId,
        updated: new Date().toISOString()
      });
      
      delete worldData.imageFile;
      
      await setDoc(doc(db, `users/${userId}/worlds`, worldId), worldData);
      return { id: worldId, ...worldData };
    },
  
    async delete(worldId) {
      const userId = getCurrentUserId();
      await deleteDoc(doc(db, `users/${userId}/worlds`, worldId));
    }
  };
  
  // ENVIRONMENTS
  export const environments = {
    async getAll() {
      const userId = getCurrentUserId();
      const snapshot = await getDocs(collection(db, `users/${userId}/environments`));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
  
    async save(environment) {
      const userId = getCurrentUserId();
      const environmentId = environment.id || `env_${Date.now()}`;
      
      // Handle image upload if needed
      let imageUrl = environment.imageUrl || '';
      if (environment.imageFile) {
        const imageRef = ref(storage, `users/${userId}/environments/${environmentId}`);
        await uploadBytes(imageRef, environment.imageFile);
        imageUrl = await getDownloadURL(imageRef);
      }
      
      const environmentData = cleanForFirestore({
        ...environment,
        id: environmentId,
        imageUrl,
        userId,
        updated: new Date().toISOString()
      });
      
      delete environmentData.imageFile;
      
      await setDoc(doc(db, `users/${userId}/environments`, environmentId), environmentData);
      return { id: environmentId, ...environmentData };
    },
  
    async delete(environmentId) {
      const userId = getCurrentUserId();
      await deleteDoc(doc(db, `users/${userId}/environments`, environmentId));
    }
  };
  
  // CAMPAIGNS
  export const campaigns = {
    async getByWorldId(worldId) {
      const userId = getCurrentUserId();
      const q = query(
        collection(db, `users/${userId}/campaigns`),
        where('worldId', '==', parseInt(worldId))
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
  
    async getById(campaignId) {
      const userId = getCurrentUserId();
      const docRef = doc(db, `users/${userId}/campaigns`, campaignId);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
    },
  
    async save(campaign) {
      const userId = getCurrentUserId();
      const campaignId = campaign.id || `campaign_${Date.now()}`;
      
      const campaignData = cleanForFirestore({
        ...campaign,
        id: campaignId,
        userId,
        updated: new Date().toISOString()
      });
      
      await setDoc(doc(db, `users/${userId}/campaigns`, campaignId), campaignData);
      return { id: campaignId, ...campaignData };
    },
  
    async delete(campaignId) {
      const userId = getCurrentUserId();
      await deleteDoc(doc(db, `users/${userId}/campaigns`, campaignId));
    }
  };
  
  // TEST CONNECTION
  export const testConnection = async () => {
    try {
      const userId = getCurrentUserId();
      const snapshot = await getDocs(collection(db, `users/${userId}/characters`));
      return { 
        success: true, 
        message: 'Firebase connection successful',
        userId 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error.message 
      };
    }
  };