import { useAuth } from "@/components/authContext";
import { db } from "@/firebase/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";

export function useHandleSignOut() {
  const { currentUser, setUserStatus, signOut: authSignOut } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    try {
      if (!currentUser) {
        console.log("No user to sign out");
        return;
      }

      console.log("Starting sign-out process for user:", currentUser.uid);

      const userRef = doc(db, "users", currentUser.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        console.log("No user document found for:", currentUser.uid);
        await authSignOut();
        setUserStatus(null);
        router.push("/"); // redirect after sign out
        return;
      }

      const userData = userDoc.data();
      console.log("Current user data:", {
        activeSessionsCount: Object.keys(userData.activeSessions || {}).length,
        availableTokensCount: (userData.sessionTokens || []).length,
        activeSessions: userData.activeSessions,
        sessionTokens: userData.sessionTokens,
      });

      // Find current device's session token
      const currentDeviceInfo = navigator.userAgent;
      const currentSession = Object.entries(userData.activeSessions || {}).find(
        ([_, session]) => session.deviceInfo === currentDeviceInfo
      );

      if (!currentSession) {
        console.log("No active session found for current device:", currentDeviceInfo);
        await authSignOut();
        setUserStatus(null);
        router.push("/");
        return;
      }

      const [sessionToken] = currentSession;
      console.log("Found current device session:", { sessionToken });

      // Calculate total sessions before removal
      const totalSessionsBefore =
        (userData.sessionTokens?.length || 0) + Object.keys(userData.activeSessions || {}).length;

      // Only remove session if more than one session exists
      if (totalSessionsBefore > 1) {
        const updatedActiveSessions = { ...userData.activeSessions };
        delete updatedActiveSessions[sessionToken];

        const updatedSessionTokens = [...(userData.sessionTokens || []), sessionToken];

        console.log("Preparing to update session state:", {
          removedSessionToken: sessionToken,
          newActiveSessionsCount: Object.keys(updatedActiveSessions).length,
          newAvailableTokensCount: updatedSessionTokens.length,
        });

        await setDoc(
          userRef,
          {
            activeSessions: updatedActiveSessions,
            sessionTokens: updatedSessionTokens,
            lastSignOut: serverTimestamp(),
          },
          { merge: true }
        );

        console.log("Session state updated successfully");

        const verifyDoc = await getDoc(userRef);
        const verifyData = verifyDoc.data();
        console.log("Verified session state after update:", {
          activeSessionsCount: Object.keys(verifyData.activeSessions || {}).length,
          availableTokensCount: (verifyData.sessionTokens || []).length,
        });
      } else {
        console.log("Cannot remove last session, skipping session update");
      }

      // Wait briefly to ensure Firestore update completes
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Sign out and clear user state
      setUserStatus(null);
      await authSignOut();
      router.push("/");
      console.log("Sign-out completed successfully");
    } catch (err) {
      console.error("Sign-out error:", err);
      try {
        console.log("Attempting forced sign-out after error");
        setUserStatus(null);
        await authSignOut();
        router.push("/");
      } catch (finalError) {
        console.error("Final sign-out attempt failed:", finalError);
      }
    }
  }

  return { handleSignOut };
}