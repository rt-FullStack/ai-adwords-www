import React from "react";

export default function ModalConfirm({ isOpen, onClose, onConfirm, content }) {
  if (!isOpen) return null;

  function handleOnClose(e) {
    if (e.target.id === "container") onClose();
  }

  return (
    <div
      id="container"
      onClick={handleOnClose}
      className="fixed z-10 inset-0 flex items-center justify-center">
      <div className="bg-white rounded-lg w-fit border p-2 ">
        <div className="flex justify-end  ">
          <button
            onClick={onClose}
            className="text-black text-lg flex mb-4 ">
            X
          </button>
        </div>

        <p className="mb-4 text-black font-nunito text-lg px-10 pt-6">{content}</p>
        <div className="flex justify-center mt-6 mb-10">
          <button
            className="px-4 py-1 mr-3 bg-green-600  text-white rounded hover:bg-green-800"
            onClick={() => {
              onConfirm();
              onClose();
            }}>
            Yes
          </button>
          <button
            className="px-5 py-1 bg-red-500 text-black rounded hover:bg-red-700"
            onClick={onClose}>
            No
          </button>
        </div>
      </div>
    </div>
  );
}
