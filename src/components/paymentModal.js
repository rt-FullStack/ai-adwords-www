import React, { useEffect, useState } from "react";
import { useAuth } from "@/components/authContext";

const PaymentModal = () => {
  const { currentUser } = useAuth();
  const [isAccountBeingDeleted, setIsAccountBeingDeleted] = useState(false);

  // Check if account is being deleted
  useEffect(() => {
    const deletionFlag = localStorage.getItem("accountBeingDeleted");
    if (deletionFlag === "true") {
      setIsAccountBeingDeleted(true);

      // Clear the flag after a short delay
      setTimeout(() => {
        localStorage.removeItem("accountBeingDeleted");
      }, 3000); // Clear after 3 seconds
    }
  }, []);

  // If user is signed in or account is being deleted, don't show the payment modal
  if (currentUser || isAccountBeingDeleted) {
    return null;
  }

  return (
    <div
      id="container"
      className="fixed z-10 inset-0 flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-sm">
      <div className="bg-slate-200 text-right p-4 rounded-sm">
        <div className="flex-col items-end">
          <p>You need to sign up and set up your account. Please click on "become a member"</p>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
