// src/components/modal.js - SIMPLIFIED VERSION FOR TESTING
import { useEffect, useState } from "react";
import React from "react";
import { IoMdClose } from "react-icons/io";
import { useAuth } from "./authContext";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Modal = ({ isOpen, onClose, setUserStatus, onSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signInWithEmail, signInWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOnClose = (e) => {
    if (e.target.id === "container") onClose();
  };

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter both email and password");
      return;
    }

    setLoading(true);
    try {
      await signInWithEmail(email, password);
      toast.success("Successfully signed in!");
      onClose();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Email sign in error:", error);
      toast.error(error.message || "Sign in failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      console.log("Attempting Google sign in...");
      
      // Test if signInWithGoogle exists
      if (typeof signInWithGoogle !== 'function') {
        console.error("signInWithGoogle is not a function:", signInWithGoogle);
        throw new Error("Google authentication is not properly configured. Please check authContext.js");
      }
      
      await signInWithGoogle();
      console.log("Google sign in successful!");
      
      toast.success("Successfully signed in with Google!");
      onClose();
      
      if (onSuccess) onSuccess();
      
      // Small delay before redirect
      setTimeout(() => {
        if (window.location.pathname !== "/account") {
          router.push("/account");
        }
      }, 500);
      
    } catch (error) {
      console.error("Detailed Google sign in error:", error);
      
      // Better error messages
      let errorMessage = "Google sign in failed. ";
      
      if (error.code) {
        switch(error.code) {
          case 'auth/popup-blocked':
            errorMessage += "Popup blocked! Please allow popups for this site.";
            break;
          case 'auth/popup-closed-by-user':
            errorMessage += "Sign in cancelled.";
            break;
          case 'auth/unauthorized-domain':
            errorMessage += "This domain is not authorized. Please contact support.";
            break;
          case 'auth/network-request-failed':
            errorMessage += "Network error. Check your internet connection.";
            break;
          default:
            errorMessage += error.message || "Please try again.";
        }
      } else {
        errorMessage += error.message || "Please check your Firebase configuration.";
      }
      
      toast.error(errorMessage);
      
      // Log more details for debugging
      console.log("Error code:", error.code);
      console.log("Error message:", error.message);
      console.log("Full error object:", error);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div
      onClick={handleOnClose}
      id="container"
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-sm z-[9999]"
    >
      <div
        className="relative bg-white rounded-lg shadow-lg w-full max-w-md p-8"
        style={{ boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)" }}
      >
        {/* Close button */}
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-xl"
          onClick={onClose}
        >
          <IoMdClose />
        </button>

        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">AdSaver</h2>
          <p className="text-gray-600">Sign in to your account</p>
        </div>

        {/* Google Sign In Button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 rounded-lg py-3 px-4 mb-6 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center justify-center w-5 h-5">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          </div>
          <span className="font-medium text-gray-700">
            {googleLoading ? "Signing in..." : "Sign in with Google"}
          </span>
        </button>

        {/* Divider */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex-grow border-t border-gray-300"></div>
          <span className="mx-4 text-gray-500 text-sm">or</span>
          <div className="flex-grow border-t border-gray-300"></div>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleEmailSignIn} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="Enter your password"
              required
            />
          </div>

          {/* Forgot Password Link */}
          <div className="text-right">
            <button
              type="button"
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
              onClick={() => {
                toast.info("Forgot password feature coming soon");
              }}
            >
              Forgot password?
            </button>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Sign Up Link */}
        <div className="text-center mt-6 pt-6 border-t border-gray-200">
          <p className="text-gray-600">
            Don't have an account?{" "}
            <button
              type="button"
              className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
              onClick={() => {
                onClose();
                router.push('/signup');
              }}
            >
              Sign up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Modal;