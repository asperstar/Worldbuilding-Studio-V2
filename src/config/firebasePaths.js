//src/config/firebasePaths.js 

export const FIREBASE_PATHS = {
    CHARACTERS: (userId) => `users/${userId}/characters`,
    ENVIRONMENTS: (userId) => `users/${userId}/environments`,
    WORLDS: (userId) => `users/${userId}/worlds`,
    CAMPAIGNS: (userId) => `users/${userId}/campaigns`,
    MAPS: (userId) => `users/${userId}/maps`,
    TIMELINES: (userId) => `users/${userId}/timelines`,
  };

  //need to replace all paths with these 
  //show me how 