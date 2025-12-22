// /firebase/firebase.js
import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Debug logging for production (will only show in browser console)
const logConfig = () => {
  if (typeof window !== 'undefined') {
    console.log("Firebase Config Loaded:", {
      hasApiKey: !!firebaseConfig.apiKey,
      apiKeyPrefix: firebaseConfig.apiKey?.substring(0, 10) + '...',
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId,
      isClient: typeof window !== 'undefined'
    });
  }
};

// Initialize Firebase only once
let app;
let auth;
let db;
let googleProvider;

try {
  // Check if Firebase is already initialized
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    logConfig();
  } else {
    app = getApps()[0];
  }

  // Initialize services
  auth = getAuth(app);
  db = getFirestore(app);
  
  // Configure Google Auth Provider
  googleProvider = new GoogleAuthProvider();
  
  // Optional: Add custom parameters
  googleProvider.setCustomParameters({
    prompt: 'select_account',
    login_hint: 'syedur.webb@gmail.com' // Pre-fill email for testing
  });
  
  // Add scopes if needed
  googleProvider.addScope('email');
  googleProvider.addScope('profile');
  
  // Set persistence for web
  if (typeof window !== 'undefined') {
    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        console.log("Firebase persistence set to LOCAL");
      })
      .catch((error) => {
        console.error("Error setting persistence:", error);
      });
  }
  
} catch (error) {
  console.error("Firebase initialization error:", error);
  
  // Create fallback mock objects to prevent app crash
  if (typeof window !== 'undefined') {
    auth = { currentUser: null };
    db = {};
    googleProvider = {};
  }
}

export { auth, db, googleProvider };