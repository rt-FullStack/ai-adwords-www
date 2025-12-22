import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export const refreshMonthlyAiSlots = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.error('User document not found');
      return;
    }

    const userData = userDoc.data();
    const now = new Date();
    const nextRefresh = new Date(userData.nextAiSlotRefresh);

    // Check if it's time to refresh
    if (now >= nextRefresh && userData.subscriptionStatus === 'ACTIVE') {
      console.log('Refreshing AI slots for user:', userId);
      
      // Reset AI slots to monthly amount
      await setDoc(userRef, {
        aiSlots: userData.monthlyAiSlots,
        nextAiSlotRefresh: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        lastAiSlotRefresh: now.toISOString()
      }, { merge: true });

      console.log('AI slots refreshed successfully');
    }
  } catch (error) {
    console.error('Error refreshing AI slots:', error);
  }
};

export const checkAndRefreshAiSlots = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.error('User document not found');
      return;
    }

    const userData = userDoc.data();
    
    // If user has an active subscription, check if AI slots need refresh
    if (userData.subscriptionStatus === 'ACTIVE' && userData.monthlyAiSlots) {
      await refreshMonthlyAiSlots(userId);
    }
  } catch (error) {
    console.error('Error checking AI slots:', error);
  }
}; 