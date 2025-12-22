
"use client";
import { FcGoogle } from "react-icons/fc";
import { FaCheck } from "react-icons/fa6";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { auth, googleProvider } from "@/firebase/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
  updateProfile,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  confirmPasswordReset,
  signOut,
} from "firebase/auth";
import { setDoc, getDoc, doc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "./authContext";
import { db } from "@/firebase/firebase";
import PaymentModal from "./paymentModal";
import PayPalButton from "@/firebase/paypal";
import ErrorModal from "./ErrorModal";

import Icon from "@mdi/react";
import { mdiEyeOutline } from "@mdi/js";
import { mdiEyeOffOutline } from "@mdi/js";

export default function Auth({ onClose }) {
  //sign in
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  // register
  const [regshow, setRegShow] = useState(false);
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  // messages- error, success
  const [error, setError] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [registrationMessage, setRegistrationMessage] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [forgotPassword, setForgotPassword] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState("");
  const [paymentModalTimeoutId, setPaymentModalTimeoutId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPaymentDueToSignIn, setShowPaymentDueToSignIn] = useState(false);
  const [purchaseType, setPurchaseType] = useState("subscription");
  const [selectedAiSlotAmount, setSelectedAiSlotAmount] = useState(0);
  const [sessionTokens, setSessionTokens] = useState([]);

  // state for the user/loggedin
  const [user, setUser] = useState(auth.currentUser);
  const { currentUser, signOut, setUserStatus, updateDisplayName } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const searchParams = useSearchParams();
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      if (authUser) {
        setUser(authUser);
        setUserStatus(authUser);
        updateDisplayName(authUser.displayName);
      }
      setUser(authUser);
    });

    return () => unsubscribe();
  }, [setUser, setUserStatus, updateDisplayName]);

  useEffect(() => {
    // Check URL parameters for pre-selected plan or AI slot amount
    if (searchParams) {
      const plan = searchParams.get("plan");
      const type = searchParams.get("type");
      const amount = searchParams.get("amount");

      if (plan) {
        setSelectedSubscription(plan);
        setPurchaseType("subscription");
      } else if (type === "ai_slots" && amount) {
        setSelectedAiSlotAmount(parseInt(amount));
        setPurchaseType("ai_slots");
      }
    }
  }, [searchParams]);

  const handleClose = () => {
    onClose();
  };

  // Function to open the payment modal
  const openPaymentModal = () => {
    setShowPaymentModal(true);
    // Set timeout to close the payment modal after 7 seconds
    const timeoutId = setTimeout(() => {
      setShowPaymentModal(false);
    }, 5000); // 5 seconds
    setPaymentModalTimeoutId(timeoutId);
  };

  // Function to close the payment modal
  const closePaymentModal = () => {
    setShowPaymentModal(false);
    // Clear the timeout if the modal is closed manually before the timeout
    clearTimeout(paymentModalTimeoutId);
  };

  // Cleanup the timeout when the component unmounts
  useEffect(() => {
    return () => {
      if (paymentModalTimeoutId) {
        clearTimeout(paymentModalTimeoutId);
      }
    };
  }, [paymentModalTimeoutId]); // Added missing dependency

  const getSubscriptionDetails = (type) => {
    const details = {
      standard: { sessions: 1, aiSlots: 25, price: 1950 },
      pro: { sessions: 2, aiSlots: 100, price: 2995 },
      enterprise: { sessions: 10, aiSlots: 200, price: 19990 },
      developer: { sessions: 600, aiSlots: 999999, price: 0 },
    };
    return details[type] || { sessions: 0, aiSlots: 0, price: 0 };
  };

  const generateSessionTokens = (count) => {
    return Array.from({ length: count }, () => Math.random().toString(36).substring(2) + Date.now().toString(36));
  };

  const handlePaymentSuccess = async (subscriptionId, subscriptionStatus) => {
    try {
      const userRef = doc(db, "users", email);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        // Create new user
        await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(userRef, {
          name,
          email,
          subscriptionId,
          subscriptionStatus,
          subscriptionType: selectedSubscription,
          aiSlots: purchaseType === "subscription" ? getSubscriptionDetails(selectedSubscription).aiSlots : selectedAiSlotAmount,
          sessionTokens:
            purchaseType === "subscription" ? generateSessionTokens(getSubscriptionDetails(selectedSubscription).sessions) : [],
          createdAt: new Date().toISOString(),
        });
      } else {
        // Update existing user
        const updateData = {
          subscriptionId,
          subscriptionStatus,
          subscriptionType: selectedSubscription,
          aiSlots:
            purchaseType === "subscription"
              ? getSubscriptionDetails(selectedSubscription).aiSlots
              : userDoc.data().aiSlots + selectedAiSlotAmount,
          sessionTokens:
            purchaseType === "subscription"
              ? generateSessionTokens(getSubscriptionDetails(selectedSubscription).sessions)
              : userDoc.data().sessionTokens,
        };
        await setDoc(userRef, updateData, { merge: true });
      }

      router.push("/dashboard");
    } catch (error) {
      setError("Error processing payment: " + error.message);
    }
  };

  function toggleReg() {
    setRegShow(!regshow);
    setRegistrationMessage(""); // Clear the registration message
    setForgotPassword(false); // Clear the forgot password state
  }

  const isAllowedEmail = async (email) => {
    if (!email) return false;

    try {
      console.log("Checking email:", email);

      // Check if email has @wgp.se domain first
      const domain = email.toLowerCase().split("@")[1];
      if (domain === "wgp.se") {
        console.log("Email has @wgp.se domain, allowing access");
        return true;
      }

      // Check the whitelist in Firestore
      const docRef = doc(db, "whitelist", email.toLowerCase());
      console.log("Checking Firestore whitelist for:", email.toLowerCase());
      const docSnap = await getDoc(docRef);
      console.log("Whitelist check result:", docSnap.exists());
      return docSnap.exists();
    } catch (error) {
      console.error("Error checking email:", error);
      return false;
    }
  };

  async function signIn(e) {
    e.preventDefault();
    setErrorMessage("");

    try {
      // Check if email is allowed before attempting sign in
      const isAllowed = await isAllowedEmail(email);
      if (!isAllowed) {
        setErrorModalMessage("This email is not authorized to access the application.");
        setShowErrorModal(true);
        return;
      }

      // First authenticate the user
      const { user } = await signInWithEmailAndPassword(auth, email, password);

      // Then check if user exists and has available sessions
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log("Found user data:", userData); // Debug log

        // Check if user has an active subscription
        if (userData.subscriptionStatus !== "ACTIVE") {
          console.log("Setting subscription status to ACTIVE"); // Debug log
          await setDoc(
            userRef,
            {
              subscriptionStatus: "ACTIVE",
            },
            { merge: true }
          );
        }

        // Check if there are any available sessions
        const availableSessions = userData.sessionTokens?.length || 0;
        const activeSessionsCount = Object.keys(userData.activeSessions || {}).length;
        const totalSessions = availableSessions + activeSessionsCount;

        if (totalSessions === 0) {
          // Only generate a new session if there are no sessions at all
          console.log("No sessions available, generating a new one"); // Debug log
          const newSessionToken = generateSessionTokens(1)[0];
          await setDoc(
            userRef,
            {
              sessionTokens: [newSessionToken],
            },
            { merge: true }
          );
          userData.sessionTokens = [newSessionToken];
        } else if (availableSessions === 0 && activeSessionsCount > 0) {
          // If all sessions are active and there are active sessions, sign out and show error
          await signOut(auth);
          setErrorModalMessage("Maximum number of active sessions reached. Please sign out from other devices first.");
          setShowErrorModal(true);
          return;
        }

        // Get the first available token
        const sessionToken = userData.sessionTokens[0];

        // Create or update active sessions
        const activeSessions = userData.activeSessions || {};
        activeSessions[sessionToken] = {
          lastActive: serverTimestamp(),
          deviceInfo: navigator.userAgent,
        };

        console.log("Updating user document with:", {
          activeSessions,
          remainingTokens: userData.sessionTokens.filter((token) => token !== sessionToken),
        });

        // Update the user document with both active sessions and remaining tokens
        await setDoc(
          userRef,
          {
            activeSessions: activeSessions,
            sessionTokens: userData.sessionTokens.filter((token) => token !== sessionToken),
          },
          { merge: true }
        );

        let displayName = userData.displayName || name;
        await updateProfile(user, { displayName });
        setError(null);
        updateDisplayName(displayName);
        setUser(auth.currentUser);
        handleClose();
      } else {
        throw new Error("User document not found");
      }
    } catch (err) {
      console.error("Sign-in error:", err);
      // Sign out the user if there was an error after authentication
      if (auth.currentUser) {
        await signOut(auth);
      }
      setErrorModalMessage("Oops! The email or password you entered is incorrect. Please double-check and try again.");
      setShowErrorModal(true);
    }
  }

  async function signInWithGoogle() {
    try {
      await setPersistence(auth, browserLocalPersistence);
      
      // Step a: Sign in with popup
      const result = await signInWithPopup(auth, googleProvider);
      console.log("[signInWithGoogle] signInWithPopup resolved:", result.user);

      // Step b: Wait for auth.currentUser to be fully set
      console.log("[signInWithGoogle] waiting for onAuthStateChanged...");
      await new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          if (user) {
            console.log("[signInWithGoogle] onAuthStateChanged triggered:", user.email);
            unsubscribe();
            resolve();
          }
        });
      });

      // Step c: Now it's safe to use `auth.currentUser` and call Firestore
      const user = auth.currentUser;
      console.log("[signInWithGoogle] auth.currentUser after wait:", user?.email);

      if (!user) return;

      // Step 1: Check if email is allowed
      if (!isAllowedEmail(user.email)) {
        await signOut(auth);
        setErrorModalMessage("This email is not authorized to access the application.");
        setShowErrorModal(true);
        return;
      }

      const uid = user.uid;
      const userEmail = user.email;
      const userRef = doc(db, "users", uid);
      const userDoc = await getDoc(userRef);
      let displayName = "";

      if (userDoc.exists()) {
        const userData = userDoc.data();

        // Step 2: Cleanup stale sessions (older than 2h)
        const sessionTimeout = 2 * 60 * 60 * 1000; // 2 hours
        const now = Date.now();
        const rawSessions = userData.activeSessions || {};
        const activeSessions = {};

        for (const [token, session] of Object.entries(rawSessions)) {
          const lastActive = session.lastActive?.toMillis?.();
          if (lastActive && now - lastActive < sessionTimeout) {
            activeSessions[token] = session;
          }
        }

        if (Object.keys(activeSessions).length !== Object.keys(rawSessions).length) {
          await setDoc(userRef, { activeSessions }, { merge: true });
        }

        // Step 3: Count available and active sessions
        const availableSessions = userData.sessionTokens?.length || 0;
        const activeSessionsCount = Object.keys(activeSessions).length;
        const totalSessions = availableSessions + activeSessionsCount;

        // Step 4: Handle session limits
        if (totalSessions === 0) {
          console.log("No sessions available, generating a new one");
          const newSessionToken = generateSessionTokens(1)[0];
          userData.sessionTokens = [newSessionToken];
          await setDoc(userRef, { sessionTokens: userData.sessionTokens }, { merge: true });
        } else if (availableSessions === 0) {
          await signOut(auth);
          setErrorModalMessage("Maximum number of active sessions reached. Please sign out from other devices first.");
          setShowErrorModal(true);
          return;
        }

        // Step 5: Finalize active session
        const freshDoc = await getDoc(userRef);
        const freshData = freshDoc.data();
        displayName = freshData.displayName || user.displayName || "";
        const sessionToken = freshData.sessionTokens[0];

        activeSessions[sessionToken] = {
          lastActive: serverTimestamp(),
          deviceInfo: navigator.userAgent,
          createdAt: serverTimestamp(),
        };

        await setDoc(
          userRef,
          {
            activeSessions,
            sessionTokens: freshData.sessionTokens.filter((token) => token !== sessionToken),
            lastLoginAt: serverTimestamp(),
          },
          { merge: true }
        );
      } else {
        // Step 6: New Google user setup
        displayName = user.displayName || "";
        const newSessionToken = generateSessionTokens(1)[0];
        await setDoc(userRef, {
          name: displayName,
          email: userEmail,
          displayName,
          createdAt: serverTimestamp(),
          subscriptionStatus: "ACTIVE",
          subscriptionType: "developer",
          aiSlots: 999999,
          sessionTokens: [], // Already used
          activeSessions: {
            [newSessionToken]: {
              lastActive: serverTimestamp(),
              deviceInfo: navigator.userAgent,
              createdAt: serverTimestamp(),
            },
          },
        });
      }

      // Step 7: Finalize auth state
      await updateProfile(user, { displayName });
      setUser(auth.currentUser);
      handleClose();

    } catch (err) {
      console.error("Google sign-in error:", err);
      setErrorModalMessage("Error signing in with Google. Please try again.");
      setShowErrorModal(true);
    }
  }

  const resetUserSessions = async (userEmail) => {
    try {
      console.log("Starting session reset for:", userEmail);

      if (!user) {
        console.error("No user available to reset sessions.");
        return false;
      }

      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const subscriptionType = userData.subscriptionType || "standard";

        console.log("Found user document:", {
          subscriptionType,
          currentSessions: userData.sessionTokens?.length || 0,
        });

        // Get the number of sessions for this subscription type
        const sessionCount = getSubscriptionDetails(subscriptionType).sessions;

        // Generate new session tokens
        const newSessionTokens = generateSessionTokens(sessionCount);

        // Update the user document with new session tokens and clear active sessions
        const updateData = {
          sessionTokens: newSessionTokens,
          activeSessions: {},
          lastSessionReset: serverTimestamp(),
        };

        console.log("Updating user with new sessions:", {
          newSessionCount: newSessionTokens.length,
          subscriptionType,
        });

        await setDoc(doc(db, "users", user.uid), updateData, { merge: true });

        console.log("Sessions reset successfully");
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error resetting sessions:", error);
      return false;
    }
  };

  {/* Commented out handleSignOut function */}

  async function handleResetPassword() {
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetMessage("Password reset email sent. Check your inbox.");
    } catch (error) {
      console.error(error);
      setResetMessage("Error sending password reset email.");
    }
  }
  
  async function handleConfirmPasswordReset(newPassword, oobCode) {
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      console.log("Password reset successful!");
    } catch (error) {
      console.log(error);
    }
  }

  async function handleRegistration(e) {
    e.preventDefault();
    setRegistrationMessage("");

    try {
      // Check if email is allowed before attempting registration
      const isAllowed = await isAllowedEmail(regEmail);
      if (!isAllowed) {
        setErrorModalMessage("This email is not authorized to create an account.");
        setShowErrorModal(true);
        return;
      }

      // Validate password length before attempting registration
      if (regPassword.length < 6) {
        setErrorModalMessage("Password must be at least 6 characters long.");
        setShowErrorModal(true);
        return;
      }

      const { user } = await createUserWithEmailAndPassword(auth, regEmail, regPassword);
      await updateProfile(user, { displayName: name });

      // Generate initial session token
      const initialSessionToken = generateSessionTokens(1)[0];

      // Create user document with one available session token
      await setDoc(doc(db, "users", user.uid), {
        name,
        email: regEmail,
        displayName: name,
        createdAt: serverTimestamp(),
        sessionTokens: [initialSessionToken], // Store the token as available
        activeSessions: {}, // No active sessions initially
        aiSlots: 0, // No AI slots until purchased
      });

      // Sign out the user after registration
      await signOut(auth);

      setRegistrationMessage("Registration successful! Please sign in with your new account.");
      setRegShow(false);

      // Clear registration form
      setName("");
      setRegEmail("");
      setRegPassword("");
    } catch (error) {
      console.error("Registration error:", error);
      let errorMessage = "Registration failed. Please try again.";

      // Handle specific Firebase error codes
      switch (error.code) {
        case "auth/email-already-in-use":
          errorMessage = "This email is already registered. Please sign in instead.";
          break;
        case "auth/invalid-email":
          errorMessage = "Please enter a valid email address.";
          break;
        case "auth/operation-not-allowed":
          errorMessage = "Email/password accounts are not enabled. Please contact support.";
          break;
        case "auth/weak-password":
          errorMessage = "Password is too weak. Please use at least 6 characters.";
          break;
        case "auth/network-request-failed":
          errorMessage = "Network error. Please check your internet connection and try again.";
          break;
        default:
          errorMessage = "Registration failed. Please try again.";
      }

      setErrorModalMessage(errorMessage);
      setShowErrorModal(true);
    }
  }

  return (
    <div className="bg-white p-8 rounded-2xl w-96">
      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        message={errorModalMessage}
      />
      {!regshow ? (
        // Sign In View
        <>
          <h1
            className="text-3xl font-bold mb-2"
            style={{ marginBottom: "2rem" }}>
            Sign in with Google
          </h1>
          <button
            onClick={signInWithGoogle}
            className="flex items-center justify-center w-full border border-gray-300 rounded-2xl p-3 hover:bg-gray-100">
            <FcGoogle
              size={20}
              className="mr-2"
            />{" "}
            Google
          </button>
          {forgotPassword && (
            <div className="mt-4">
              <input
                className="border border-gray-300 rounded-lg p-3 w-full text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                type="email"
                placeholder="Enter your email for reset link"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
              />
              <button
                className="bg-blue-500 text-white rounded-lg p-3 w-full mt-2 hover:bg-blue-600"
                onClick={handleResetPassword}>
                Reset Password
              </button>
              {resetMessage && <p className="text-green-500 text-sm mt-2">{resetMessage}</p>}
            </div>
          )}
        </>
      ) : (
        // Registration View (commented out)
        <></>
      )}
    </div>
  );
}
