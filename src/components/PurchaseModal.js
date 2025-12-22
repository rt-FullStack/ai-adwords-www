import React, { useState, useEffect } from "react";
import PayPalButton from "@/firebase/paypal";
import { useAuth } from "./authContext";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/firebase";

const PurchaseModal = ({ isOpen, onClose, type = "subscription", selectedPackage }) => {
  const [selectedSubscription, setSelectedSubscription] = useState(selectedPackage?.type || "");
  const [selectedAiSlotAmount, setSelectedAiSlotAmount] = useState(
    type === "ai_slots" && selectedPackage ? parseInt(selectedPackage.slots) : 0
  );
  const [purchaseType, setPurchaseType] = useState(type);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { currentUser } = useAuth();

  // Update selected values when selectedPackage changes
  useEffect(() => {
    if (selectedPackage) {
      if (type === "subscription") {
        setSelectedSubscription(selectedPackage.type);
        setPurchaseType("subscription");
      } else if (type === "ai_slots") {
        setSelectedAiSlotAmount(parseInt(selectedPackage.slots));
        setPurchaseType("ai_slots");
      }
    }
  }, [selectedPackage, type]);

  // Reset AI slot amount when switching to subscription type
  useEffect(() => {
    if (purchaseType === "subscription") {
      setSelectedAiSlotAmount(0);
    }
  }, [purchaseType]);

  console.log("PurchaseModal render:", {
    selectedSubscription,
    purchaseType,
    isSubmitting,
    currentUser,
    selectedAiSlotAmount,
    selectedPackage,
  });

  const handleSubscriptionSelect = (plan) => {
    console.log("Selected plan:", plan);
    setSelectedSubscription(plan.toLowerCase());
  };

  const handleAiSlotSelect = (amount) => {
    console.log("Selected AI slot amount:", amount);
    setSelectedAiSlotAmount(amount);
  };

  const handlePaymentSuccess = async (data) => {
    try {
      setIsSubmitting(true);
      console.log("Payment success:", data);

      if (!currentUser) {
        throw new Error("No user logged in");
      }

      const userRef = doc(db, "users", currentUser.uid);
      const userDoc = await getDoc(userRef);

      const subscriptionDetails = {
        standard: { sessions: 1, aiSlots: 25, price: 1950 },
        pro: { sessions: 2, aiSlots: 100, price: 2995 },
        enterprise: { sessions: 10, aiSlots: 200, price: 19990 },
      };

      const currentData = userDoc.data() || {};
      const subscriptionInfo = subscriptionDetails[selectedSubscription];

      // Base update data
      const updateData = {
        lastPaymentDate: new Date().toISOString(),
      };

      // Add subscription-specific data if it's a subscription purchase
      if (purchaseType === "subscription") {
        Object.assign(updateData, {
          subscriptionId: data.subscriptionID || data.id,
          subscriptionStatus: "ACTIVE",
          subscriptionType: selectedSubscription,
          subscriptionDetails: subscriptionInfo,
          aiSlots: subscriptionInfo.aiSlots,
          monthlyAiSlots: subscriptionInfo.aiSlots,
          nextAiSlotRefresh: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }
      // Add AI slot-specific data if it's an AI slot purchase
      else if (purchaseType === "ai_slots") {
        Object.assign(updateData, {
          aiSlots: (currentData.aiSlots || 0) + selectedAiSlotAmount,
        });
      }

      console.log("Updating user data:", updateData);
      await setDoc(userRef, updateData, { merge: true });

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 3000);
    } catch (error) {
      console.error("Error updating subscription:", error);
      alert("There was an error processing your subscription. Please contact support.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        {showSuccess ? (
          <div className="text-center">
            <div className="text-green-500 text-5xl mb-4">✓</div>
            <h2 className="text-2xl font-bold mb-2">Payment Successful!</h2>
            <p className="text-gray-600">
              {purchaseType === "subscription"
                ? `Your ${selectedSubscription} subscription has been activated.`
                : `You have successfully purchased ${selectedAiSlotAmount} AI slots.`}
            </p>
            <p className="text-gray-600 mt-2">Thank you for your purchase!</p>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-4">{type === "subscription" ? "Choose Your Plan" : "Purchase AI Slots"}</h2>

            {purchaseType === "subscription" ? (
              <div className="space-y-2">
                <button
                  className={`w-full p-3 text-left rounded ${
                    selectedSubscription === "standard" ? "bg-indigo-600 text-white" : "bg-gray-100"
                  }`}
                  onClick={() => handleSubscriptionSelect("standard")}>
                  Standard License - 1 950 SEK per month
                </button>
                <button
                  className={`w-full p-3 text-left rounded ${selectedSubscription === "pro" ? "bg-indigo-600 text-white" : "bg-gray-100"}`}
                  onClick={() => handleSubscriptionSelect("pro")}>
                  Pro License - 2 995 SEK per month
                </button>
                <button
                  className={`w-full p-3 text-left rounded ${
                    selectedSubscription === "enterprise" ? "bg-indigo-600 text-white" : "bg-gray-100"
                  }`}
                  onClick={() => handleSubscriptionSelect("enterprise")}>
                  Enterprise License - 19 990 SEK per month
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  className={`w-full p-3 text-left rounded ${selectedAiSlotAmount === 25 ? "bg-indigo-600 text-white" : "bg-gray-100"}`}
                  onClick={() => handleAiSlotSelect(25)}>
                  25 AI Slots - 495 SEK
                </button>
                <button
                  className={`w-full p-3 text-left rounded ${selectedAiSlotAmount === 50 ? "bg-indigo-600 text-white" : "bg-gray-100"}`}
                  onClick={() => handleAiSlotSelect(50)}>
                  50 AI Slots - 895 SEK
                </button>
                <button
                  className={`w-full p-3 text-left rounded ${selectedAiSlotAmount === 100 ? "bg-indigo-600 text-white" : "bg-gray-100"}`}
                  onClick={() => handleAiSlotSelect(100)}>
                  100 AI Slots - 1 495 SEK
                </button>
                <button
                  className={`w-full p-3 text-left rounded ${selectedAiSlotAmount === 200 ? "bg-indigo-600 text-white" : "bg-gray-100"}`}
                  onClick={() => handleAiSlotSelect(200)}>
                  200 AI Slots - 2 494 SEK
                </button>
              </div>
            )}

            {(selectedSubscription || selectedAiSlotAmount > 0) && (
              <div className="mt-4">
                <PayPalButton
                  onPaymentSuccess={handlePaymentSuccess}
                  selectedSubscription={selectedSubscription}
                  setSelectedSubscription={setSelectedSubscription}
                  email={currentUser?.email || ""}
                  currentUser={currentUser}
                  isSubmitting={isSubmitting}
                  setIsSubmitting={setIsSubmitting}
                  purchaseType={purchaseType}
                  aiSlotAmount={selectedAiSlotAmount}
                />
              </div>
            )}

            <button
              className="mt-4 w-full p-3 bg-gray-200 rounded hover:bg-gray-300"
              onClick={onClose}>
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PurchaseModal;
