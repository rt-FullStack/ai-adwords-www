"use client";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/components/authContext";
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/firebase/firebase";
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential, getAuth } from "firebase/auth";
import { useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import WhitelistManager from "@/components/WhitelistManager";
import Link from 'next/link';

export default function AccountPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDowngradeConfirm, setShowDowngradeConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      router.push("/");
      return;
    }

    // Check if user is authorized to manage whitelist
    const adminEmails = ["jonas@innosearch.se", "davidrad@gmail.com", "hyllengrenpeter@gmail.com"];
    setIsAdmin(adminEmails.includes(currentUser.email));

    const fetchUserData = async () => {
      try {
        const userRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [currentUser, router]);

  const handleUpgradeToDeveloper = async () => {
    try {
      setUpgrading(true);
      const userRef = doc(db, "users", currentUser.uid);

      // Generate 2 session tokens for Developer License
      const sessionTokens = Array.from({ length: 2 }, () => Math.random().toString(36).substring(2) + Date.now().toString(36));

      const updateData = {
        subscriptionType: "developer",
        subscriptionStatus: "ACTIVE",
        aiSlots: 999999, // Unlimited slots
        monthlyAiSlots: 999999,
        nextAiSlotRefresh: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
        subscriptionDetails: {
          sessions: 2,
          aiSlots: 999999,
          price: 0,
        },
        isDeveloper: true,
        lastPaymentDate: new Date().toISOString(),
        sessionTokens: sessionTokens,
        activeSessions: {},
      };

      await setDoc(userRef, updateData, { merge: true });
      setUserData((prev) => ({ ...prev, ...updateData }));

      toast.success("Successfully upgraded to Developer Account!");
    } catch (error) {
      console.error("Error upgrading to developer:", error);
      toast.error("Error upgrading to Developer Account. Please try again.");
    } finally {
      setUpgrading(false);
    }
  };

  const handleDowngradeFromDeveloper = async () => {
    try {
      setUpgrading(true);
      const userRef = doc(db, "users", currentUser.uid);

      // Generate one session token to ensure the user can still access their account
      const newSessionToken = Math.random().toString(36).substring(2) + Date.now().toString(36);

      const updateData = {
        subscriptionType: "",
        subscriptionStatus: "",
        aiSlots: 0,
        monthlyAiSlots: 0,
        nextAiSlotRefresh: null,
        subscriptionDetails: null,
        isDeveloper: false,
        lastPaymentDate: null,
        sessionTokens: [newSessionToken], // Keep one session token
        activeSessions: {}, // Clear active sessions but maintain one available session
      };

      await setDoc(userRef, updateData, { merge: true });
      setUserData((prev) => ({ ...prev, ...updateData }));

      toast.success("Successfully removed Developer License. Your account has been reset.");
    } catch (error) {
      console.error("Error removing developer license:", error);
      toast.error("Error removing Developer License. Please try again.");
    } finally {
      setUpgrading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      // Start deletion process
      setDeleting(true);
      setDeleteError("");

      // Get user before we potentially delete it
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        setDeleteError("User not authenticated");
        setDeleting(false);
        return;
      }

      // Store necessary user information
      const userId = user.uid;
      const userEmail = user.email;

      // Safely check for auth providers
      let isPasswordProvider = false;
      let isGoogleProvider = false;
      let providerNames = [];

      try {
        if (user.providerData && Array.isArray(user.providerData)) {
          for (const provider of user.providerData) {
            if (provider.providerId === "password") {
              isPasswordProvider = true;
            } else if (provider.providerId === "google.com") {
              isGoogleProvider = true;
            }
            providerNames.push(provider.providerId);
          }
        }
      } catch (error) {
        console.error("Error checking provider type:", error);
      }

      console.log("Auth providers:", providerNames);

      // Verify password for password-based accounts
      if (isPasswordProvider && !password) {
        setDeleteError("Password is required to delete your account");
        setDeleting(false);
        return;
      }

      // Handle different authentication methods
      if (isPasswordProvider) {
        try {
          // For password-based users, require password verification
          const credential = EmailAuthProvider.credential(userEmail, password);
          await reauthenticateWithCredential(user, credential);
        } catch (error) {
          console.error("Authentication error:", error);
          setDeleteError("Incorrect password. Please try again.");
          setDeleting(false);
          return;
        }
      }

      // Begin account deletion
      try {
        // Delete auth record - this is the critical step
        await deleteUser(user);
        console.log("User authentication record deleted successfully");

        // Store success message in localStorage for display after redirect
        localStorage.setItem("accountDeletedMessage", "Your account has been successfully deleted.");

        // Set a flag in localStorage to prevent PaymentModal from showing
        localStorage.setItem("accountBeingDeleted", "true");

        // Redirect to home page - no toast here since we're redirecting immediately
        window.location.href = "/";
        return;
      } catch (error) {
        // Clean up the flag if deletion fails
        localStorage.removeItem("accountBeingDeleted");

        console.error("Error during account deletion:", error);
        setDeleteError("Error deleting account: " + error.message);
        setDeleting(false);
      }
    } catch (error) {
      console.error("Account deletion process failed:", error);
      setDeleteError("Account deletion failed: " + error.message);
      setDeleting(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setCancelling(true);
      const userRef = doc(db, "users", currentUser.uid);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();

      if (!userData.subscriptionId) {
        throw new Error("No subscription ID found");
      }

      console.log("Attempting to cancel subscription:", userData.subscriptionId);

      // Call PayPal API to cancel subscription
      const response = await fetch("/api/cancel-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscriptionId: userData.subscriptionId,
          email: currentUser.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Subscription cancellation failed:", data);

        // Handle specific error cases
        if (data.error === "Subscription is already cancelled") {
          // Update local state to reflect cancellation
          const updateData = {
            subscriptionStatus: "CANCELLED",
            nextPaymentDate: null,
            subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            lastCancellationDate: new Date().toISOString(),
          };
          await setDoc(userRef, updateData, { merge: true });
          setUserData((prev) => ({ ...prev, ...updateData }));
          toast.success("Your subscription has already been cancelled. You'll have access until the end of your billing period.");
          setShowCancelConfirm(false);
          return;
        }

        let errorMessage = data.error || "Failed to cancel subscription";
        if (data.details?.message) {
          errorMessage += `: ${data.details.message}`;
        }
        throw new Error(errorMessage);
      }

      // Update subscription status to indicate cancellation
      const updateData = {
        subscriptionStatus: "CANCELLED",
        nextPaymentDate: null,
        subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        lastCancellationDate: new Date().toISOString(),
      };

      await setDoc(userRef, updateData, { merge: true });
      setUserData((prev) => ({ ...prev, ...updateData }));

      toast.success("Subscription cancelled successfully. You'll have access until the end of your billing period.");
      setShowCancelConfirm(false);
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      toast.error(error.message || "Error cancelling subscription. Please try again or contact support.");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const getSubscriptionName = (type) => {
    switch (type) {
      case "standard":
        return "Standard License";
      case "pro":
        return "Pro License";
      case "enterprise":
        return "Enterprise License";
      case "developer":
        return "Developer License";
      default:
        return "No active subscription";
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
          />

          <h1 className="text-2xl font-bold text-gray-900 mb-6">My Account</h1>

          <div className="space-y-6">
            {/* User Information */}
            <div className="border-b pb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Profile Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="text-gray-900">{currentUser?.displayName || "Not set"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="text-gray-900">{currentUser?.email}</p>
                </div>
              </div>
            </div>

            {/* Subscription Information */}
            <div className="border-b pb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Subscription</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Current Plan</p>
                  <p className="text-gray-900">{getSubscriptionName(userData?.subscriptionType)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className={`text-gray-900 ${userData?.subscriptionStatus === "ACTIVE" ? "text-green-600" : "text-red-600"}`}>
                    {userData?.subscriptionStatus || "No active subscription"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Available Sessions</p>
                  <p className="text-gray-900">{userData?.sessionTokens?.length || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Active Sessions</p>
                  <p className="text-gray-900">{Object.keys(userData?.activeSessions || {}).length}</p>
                </div>
                {userData?.subscriptionEndDate && (
                  <div>
                    <p className="text-sm text-gray-500">Subscription End Date</p>
                    <p className="text-gray-900">{new Date(userData.subscriptionEndDate).toLocaleDateString()}</p>
                  </div>
                )}
              </div>

              {/* Add Cancel Subscription Button */}
              {userData?.subscriptionStatus === "ACTIVE" && userData?.subscriptionType !== "developer" && (
                <div className="mt-4">
                  {!showCancelConfirm ? (
                    <button
                      onClick={() => setShowCancelConfirm(true)}
                      className="w-full py-2 px-4 rounded-md text-white font-medium bg-red-600 hover:bg-red-700">
                      Cancel Subscription
                    </button>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                      <p className="text-red-800 text-sm font-medium mb-4">⚠️ Are you sure you want to cancel your subscription?</p>
                      <p className="text-sm text-gray-600 mb-4">
                        You'll continue to have access to your subscription benefits until the end of your current billing period.
                      </p>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => setShowCancelConfirm(false)}
                          className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-gray-700 font-medium bg-white hover:bg-gray-50">
                          Keep Subscription
                        </button>
                        <button
                          onClick={handleCancelSubscription}
                          disabled={cancelling}
                          className={`flex-1 py-2 px-4 rounded-md text-white font-medium ${cancelling ? "bg-gray-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"}`}>
                          {cancelling ? (
                            <span className="flex items-center justify-center">
                              <svg
                                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24">
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Cancelling...
                            </span>
                          ) : (
                            "Confirm Cancellation"
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* AI Slots Information */}
            <div className="border-b pb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">AI Slots</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Available Slots</p>
                  <p className="text-gray-900">{userData?.aiSlots || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Purchase More</p>
                  <Link href="/#pricing" className="text-blue-600 hover:text-blue-800">
                    View Plans
                  </Link>
                </div>
              </div>
            </div>

            {/* Developer Account Section */}
            <div className="border-b pt-4 pb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Developer Account</h2>
              {userData?.isDeveloper ? (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    You currently have a Developer License with unlimited AI slots and full access to the editor.
                  </p>

                  {!showDowngradeConfirm ? (
                    <button
                      onClick={() => setShowDowngradeConfirm(true)}
                      className="w-full py-2 px-4 rounded-md text-white font-medium bg-red-600 hover:bg-red-700">
                      Remove Developer License
                    </button>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4 mt-4">
                      <p className="text-red-800 text-sm font-medium mb-4">
                        ⚠️ This will remove your Developer License and all associated benefits including:
                      </p>
                      <ul className="list-disc list-inside text-sm text-red-700 mb-4 ml-2">
                        <li>Unlimited AI slots</li>
                        <li>All subscription benefits</li>
                        <li>Access to advanced editor features</li>
                      </ul>

                      <div className="flex space-x-3">
                        <button
                          onClick={() => setShowDowngradeConfirm(false)}
                          className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-gray-700 font-medium bg-white hover:bg-gray-50">
                          Cancel
                        </button>
                        <button
                          onClick={handleDowngradeFromDeveloper}
                          disabled={upgrading}
                          className={`flex-1 py-2 px-4 rounded-md text-white font-medium ${upgrading ? "bg-gray-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"}`}>
                          {upgrading ? (
                            <span className="flex items-center justify-center">
                              <svg
                                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24">
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Processing...
                            </span>
                          ) : (
                            "Confirm Removal"
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    Upgrade to a Developer Account for unlimited AI slots and full access to the editor.
                  </p>
                  <button
                    onClick={handleUpgradeToDeveloper}
                    disabled={upgrading}
                    className={`w-full py-2 px-4 rounded-md text-white font-medium ${upgrading ? "bg-gray-400 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700"}`}>
                    {upgrading ? (
                      <span className="flex items-center justify-center">
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Upgrading...
                      </span>
                    ) : (
                      "Upgrade to Developer Account"
                    )}
                  </button>
                </>
              )}
            </div>

            {/* Delete Account Section */}
            <div className="pt-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Delete Account</h2>
              <p className="text-sm text-gray-600 mb-4">Permanently delete your account and all your data. This action cannot be undone.</p>

              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full py-2 px-4 rounded-md text-white font-medium bg-red-600 hover:bg-red-700">
                  Delete My Account
                </button>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-red-800 text-sm font-medium mb-4">
                    ⚠️ This will permanently delete your account and all information associated with your account.
                  </p>

                  {/* Only show password field if currentUser exists and has password provider */}
                  {currentUser &&
                    currentUser.providerData &&
                    currentUser.providerData.some((provider) => provider.providerId === "password") && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Enter your password to confirm deletion</label>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md"
                          placeholder="Your password"
                        />
                      </div>
                    )}

                  {/* Show special message for Google/OAuth users */}
                  {currentUser &&
                    currentUser.providerData &&
                    currentUser.providerData.some((provider) => provider.providerId === "google.com") && (
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-blue-800 text-sm">
                          <span className="font-medium">Google Account Notice: </span>
                          You're signed in with Google. Deleting your account will remove all your data from our system but won't affect
                          your Google account.
                        </p>
                      </div>
                    )}

                  {deleteError && <div className="mb-4 text-red-700 text-sm font-medium">{deleteError}</div>}

                  <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setPassword("");
                        setDeleteError("");
                      }}
                      className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-gray-700 font-medium bg-white hover:bg-gray-50">
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleting}
                      className={`flex-1 py-2 px-4 rounded-md text-white font-medium ${deleting ? "bg-gray-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"}`}>
                      {deleting ? (
                        <span className="flex items-center justify-center">
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Deleting...
                        </span>
                      ) : (
                        "Permanently Delete Account"
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Add WhitelistManager after the main content */}
          {isAdmin && (
            <div className="mt-8">
              <WhitelistManager />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}