import React from "react";
import { IoMdClose } from "react-icons/io";

const ErrorModal = ({ isOpen, onClose, message }) => {
  if (!isOpen) return null;

  function handleOnClose(e) {
    if (e.target.id === "container") onClose();
  }

  return (
    <div
      onClick={handleOnClose}
      id="container"
      className="fixed z-10 inset-0 flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-sm">
      <div
        className="bg-slate-200 text-left p-2 rounded-sm"
        style={{ borderRadius: "10px", backgroundColor: "#FFFFFF", boxShadow: "5px 5px 5px rgba(0, 0, 0, 0.25)" }}>
        <div className="flex-col items-end">
          <button
            className="text-black text-xl"
            onClick={onClose}>
            <IoMdClose />
          </button>
        </div>
        <div className="p-6">
          <div className="text-red-500 text-xl font-semibold mb-4">Error</div>
          <div className="text-gray-700">{message}</div>
        </div>
      </div>
    </div>
  );
};

export default ErrorModal; 