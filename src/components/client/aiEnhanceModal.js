import React, { useState, useEffect, useCallback } from "react";
import Button from "@/components/buttons";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { useAuth } from "@/components/authContext";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/firebase/firebase";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";

function AiEnhanceModal({ onClose, onSave, headlines, descriptions }) {
  const { currentUser } = useAuth();
  const [enhancedHeadlines, setEnhancedHeadlines] = useState([]);
  const [enhancedDescriptions, setEnhancedDescriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedItems, setSelectedItems] = useState({
    headlines: {},
    descriptions: {},
  });
  const [selectedEnhancements, setSelectedEnhancements] = useState({
    headlines: {},
    descriptions: {},
  });
  const [enhancedContent, setEnhancedContent] = useState(null);

  // Add dragging state
  const [position, setPosition] = useState({ x: window.innerWidth / 2 - 400, y: window.innerHeight / 2 - 300 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Handle dragging functionality - useCallback to memoize the function
  const handleMouseDown = (e) => {
    if (!e.target.classList.contains("drag-handle")) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  // Memoize handleMouseMove with useCallback
  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    }
  }, [isDragging, dragOffset.x, dragOffset.y]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    } else {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]); // Added missing dependencies

  const toggleSelection = (type, index) => {
    setSelectedItems((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        [index]: !prev[type][index],
      },
    }));
  };

  const handleSelectAll = (type) => {
    setSelectedItems((prev) => {
      const currentItems = type === "headlines" ? headlines : descriptions;
      const newSelections = {};
      const allSelected = currentItems.every((_, index) => prev[type][index]);

      currentItems.forEach((_, index) => {
        newSelections[index] = !allSelected;
      });

      return {
        ...prev,
        [type]: newSelections,
      };
    });
  };

  const toggleEnhancementSelection = (type, enhancedIndex) => {
    setEnhancedContent((prev) => ({
      ...prev,
      [type]: prev[type].map((item, i) => (i === enhancedIndex ? { ...item, selected: !item.selected } : item)),
    }));
  };

  const handleEnhance = async () => {
    const selectedHeadlineIndices = Object.entries(selectedItems.headlines)
      .filter(([_, isSelected]) => isSelected)
      .map(([index]) => parseInt(index));
    const selectedDescriptionIndices = Object.entries(selectedItems.descriptions)
      .filter(([_, isSelected]) => isSelected)
      .map(([index]) => parseInt(index));

    const selectedHeadlines = selectedHeadlineIndices.map((index) => headlines[index]);
    const selectedDescriptions = selectedDescriptionIndices.map((index) => descriptions[index]);

    if (selectedHeadlines.length === 0 && selectedDescriptions.length === 0) {
      setError("Please select at least one headline or description to enhance");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Check if user has available AI slots
      const userRef = doc(db, "users", currentUser.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        toast.error("User data not found. Please try again.", {
          position: "top-center",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
        });
        setLoading(false);
        return;
      }

      const userData = userDoc.data();
      if (!userData.aiSlots || userData.aiSlots <= 0) {
        toast.error(
          <div className="flex flex-col items-center">
            <div className="text-lg font-semibold mb-2">No AI Slots Available</div>
            <div className="text-sm text-gray-600">Please purchase more slots to continue using the AI content enhancement.</div>
          </div>,
          {
            position: "top-center",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "light",
          }
        );
        setLoading(false);
        return;
      }

      const response = await fetch("https://ai-adwords-263809614075.europe-north1.run.app/enhance_ads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          headlines: selectedHeadlines,
          descriptions: selectedDescriptions,
        }),
        mode: "cors",
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error(`Enhancement failed: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }

      // Only deduct AI slot if enhancement was successful
      await setDoc(userRef, {
        aiSlots: userData.aiSlots - 1
      }, { merge: true });

      setEnhancedContent({
        headlines: result.headlines.map((text, i) => ({
          text,
          originalIndex: selectedHeadlineIndices[i],
          selected: true,
        })),
        descriptions: result.descriptions.map((text, i) => ({
          text,
          originalIndex: selectedDescriptionIndices[i],
          selected: true,
        })),
      });
    } catch (error) {
      console.error("Error enhancing content:", error);
      toast.error(
        error.message.includes("CORS")
          ? "Unable to connect to the enhancement service. Please make sure the backend server is running."
          : `Error enhancing content: ${error.message}`,
        {
          position: "top-center",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
        }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!enhancedContent) return;

    const finalHeadlines = [...headlines];
    const finalDescriptions = [...descriptions];

    enhancedContent.headlines.forEach(({ text, originalIndex, selected }) => {
      if (selected) {
        finalHeadlines[originalIndex] = text;
      }
    });

    enhancedContent.descriptions.forEach(({ text, originalIndex, selected }) => {
      if (selected) {
        finalDescriptions[originalIndex] = text;
      }
    });

    onSave(finalHeadlines, finalDescriptions);
    onClose();
  };

  const handleDragStart = (e, type, content) => {
    e.dataTransfer.setData("text/plain", content);
    e.dataTransfer.setData("type", type);
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div className="fixed inset-0 z-50" style={{ pointerEvents: "none" }}>
      <ToastContainer
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      <div
        className="bg-white rounded-lg shadow-xl overflow-hidden"
        style={{
          position: "absolute",
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: "800px",
          maxHeight: "80vh",
          transform: "none",
          pointerEvents: "auto",
          backgroundColor: "white",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.5)",
          border: "1px solid #000000",
        }}>
        {/* Header/Title bar - draggable */}
        <div
          className="bg-gray-100 px-4 py-3 flex justify-between items-center cursor-move drag-handle"
          onMouseDown={handleMouseDown}
          style={{ backgroundColor: "#f3f4f6" }}>
          <h2 className="text-lg font-semibold cursor-move drag-handle select-none">AI Content Enhancement</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700">
            ×
          </button>
        </div>

        <div
          className="p-6 overflow-y-auto bg-white"
          style={{ maxHeight: "calc(80vh - 48px)" }}>
          {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}

          {loading ? (
            <div className="flex flex-col justify-center items-center h-64 gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
              <p className="text-gray-600">Enhancing your content...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Headlines Section */}
              {headlines.length > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold">Headlines</h3>
                    {!enhancedContent && (
                      <button
                        onClick={() => handleSelectAll("headlines")}
                        className="text-sm text-blue-600 hover:text-blue-800">
                        {headlines.every((_, index) => selectedItems.headlines[index]) ? "Unselect All" : "Select All"}
                      </button>
                    )}
                  </div>
                  <div className="space-y-4">
                    {headlines.map((headline, index) => (
                      <div
                        key={`headline-${index}`}
                        className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedItems.headlines[index] || false}
                            onChange={() => toggleSelection("headlines", index)}
                            className="w-4 h-4"
                            disabled={loading || enhancedContent}
                          />
                          <div className="bg-gray-100 p-2 rounded flex-grow">
                            <p>{headline}</p>
                          </div>
                        </div>
                        {enhancedContent && enhancedContent.headlines.find((h) => h.originalIndex === index) && (
                          <div className="ml-6 flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={enhancedContent.headlines.find((h) => h.originalIndex === index).selected}
                              onChange={() =>
                                toggleEnhancementSelection(
                                  "headlines",
                                  enhancedContent.headlines.findIndex((h) => h.originalIndex === index)
                                )
                              }
                              className="w-4 h-4"
                            />
                            <div
                              draggable
                              onDragStart={(e) => handleDragStart(e, 'headline', enhancedContent.headlines.find((h) => h.originalIndex === index).text)}
                              className="bg-green-50 p-2 rounded flex-grow cursor-move hover:bg-green-100 transition-colors">
                              <p className="text-sm text-green-600">Enhanced version:</p>
                              <p>{enhancedContent.headlines.find((h) => h.originalIndex === index).text}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Descriptions Section */}
              {descriptions.length > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold">Descriptions</h3>
                    {!enhancedContent && (
                      <button
                        onClick={() => handleSelectAll("descriptions")}
                        className="text-sm text-blue-600 hover:text-blue-800">
                        {descriptions.every((_, index) => selectedItems.descriptions[index]) ? "Unselect All" : "Select All"}
                      </button>
                    )}
                  </div>
                  <div className="space-y-4">
                    {descriptions.map((description, index) => (
                      <div
                        key={`description-${index}`}
                        className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedItems.descriptions[index] || false}
                            onChange={() => toggleSelection("descriptions", index)}
                            className="w-4 h-4"
                            disabled={loading || enhancedContent}
                          />
                          <div className="bg-gray-100 p-2 rounded flex-grow">
                            <p>{description}</p>
                          </div>
                        </div>
                        {enhancedContent && enhancedContent.descriptions.find((d) => d.originalIndex === index) && (
                          <div className="ml-6 flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={enhancedContent.descriptions.find((d) => d.originalIndex === index).selected}
                              onChange={() =>
                                toggleEnhancementSelection(
                                  "descriptions",
                                  enhancedContent.descriptions.findIndex((d) => d.originalIndex === index)
                                )
                              }
                              className="w-4 h-4"
                            />
                            <div
                              draggable
                              onDragStart={(e) => handleDragStart(e, 'description', enhancedContent.descriptions.find((d) => d.originalIndex === index).text)}
                              className="bg-green-50 p-2 rounded flex-grow cursor-move hover:bg-green-100 transition-colors">
                              <p className="text-sm text-green-600">Enhanced version:</p>
                              <p>{enhancedContent.descriptions.find((d) => d.originalIndex === index).text}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                {!enhancedContent && (
                  <Button
                    onClick={handleEnhance}
                    title="Enhance Selected"
                    size="medium"
                    color="dark"
                    disabled={
                      loading ||
                      (Object.values(selectedItems.headlines).every((v) => !v) &&
                        Object.values(selectedItems.descriptions).every((v) => !v))
                    }
                    className="border border-slate-600 bg-slate-700 hover:bg-slate-500 text-white rounded-md"
                  />
                )}
                {enhancedContent && (
                  <Button
                    onClick={handleSave}
                    title="Save Selected"
                    size="medium"
                    color="dark"
                    className="border border-slate-600 bg-slate-700 hover:bg-slate-500 text-white rounded-md"
                  />
                )}
                <Button
                  onClick={onClose}
                  title="Cancel"
                  size="medium"
                  color="dark"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AiEnhanceModal;
