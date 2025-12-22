// src/firebase/firebase.js - UPDATED WITH DEBUGGING
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

console.log('=== FIREBASE CONFIG DEBUG ===');
console.log('Environment loaded:', typeof window !== 'undefined' ? 'CLIENT' : 'SERVER');
console.log('API Key exists:', !!firebaseConfig.apiKey);
console.log('Project ID exists:', !!firebaseConfig.projectId);
console.log('Auth Domain exists:', !!firebaseConfig.authDomain);
console.log('Full config:', {
  apiKey: firebaseConfig.apiKey ? 'SET' : 'MISSING',
  authDomain: firebaseConfig.authDomain ? 'SET' : 'MISSING',
  projectId: firebaseConfig.projectId ? 'SET' : 'MISSING',
  appId: firebaseConfig.appId ? 'SET' : 'MISSING',
});

// Initialize Firebase
let app, auth, db;

if (typeof window !== 'undefined') {
  console.log('Initializing Firebase on client side...');
  
  try {
    const existingApps = getApps();
    console.log('Existing Firebase apps:', existingApps.length);
    
    if (existingApps.length > 0) {
      app = existingApps[0];
      console.log('Using existing Firebase app');
    } else {
      // Validate config before initializing
      if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
        console.error('Firebase configuration is incomplete. Missing:', {
          apiKey: !firebaseConfig.apiKey,
          projectId: !firebaseConfig.projectId,
          authDomain: !firebaseConfig.authDomain,
          appId: !firebaseConfig.appId
        });
      } else {
        console.log('Creating new Firebase app...');
        app = initializeApp(firebaseConfig);
        console.log('Firebase app created successfully');
      }
    }
    
    if (app) {
      auth = getAuth(app);
      db = getFirestore(app);
      console.log('Firebase auth and firestore initialized');
    } else {
      console.error('Firebase app not created - check configuration');
    }
    
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
} else {
  console.log('Server side - skipping Firebase initialization');
}

console.log('Final Firebase instances:', { 
  app: !!app, 
  auth: !!auth, 
  db: !!db 
});

export { app, auth, db };