import React, { useState, useEffect, useCallback } from "react";
import Button from "../buttons";
import Modal from "../ModalClean";

const ImportCopy = ({ onImport, onClose }) => {
  const [pastedContent, setPastedContent] = useState("");
  const [error, setError] = useState("");
  const [selectedOptionValues, setSelectedOptionValues] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const readFromClipboard = useCallback(async () => {
    try {
      setIsLoading(true);
      const text = await navigator.clipboard.readText();
      setPastedContent(text);
      setError("");

      // If we got content, process it immediately
      if (text) {
        handleImport(text);
      }
    } catch (err) {
      console.error("Failed to read clipboard:", err);
      setError("Unable to read from clipboard. Please check your browser permissions.");
    } finally {
      setIsLoading(false);
    }
  }, [onImport, onClose]);

  useEffect(() => {
    // Automatically read from clipboard when component mounts
    readFromClipboard();
  }, [readFromClipboard]);

  const handleImport = (content) => {
    if (!content) return;

    try {
      // Split the content into rows and columns
      const rows = content.split("\n");
      const headers = rows[0].split("\t");
      const values = rows[1].split("\t");

      // Create a map of header to value
      const data = {};
      headers.forEach((header, index) => {
        data[header.trim()] = values[index]?.trim() || "";
      });

      // Extract headlines
      const headlines = [];
      for (let i = 1; i <= 15; i++) {
        if (data[`Headline ${i}`]) {
          headlines.push({
            text: data[`Headline ${i}`],
            pin: data[`Headline ${i} position`] || "",
          });
        }
      }

      // Extract descriptions
      const descriptions = [];
      for (let i = 1; i <= 4; i++) {
        if (data[`Description ${i}`]) {
          descriptions.push({
            text: data[`Description ${i}`],
            pin: data[`Description ${i} position`] || "",
          });
        }
      }

      // Extract paths
      const paths = [];
      if (data["Path 1"]) paths.push({ text: data["Path 1"] });
      if (data["Path 2"]) paths.push({ text: data["Path 2"] });

      // Handle status fields
      const normalizeStatus = (statusValue) => {
        if (!statusValue) return "Enabled";
        const rawStatus = statusValue.toLowerCase().trim();
        if (rawStatus.includes("enabled")) return "Enabled";
        if (rawStatus.includes("paused")) return "Paused";
        if (rawStatus.includes("removed")) return "Removed";
        return "Enabled";
      };

      // Get status values from the data
      const status = normalizeStatus(data["Status"]);
      const clientStatus = normalizeStatus(data["Client Status"]);
      const campaignStatus = normalizeStatus(data["Campaign Status"]);
      const adGroupStatus = normalizeStatus(data["Ad Group Status"]);
      const adStatus = normalizeStatus(data["Ad Status"]);

      // Create the import object with status fields
      const importData = {
        campaignName: data["Campaign"] || "",
        adGroupName: data["Ad Group"] || "",
        adType: data["Ad type"] || "Responsive search ad",
        labels: data["Labels"] || "",
        headlines: headlines,
        descriptions: descriptions,
        paths: paths,
        finalUrl: data["Final URL"] || "",
        status: status,
        clientStatus: clientStatus,
        campaignStatus: campaignStatus,
        adGroupStatus: adGroupStatus,
        adStatus: adStatus,
      };

      console.log("Import data with statuses:", importData);

      // Set the status in the component state
      setSelectedOptionValues(status);

      if (onImport) {
        onImport(importData);
      }
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("Error importing data:", error);
      alert("Error importing data. Please check the format and try again.");
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      content={
        <div className="w-full max-w-4xl p-6">
          {error ? (
            <div className="mb-4">
              <div className="text-red-600 mb-4">{error}</div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={readFromClipboard}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  Try Again
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 border rounded-md hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3">Reading from clipboard...</span>
            </div>
          ) : null}
        </div>
      }
    />
  );
};

export default ImportCopy;