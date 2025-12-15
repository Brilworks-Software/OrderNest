import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence, Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, Analytics } from 'firebase/analytics';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration
  
 
// Firebase configuration from Expo Constants
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let analytics: Analytics | null = null;

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

  // Initialize Analytics (only supported on web)
  if (Platform.OS === 'web') {
    try {
      // Check if analytics is supported before initializing
      // For web, we can initialize synchronously
      if (typeof window !== 'undefined') {
        analytics = getAnalytics(app);
      }
    } catch (error) {
      console.warn('Error initializing Firebase Analytics:', error);
      analytics = null;
    }
  }

export { app, auth, db, storage, analytics };
