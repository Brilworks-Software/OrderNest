import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence, Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration
  
 
// Firebase configuration from Expo Constants
const firebaseConfig = {
  apiKey: "AIzaSyCmO2oLsmru-Z35mdJaCb8zR2qsSvFrJEk",
  authDomain: "ordernest-8da3a.firebaseapp.com",
  projectId: "ordernest-8da3a",
  storageBucket: "ordernest-8da3a.firebasestorage.app",
  messagingSenderId: "1036400538579",
  appId: "1:1036400538579:web:c1b3c8a0fd36cbf8fe7526",
  measurementId: "G-S8FTKCERNX"
};

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;

// Initialize Firebase services
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  
    // 💡 Only call initializeAuth immediately after app initialization
    if (Platform.OS === 'web') {
      auth = getAuth(app); // Web: No persistence needed here
    } else {
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    }
  } else {
    app = getApp();
    auth = getAuth(app); // Don't call initializeAuth again here!
  }
  const db = getFirestore(app);
  const storage = getStorage(app);

export { app, auth, db, storage };
