import React, { useState, useEffect } from "react";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/firebase/firebase";

const PayPalButton = ({
  onPaymentSuccess,
  selectedSubscription,
  setSelectedSubscription,
  email,
  currentUser,
  isSubmitting,
  setIsSubmitting,
  purchaseType = "subscription",
  aiSlotAmount = 0,
  subscriptionId = null,
}) => {
  const [paypalInitialized, setPaypalInitialized] = useState(false);
  const [paypalButtonRendered, setPaypalButtonRendered] = useState(false);
  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

  console.log("PayPal Button Props:", {
    selectedSubscription,
    email,
    currentUser,
    purchaseType,
    aiSlotAmount,
    paypalClientId,
    paypalInitialized,
    paypalButtonRendered
  });

  useEffect(() => {
    const loadPayPalSDK = async () => {
      if (!paypalClientId) {
        console.error("PayPal Client ID is missing");
        return;
      }

      try {
        console.log("Loading PayPal SDK...");
        const script = document.createElement("script");
        script.src = `https://www.paypal.com/sdk/js?client-id=${paypalClientId}&components=buttons&vault=true&intent=${purchaseType === "subscription" ? "subscription" : "capture"}&currency=SEK`;
        script.async = true;
        script.onload = () => {
          console.log("PayPal SDK loaded successfully");
          setPaypalInitialized(true);
        };
        script.onerror = (error) => {
          console.error("Error loading PayPal SDK:", error);
        };
        document.body.appendChild(script);
      } catch (error) {
        console.error("Error in loadPayPalSDK:", error);
      }
    };

    if (!paypalInitialized) {
      loadPayPalSDK();
    }

    return () => {
      const script = document.querySelector('script[src*="paypal"]');
      if (script && document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [paypalClientId, paypalInitialized, purchaseType]);

  useEffect(() => {
    const initializePayPal = async () => {
      if (!window.paypal || !window.paypal.Buttons || isSubmitting) {
        console.log("PayPal not ready:", { 
          hasPayPal: !!window.paypal, 
          hasButtons: !!(window.paypal && window.paypal.Buttons),
          isSubmitting 
        });
        return;
      }

      try {
        console.log("Initializing PayPal buttons...");
        const buttonConfig = {
          createOrder: purchaseType === "ai_slots" ? (data, actions) => {
            console.log("Creating AI slots order...");
            return actions.order.create({
              purchase_units: [{
                amount: {
                  value: getAiSlotPrice(aiSlotAmount).toString(),
                  currency_code: "SEK"
                }
              }]
            });
          } : undefined,
          createSubscription: purchaseType === "subscription" ? (data, actions) => {
            const planId = getPlanId(selectedSubscription);
            console.log("Creating subscription with plan ID:", planId);
            return actions.subscription.create({
              plan_id: planId,
              custom_id: email,
            }).catch(error => {
              console.error("Error creating subscription:", error);
              throw error;
            });
          } : undefined,
          onApprove: async (data, actions) => {
            try {
              setIsSubmitting(true);
              console.log("Payment approved:", data);
              
              if (purchaseType === "subscription") {
                // For subscriptions, we need to wait for the subscription to be active
                const subscription = await actions.subscription.get();
                console.log("Subscription details:", subscription);
                await onPaymentSuccess({
                  subscriptionID: subscription.id,
                  status: subscription.status,
                  ...subscription
                });
              } else if (purchaseType === "ai_slots") {
                const order = await actions.order.capture();
                console.log("AI slots order captured:", order);
                await onPaymentSuccess({
                  ...order,
                  aiSlotAmount,
                  purchaseType: "ai_slots"
                });
              }
            } catch (error) {
              console.error("Error in onApprove:", error);
              throw error;
            } finally {
              setIsSubmitting(false);
            }
          },
          onError: (err) => {
            console.error("PayPal error:", err);
            setIsSubmitting(false);
          },
        };

        console.log("Rendering PayPal button with config:", buttonConfig);
        await window.paypal.Buttons(buttonConfig).render("#paypal-button-container");
        setPaypalButtonRendered(true);
      } catch (error) {
        console.error("Error initializing PayPal Buttons:", error);
        setIsSubmitting(false);
      }
    };

    if ((selectedSubscription || aiSlotAmount > 0) && !paypalButtonRendered && paypalInitialized) {
      console.log("Attempting to initialize PayPal...");
      initializePayPal();
    }
  }, [selectedSubscription, aiSlotAmount, paypalInitialized, paypalButtonRendered, onPaymentSuccess, email, setIsSubmitting, isSubmitting, purchaseType]);

  const getPlanId = (subscription) => {
    switch (subscription) {
      //Test plan: P-6B822597VF436484TM7MYB5I
      case "standard":
        return "P-0GM427149W577500GM7NAIJI";
      case "pro":
        return "P-1W541607GT5869940M7NAHPY";
      case "enterprise":
        return "P-ENTERPRISE-MONTHLY";
      default:
        return "";
    }
  };

  const getAiSlotPrice = (amount) => {
    switch (amount) {
      case 25:
        return 495;
      case 50:
        return 895;
      case 100:
        return 1495;
      case 200:
        return 2494;
      default:
        return 0;
    }
  };

  const cancelSubscription = async (subscriptionId) => {
    try {
      console.log("Cancelling subscription:", subscriptionId);
      
      // Call PayPal API to cancel subscription
      const response = await fetch(`/api/cancel-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId,
          email: currentUser.email
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }

      const data = await response.json();
      console.log("Subscription cancellation response:", data);

      // Update user document with cancellation details
      const userRef = doc(db, "users", currentUser.uid);
      await setDoc(userRef, {
        subscriptionStatus: "CANCELLED",
        nextPaymentDate: null,
        subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        lastCancellationDate: new Date().toISOString()
      }, { merge: true });

      return true;
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      throw error;
    }
  };

  return (
    <PayPalScriptProvider options={{ "client-id": paypalClientId }}>
      <div id="paypal-button-container" className="w-full">
        {!paypalButtonRendered && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-600">Loading payment options...</p>
          </div>
        )}
      </div>
    </PayPalScriptProvider>
  );
};

export default PayPalButton;
