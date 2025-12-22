"use client";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

const Toast = ({ message }) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  // Only create portal on client side
  if (typeof window === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed top-5 right-5 px-4 py-2 bg-green-500 text-white rounded-md shadow-lg transition-all duration-300"
      style={{ zIndex: 9999 }}>
      {message}
    </div>,
    document.body
  );
};

export default Toast;
