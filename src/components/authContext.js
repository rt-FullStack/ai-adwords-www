// src/components/authContext.js - CORRECTED VERSION
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { auth, db } from '@/firebase/firebase'; // Make sure this path is correct
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userSubscription, setUserSubscription] = useState(null);
  const [signOutCallback, setSignOutCallback] = useState(null);
  const [userStatus, setUserStatus] = useState(null);
  const router = useRouter();

  // Sign up with email and password
  const signUp = async (email, password, displayName) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update profile with display name
      await updateProfile(user, { displayName });
      
      // Create user document in Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: displayName,
        createdAt: new Date(),
        aiSlots: 0,
        subscriptionStatus: "INACTIVE"
      });
      
      return user;
    } catch (error) {
      console.error("Sign up error:", error);
      throw error;
    }
  };

  // Sign in with email and password
  const signInWithEmail = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error("Email sign in error:", error);
      throw error;
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      console.log("Starting Google sign in...");
      
      const provider = new GoogleAuthProvider();
      
      // Add scopes
      provider.addScope('profile');
      provider.addScope('email');
      
      // Set custom parameters
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      console.log("Provider created, attempting sign in with popup...");
      
      // Sign in with popup
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      console.log("Google sign in successful, user:", user.email);
      
      // Check if user exists in Firestore
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        console.log("Creating new user document in Firestore...");
        // Create new user document
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          createdAt: new Date(),
          aiSlots: 0,
          subscriptionStatus: "INACTIVE",
          provider: "google"
        });
        console.log("User document created");
      } else {
        console.log("User already exists in Firestore");
      }
      
      return user;
    } catch (error) {
      console.error("Detailed Google sign in error:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      throw error;
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      if (signOutCallback) {
        signOutCallback();
      }
    } catch (error) {
      console.error("Sign out error:", error);
      throw error;
    }
  };

  // Reset password
  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error("Reset password error:", error);
      throw error;
    }
  };

  // Fetch user subscription
  const fetchUserSubscription = useCallback(async (userId) => {
    if (!userId) return;
    
    try {
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserSubscription({
          subscriptionStatus: userData.subscriptionStatus || "INACTIVE",
          plan: userData.plan || "free",
          aiSlots: userData.aiSlots || 0
        });
      }
    } catch (error) {
      console.error("Error fetching user subscription:", error);
    }
  }, []);

  // Auth state listener
  useEffect(() => {
    console.log("Setting up auth state listener...");
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("Auth state changed, user:", user?.email);
      setCurrentUser(user);
      
      if (user) {
        console.log("User is authenticated, fetching subscription...");
        // Fetch user subscription data
        await fetchUserSubscription(user.uid);
        
        // Update user status
        setUserStatus("authenticated");
      } else {
        console.log("User is not authenticated");
        setUserSubscription(null);
        setUserStatus("unauthenticated");
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, [fetchUserSubscription]);

  const value = {
    currentUser,
    loading,
    userSubscription,
    signUp,
    signInWithEmail,
    signInWithGoogle,
    signOut,
    resetPassword,
    setSignOutCallback: (callback) => setSignOutCallback(() => callback),
    setUserStatus,
    userStatus
  };

  console.log("AuthProvider rendering, loading:", loading);

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};