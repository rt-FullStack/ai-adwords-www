"use client";

import React, { useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Component to handle persistent toast messages across page navigation
const PersistentToast = () => {
  useEffect(() => {
    // Check for account deleted message
    const accountDeletedMessage = localStorage.getItem("accountDeletedMessage");
    if (accountDeletedMessage) {
      toast.success(accountDeletedMessage);
      localStorage.removeItem("accountDeletedMessage");
    }

    // Handle other persistent messages here if needed
  }, []);

  return (
    <ToastContainer
      position="top-right"
      autoClose={3000}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      rtl={false}
      pauseOnFocusLoss={false}
      draggable
      pauseOnHover
      limit={3}
    />
  );
};

export default PersistentToast;
