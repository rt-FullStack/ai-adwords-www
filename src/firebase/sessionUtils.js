import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

// Clean up stale sessions (sessions that haven't been active for more than 24 hours)
export async function cleanupStaleSessions(userId) {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) return;
    
    const userData = userDoc.data();
    const activeSessions = userData.activeSessions || {};
    const now = new Date();
    
    // Find stale sessions (inactive for more than 24 hours)
    const staleSessions = Object.entries(activeSessions).filter(([_, session]) => {
      const lastActive = session.lastActive?.toDate();
      return lastActive && (now - lastActive) > 24 * 60 * 60 * 1000; // 24 hours
    });
    
    if (staleSessions.length > 0) {
      // Remove stale sessions and return their tokens
      const updatedActiveSessions = { ...activeSessions };
      const returnedTokens = [];
      
      staleSessions.forEach(([token]) => {
        delete updatedActiveSessions[token];
        returnedTokens.push(token);
      });
      
      // Update the user document
      await setDoc(userRef, {
        activeSessions: updatedActiveSessions,
        sessionTokens: [...(userData.sessionTokens || []), ...returnedTokens]
      }, { merge: true });
    }
  } catch (error) {
    console.error("Error cleaning up stale sessions:", error);
  }
}

// Update the last active timestamp for the current session
export async function updateSessionActivity(userId, sessionToken) {
  try {
    const userRef = doc(db, "users", userId);
    await setDoc(userRef, {
      [`activeSessions.${sessionToken}.lastActive`]: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error("Error updating session activity:", error);
  }
}

// Get the number of active sessions for a user
export async function getActiveSessionCount(userId) {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) return 0;
    
    const userData = userDoc.data();
    return Object.keys(userData.activeSessions || {}).length;
  } catch (error) {
    console.error("Error getting active session count:", error);
    return 0;
  }
} 