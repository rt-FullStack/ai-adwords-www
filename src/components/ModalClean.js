import React from "react";

const Modal = ({ isOpen, onClose, content }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-slate-100 p-10 rounded-md shadow-md"
      style={{
        padding: "1rem",
        backgroundColor: "#FFFFFF",
        borderRadius: "10px",
        border: "1px solid #000000",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.5)",
      }}>
      <div
        className="modal-content p-10"
        style={{ padding: "0" }}>
        <h1 className="mb-4">{content}</h1>
      </div>
    </div>
  );
};

export default Modal;
