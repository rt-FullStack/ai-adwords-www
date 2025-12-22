import React, { useState, useEffect } from "react";
import { db } from "@/firebase/firebase";
import { collection, doc, setDoc, serverTimestamp, getDocs, query, where } from "firebase/firestore";
import { useAuth } from "../authContext";
import { FaFileImport } from "react-icons/fa6";
import Toast from "@/components/Toast";

export default function ImportClientCSV({ onUpdate }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNamePromptOpen, setIsNamePromptOpen] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [pastedText, setPastedText] = useState("");
  const [isPasteMode, setIsPasteMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [clientName, setClientName] = useState("");
  const [processedData, setProcessedData] = useState(null);
  const { currentUser } = useAuth();
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (showToast) {
      setTimeout(() => {
        setShowToast(false);
      }, 2000);
    }
  }, [showToast]);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setCsvFile(file);
      // Extract client name from file name
      const fileName = file.name;
      const clientNameFromFile = fileName.split("+")[0];
      setClientName(clientNameFromFile);
    }
  };

  const sanitizeDocumentId = (id) => {
    // Only remove characters that are not allowed in Firebase document IDs
    return id
      .replace(/^["]+|["]+$/g, "") // Remove leading/trailing double quotes
      .replace(/[\/\.]/g, "") // Remove forward slashes and dots only
      .trim(); // Remove leading/trailing spaces
  };

  const normalizeBidStrategyType = (type, campaignName = "") => {
    console.log(`Normalizing bid strategy: "${type}"`);

    if (!type || type.trim() === "") {
      console.log("Empty bid strategy, defaulting to Manual CPC");
      return "Manual CPC";
    }

    // Normalize strategy type based on common patterns
    const typeLower = type.toLowerCase();

    // Direct matches for standard types (exact matches take precedence)
    if (typeLower === "maximize clicks") {
      console.log(`Direct match: "${type}" -> "Maximize clicks"`);
      return "Maximize clicks";
    } else if (typeLower === "manual cpc") {
      console.log(`Direct match: "${type}" -> "Manual CPC"`);
      return "Manual CPC";
    } else if (typeLower === "maximize conversions") {
      console.log(`Direct match: "${type}" -> "Maximize conversions"`);
      return "Maximize conversions";
    } else if (typeLower === "maximize conversion value") {
      console.log(`Direct match: "${type}" -> "Maximize conversion value"`);
      return "Maximize conversion value";
    } else if (typeLower === "target impression share") {
      console.log(`Direct match: "${type}" -> "Target impression share"`);
      return "Target impression share";
    }

    // Pattern matching (for partial matches)
    if (typeLower.includes("manual") || (typeLower.includes("cpc") && !typeLower.includes("maximize"))) {
      console.log(`Pattern match: "${type}" -> "Manual CPC"`);
      return "Manual CPC";
    } else if (typeLower.includes("maximize") && typeLower.includes("click")) {
      console.log(`Pattern match: "${type}" -> "Maximize clicks"`);
      return "Maximize clicks";
    } else if (typeLower.includes("maximize") && typeLower.includes("conversion") && !typeLower.includes("value")) {
      console.log(`Pattern match: "${type}" -> "Maximize conversions"`);
      return "Maximize conversions";
    } else if (typeLower.includes("maximize") && typeLower.includes("conversion") && typeLower.includes("value")) {
      console.log(`Pattern match: "${type}" -> "Maximize conversion value"`);
      return "Maximize conversion value";
    } else if ((typeLower.includes("target") && typeLower.includes("impression")) || typeLower.includes("impression share")) {
      console.log(`Pattern match: "${type}" -> "Target impression share"`);
      return "Target impression share";
    } else if (typeLower.includes("target") && typeLower.includes("cpa")) {
      console.log(`Pattern match: "${type}" -> "Target CPA"`);
      return "Target CPA";
    } else if (typeLower.includes("target") && typeLower.includes("roas")) {
      console.log(`Pattern match: "${type}" -> "Target ROAS"`);
      return "Target ROAS";
    } else if (typeLower.includes("max") && typeLower.includes("click")) {
      // Handle "max clicks" as "Maximize clicks"
      console.log(`Special pattern match: "${type}" -> "Maximize clicks"`);
      return "Maximize clicks";
    }

    // Default to Manual CPC if no match
    console.log(`No bid strategy match for "${type}", defaulting to Manual CPC`);
    return "Manual CPC";
  };

  const processCSV = async (text) => {
    try {
      // Validate text input
      if (!text || typeof text !== "string" || text.trim() === "") {
        throw new Error("CSV text is empty or invalid");
      }

      // Split into rows and validate
      const rows = text
        .split("\n")
        .map((row) => row.split("\t"))
        .filter((row) => row.some((cell) => cell.trim()));

      if (rows.length === 0) {
        throw new Error("CSV contains no valid data rows");
      }

      const headers = rows[0].map((header) => header.trim());
      console.log("CSV Headers:", headers); // Show all headers for debugging

      if (headers.length === 0) {
        throw new Error("CSV contains no valid headers");
      }

      // Validate required headers
      const requiredHeaders = ["Campaign"];
      const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));
      if (missingHeaders.length > 0) {
        throw new Error(`CSV is missing required headers: ${missingHeaders.join(", ")}`);
      }

      const data = rows.slice(1);
      if (data.length === 0) {
        throw new Error("CSV contains headers but no data rows");
      }

      // Find bid strategy header (check various common names)
      const bidStrategyIndex = headers.findIndex((h) => h === "Bid Strategy Type" || h === "Bid Strategy" || h === "BidStrategyType");
      console.log(
        `Found Bid Strategy header at index: ${bidStrategyIndex}, header name: "${
          bidStrategyIndex !== -1 ? headers[bidStrategyIndex] : "Not found"
        }"`
      );

      // Find budget header
      const budgetIndex = headers.findIndex((h) => h === "Budget");
      console.log(`Found Budget header at index: ${budgetIndex}`);

      // Collect campaign settings first
      const campaignSettings = {};

      // First pass: collect all campaign settings
      data.forEach((row, index) => {
        try {
          // Build row data object
          const rowData = {};
          headers.forEach((header, headerIndex) => {
            rowData[header] = row[headerIndex]?.trim() || "";
          });

          const campaignName = rowData["Campaign"]?.trim() || "Generic";
          if (campaignName === "Generic") return; // Skip generic rows

          // Extract campaign settings, prioritizing rows with bid strategy
          if (!campaignSettings[campaignName]) {
            campaignSettings[campaignName] = {
              bidStrategyType: "",
              campaignStatus: "",
              campaignType: "",
              networks: [],
              budget: "",
              // Add more campaign settings as needed
            };
          }

          // Extract bid strategy - try multiple ways
          let bidStrategy = rowData["Bid Strategy Type"] || "";
          if ((!bidStrategy || bidStrategy.trim() === "") && bidStrategyIndex >= 0 && row[bidStrategyIndex] !== undefined) {
            bidStrategy = row[bidStrategyIndex]?.trim() || "";
          }

          // If we found a bid strategy in this row, use it
          if (bidStrategy && bidStrategy.trim() !== "") {
            campaignSettings[campaignName].bidStrategyType = bidStrategy;
            console.log(`Found bid strategy for "${campaignName}": "${bidStrategy}"`);
          }

          // Extract other campaign settings
          if (rowData["Campaign Status"] && rowData["Campaign Status"].trim() !== "") {
            campaignSettings[campaignName].campaignStatus = rowData["Campaign Status"];
          }

          if (rowData["Campaign Type"] && rowData["Campaign Type"].trim() !== "") {
            campaignSettings[campaignName].campaignType = rowData["Campaign Type"];
          }

          if (rowData["Networks"] && rowData["Networks"].trim() !== "") {
            campaignSettings[campaignName].networks = rowData["Networks"];
          }

          if (rowData["Budget"] && rowData["Budget"].trim() !== "") {
            campaignSettings[campaignName].budget = rowData["Budget"];
          }
        } catch (error) {
          console.error(`Error processing row ${index + 1}:`, error);
          // Continue to next row instead of stopping completely
        }
      });

      console.log("Extracted campaign settings:", campaignSettings);

      // Check if we have any valid campaign settings
      if (Object.keys(campaignSettings).length === 0) {
        throw new Error("No valid campaign data found in the CSV");
      }

      const clientStructure = {};

      // Helper function to convert status
      const normalizeStatus = (status) => {
        if (!status || status.trim() === "") {
          return "Active";
        }
        // Convert 'enabled' to 'Active' and 'paused' to 'Paused'
        return status.toLowerCase() === "enabled" ? "Active" : status.toLowerCase() === "paused" ? "Paused" : status;
      };

      // Helper function to handle numeric values
      const parseNumericValue = (value) => {
        if (!value || value === "-" || value.trim() === "") return "";
        try {
          const num = parseFloat(value.replace(/[^0-9.-]/g, ""));
          return isNaN(num) ? "" : num.toString();
        } catch (error) {
          console.error(`Error parsing numeric value "${value}":`, error);
          return "";
        }
      };

      // Second pass: process ad groups and ads
      data.forEach((row, index) => {
        try {
          // Build row data object
          const rowData = {};
          headers.forEach((header, headerIndex) => {
            rowData[header] = row[headerIndex]?.trim() || "";
          });

          // Get campaign name and ad group name, preserving spaces and special characters
          const campaignName = rowData["Campaign"]?.trim() || "Generic";
          const adGroupName = rowData["Ad Group"]?.trim();

          // Skip if no valid campaign name
          if (campaignName === "Generic" || !campaignName) {
            console.log(`Skipping row ${index + 1} with generic or empty campaign name`);
            return;
          }

          // Get campaign settings
          const settings = campaignSettings[campaignName] || {};

          // Find bid strategy from various possible field names
          let rawBidStrategy = rowData["Bid Strategy Type"] || "";

          // Try alternative field names if the primary one is empty
          if (!rawBidStrategy && bidStrategyIndex !== -1 && row[bidStrategyIndex] !== undefined) {
            rawBidStrategy = row[bidStrategyIndex]?.trim() || "";
          }

          if (!rawBidStrategy) {
            rawBidStrategy = rowData["Bid Strategy"] || rowData["BidStrategyType"] || "";
          }

          // Use campaign settings if row doesn't have bid strategy
          if (!rawBidStrategy && settings.bidStrategyType) {
            rawBidStrategy = settings.bidStrategyType;
            console.log(`Using campaign setting bid strategy for "${campaignName}": "${rawBidStrategy}"`);
          }

          console.log(`Row ${index + 1} - Campaign "${campaignName}" - Raw bid strategy: "${rawBidStrategy}"`);

          // Process numeric fields with error handling
          const maxCpc = parseNumericValue(rowData["Max CPC"]);
          const maxCpm = parseNumericValue(rowData["Max CPM"]);
          const targetCpa = parseNumericValue(rowData["Target CPA"]);
          const maxCpv = parseNumericValue(rowData["Max CPV"]);
          const targetCpv = parseNumericValue(rowData["Target CPV"]);
          const percentCpc = parseNumericValue(rowData["Percent CPC"]);
          const targetCpm = parseNumericValue(rowData["Target CPM"]);
          const targetRoas = parseNumericValue(rowData["Target ROAS"]);
          const firstPageBid = parseNumericValue(rowData["First page bid"]);
          const topOfPageBid = parseNumericValue(rowData["Top of page bid"]);
          const firstPositionBid = parseNumericValue(rowData["First position bid"]);

          // Initialize campaign structure if it doesn't exist
          if (!clientStructure[campaignName]) {
            try {
              // Get networks from the CSV without defaults
              const networksString = rowData["Networks"] || settings.networks || "";

              let networks = [];
              try {
                networks = networksString
                  ? networksString
                      .replace(/^['"]|['"]$/g, "") // Remove outer quotes (single or double)
                      .replace(/^"|"$/g, "") // Remove any remaining double quotes
                      .split(/[;,]/) // Split by either semicolon or comma
                      .map((n) => n.trim())
                      .filter((n) => n)
                  : [];
              } catch (error) {
                console.error(`Error processing networks for "${campaignName}":`, error);
              }

              // Normalize the bid strategy with error handling
              let normalizedBidStrategy = "Manual CPC"; // Default
              try {
                normalizedBidStrategy = normalizeBidStrategyType(rawBidStrategy, campaignName);
              } catch (error) {
                console.error(`Error normalizing bid strategy for "${campaignName}":`, error);
              }
              console.log(`Normalized bid strategy for "${campaignName}": "${normalizedBidStrategy}"`);

              // Create languages array safely
              let languages = ["en"];
              try {
                if (rowData["Languages"]) {
                  languages = rowData["Languages"]
                    .replace(/^["']|["']$/g, "")
                    .split(";")
                    .map((l) => l.trim())
                    .filter((l) => l);

                  if (languages.length === 0) {
                    languages = ["en"];
                  }
                }
              } catch (error) {
                console.error(`Error processing languages for "${campaignName}":`, error);
              }

              clientStructure[campaignName] = {
                campaigns: {},
                campaignStatus: normalizeStatus(rowData["Campaign Status"] || settings.campaignStatus || ""),
                sanitizedCampaignName: sanitizeDocumentId(campaignName),
                // Add campaign settings with networks array
                campaignDailyBudget: rowData["Budget"] || settings.budget || "",
                campaignType: rowData["Campaign Type"] || settings.campaignType || "Search",
                networks: networks,
                languages: languages,
                bidStrategyType: normalizedBidStrategy,
                maxCpc: maxCpc,
                maxCpm: maxCpm,
                targetCpa: targetCpa,
                maxCpv: maxCpv,
                targetCpv: targetCpv,
                percentCpc: percentCpc,
                targetCpm: targetCpm,
                targetRoas: targetRoas,
                adRotation: rowData["Ad rotation"] || "Optimize for clicks",
                location: rowData["Location"] || "",
                locationId: rowData["Location ID"] || "",
                broadMatchKeywords: rowData["Broad match keywords"] || "Off",
                labels: rowData["Labels"] || "",
                targetingMethod: rowData["Targeting method"] || "Location of presence or Area of interest",
                startDate: rowData["Start Date"] || null,
                endDate: rowData["End Date"] || null,
              };
            } catch (error) {
              console.error(`Error creating campaign structure for "${campaignName}":`, error);
              // Create minimal campaign structure to avoid further errors
              clientStructure[campaignName] = {
                campaigns: {},
                campaignStatus: "Active",
                sanitizedCampaignName: sanitizeDocumentId(campaignName),
                bidStrategyType: "Manual CPC",
              };
            }
          }

          // Skip rows without an ad group name - BUT we've already captured campaign settings
          if (!adGroupName) {
            console.log(`Skipping row ${index + 1} without ad group name for campaign "${campaignName}". Campaign settings captured.`);
            return;
          }

          // Debug logging for empty campaign and ad group
          if (campaignName === "Empy Campaign test" || adGroupName === "Empty Ad group test") {
            console.log("Found empty campaign/ad group:", {
              campaignName,
              adGroupName,
              rowData,
            });
          }

          // Use original names for document IDs (only remove special characters)
          const sanitizedCampaignName = sanitizeDocumentId(campaignName);
          const sanitizedAdGroupName = sanitizeDocumentId(adGroupName);

          // Get status values from CSV and normalize them
          const campaignStatus = normalizeStatus(rowData["Campaign Status"]);
          const adGroupStatus = normalizeStatus(rowData["Ad Group Status"]);
          const adStatus = normalizeStatus(rowData["Status"]);

          // Debug logging for status values
          if (campaignName === "Empy Campaign test" || adGroupName === "Empty Ad group test") {
            console.log("Status values for empty campaign/ad group:", {
              campaignStatus,
              adGroupStatus,
              adStatus,
            });
          }

          // Collect all headlines and descriptions
          const headlines = [];
          const descriptions = [];

          // Process headlines (1-15) with pin positions
          for (let i = 1; i <= 15; i++) {
            const headlineText = rowData[`Headline ${i}`];
            const headlinePosition = rowData[`Headline ${i} position`];
            if (headlineText && headlineText.trim()) {
              const cleanHeadline = headlineText.trim().replace(/^["']|["']$/g, "");
              headlines.push({
                id: `headline-id-${i - 1}`,
                text: cleanHeadline,
                pin: headlinePosition ? headlinePosition.trim() : "",
                isExtra: false,
              });
            }
          }

          // Debug logging for headlines
          if (adGroupName === "Köp Färg") {
            console.log("Processed headlines for Köp Färg:", headlines);
          }

          // Only create an ad if it's a Responsive search ad
          const isResponsiveSearchAd = rowData["Ad type"] === "Responsive search ad";

          // Use the ad group name as the ad name for empty ad groups
          const adName = isResponsiveSearchAd
            ? adGroupName === "Köp Färg"
              ? adGroupName
              : headlines[0]?.text || adGroupName
            : adGroupName;

          // Sanitize the ad name but keep spaces
          const sanitizedAdName = sanitizeDocumentId(adName);

          // Process descriptions (1-4) with pin positions
          for (let i = 1; i <= 4; i++) {
            const descriptionText = rowData[`Description ${i}`];
            const descriptionPosition = rowData[`Description ${i} position`];
            if (descriptionText && descriptionText.trim()) {
              const cleanDescription = descriptionText.trim().replace(/^["']|["']$/g, "");
              descriptions.push({
                id: `description-id-${i - 1}`,
                text: cleanDescription,
                pin: descriptionPosition ? descriptionPosition.trim() : "",
                isExtra: false,
              });
            }
          }

          // Get the label value
          const labelValue = rowData["Labels"] || "";

          // Process ad group data only if we have an ad group name
          if (!clientStructure[campaignName].campaigns[adGroupName]) {
            clientStructure[campaignName].campaigns[adGroupName] = {
              adGroups: {},
              adGroupStatus: adGroupStatus,
              sanitizedAdGroupName: sanitizedAdGroupName,
              // Add maxCpc at ad group level
              maxCpc: maxCpc,
              // Add bid-related fields to ad group level
              firstPageBid,
              topOfPageBid,
              firstPositionBid,
            };
          }

          // Only add ad data if it's a Responsive search ad
          if (isResponsiveSearchAd) {
            // Add ad data with status, pins, and label
            const adData = {
              categoryName: adName,
              adStatus: adStatus,
              timestamp: serverTimestamp(),
              sanitizedAdName: sanitizedAdName,
              // Ensure we have at least one empty headline and description if none exist
              headlineValues: headlines.length > 0 ? headlines : [{ id: "headline-id-0", text: "", pin: "", isExtra: false }],
              descriptionValues: descriptions.length > 0 ? descriptions : [{ id: "description-id-0", text: "", pin: "", isExtra: false }],
              pathValues: [
                { id: "path-id-0", text: rowData["Path 1"] || "" },
                { id: "path-id-1", text: rowData["Path 2"] || "" },
              ],
              finalUrlValues: [{ id: "final-url-id-0", text: rowData["Final URL"] || "" }],
              labelsValues: [{ id: "label-id-0", text: labelValue || "" }],
            };

            // Initialize ads object if it doesn't exist
            if (!clientStructure[campaignName].campaigns[adGroupName].ads) {
              clientStructure[campaignName].campaigns[adGroupName].ads = {};
            }

            // Add the ad to the structure
            clientStructure[campaignName].campaigns[adGroupName].ads[adName] = adData;

            // Debug logging after adding ad data
            if (campaignName === "Empy Campaign test" || adGroupName === "Empty Ad group test") {
              console.log("Added ad data for empty campaign/ad group:", {
                adName,
                adData,
                currentAds: clientStructure[campaignName].campaigns[adGroupName].ads,
              });
            }
          }
        } catch (error) {
          console.error(`Error processing row ${index + 1}:`, error);
          // Continue to next row
        }
      });

      // Filter out any empty campaigns
      Object.keys(clientStructure).forEach((campaignName) => {
        if (Object.keys(clientStructure[campaignName].campaigns).length === 0) {
          console.log(`Removing empty campaign: ${campaignName}`);
          delete clientStructure[campaignName];
        }
      });

      // Check if we have any campaigns left
      if (Object.keys(clientStructure).length === 0) {
        throw new Error("No valid campaigns could be processed from the CSV");
      }

      // Debug the final structure for all campaigns
      Object.keys(clientStructure).forEach((campaignName) => {
        console.log(`Final processed structure for campaign "${campaignName}":`, {
          bidStrategyType: clientStructure[campaignName].bidStrategyType,
          campaignDailyBudget: clientStructure[campaignName].campaignDailyBudget,
          campaignType: clientStructure[campaignName].campaignType,
          networks: clientStructure[campaignName].networks,
        });
      });

      console.log("Processed structure:", clientStructure); // Debug log
      return clientStructure;
    } catch (error) {
      console.error("Error in processCSV:", error);
      throw error; // Re-throw to be caught by handleInitialImport
    }
  };

  const handleInitialImport = async () => {
    try {
      let text;
      if (isPasteMode) {
        if (!pastedText.trim()) {
          alert("Please paste some text to import");
          return;
        }
        text = pastedText;
      } else {
        if (!csvFile) return;
        text = await csvFile.text();
      }

      const data = await processCSV(text);

      setProcessedData(data);
      setIsModalOpen(false);
      setIsNamePromptOpen(true);
    } catch (error) {
      console.error("Error processing CSV:", error);
      alert("Error processing data. Please check the format and try again.");
    }
  };

  const handleFinalImport = async () => {
    if (!processedData || !currentUser || !clientName.trim()) return;

    setIsLoading(true);
    try {
      // Create the client document with sanitized name
      const sanitizedClientName = sanitizeDocumentId(clientName);
      const cleanClientName = clientName.replace(/^["]+|["]+$/g, "").trim();
      const clientRef = doc(db, "clients", currentUser.uid, "client", sanitizedClientName);
      await setDoc(clientRef, {
        name: cleanClientName,
        clientStatus: "Active",
        timestamp: serverTimestamp(),
      });

      // Import all campaigns under this client
      for (const [campaignName, campaignStructure] of Object.entries(processedData)) {
        const sanitizedCampaignName = sanitizeDocumentId(campaignName);
        const cleanCampaignName = campaignName.replace(/^["]+|["]+$/g, "").trim();
        const campaignRef = doc(clientRef, "adGroups", sanitizedCampaignName);

        console.log(`Saving campaign "${cleanCampaignName}" with bid strategy: "${campaignStructure.bidStrategyType}"`);

        await setDoc(campaignRef, {
          name: cleanCampaignName,
          campaignStatus: campaignStructure.campaignStatus || "Active",
          timestamp: serverTimestamp(),
          // Add all campaign settings
          campaignDailyBudget: campaignStructure.campaignDailyBudget,
          campaignType: campaignStructure.campaignType,
          networks: campaignStructure.networks,
          languages: campaignStructure.languages,
          bidStrategyType: campaignStructure.bidStrategyType,
          maxCpc: campaignStructure.maxCpc,
          maxCpm: campaignStructure.maxCpm,
          targetCpa: campaignStructure.targetCpa,
          maxCpv: campaignStructure.maxCpv,
          targetCpv: campaignStructure.targetCpv,
          percentCpc: campaignStructure.percentCpc,
          targetCpm: campaignStructure.targetCpm,
          targetRoas: campaignStructure.targetRoas,
          adRotation: campaignStructure.adRotation,
          location: campaignStructure.location,
          locationId: campaignStructure.locationId,
          broadMatchKeywords: campaignStructure.broadMatchKeywords,
          labels: campaignStructure.labels,
          targetingMethod: campaignStructure.targetingMethod,
          startDate: campaignStructure.startDate,
          endDate: campaignStructure.endDate,
        });

        // Import ad groups for this campaign
        const adGroups = campaignStructure.campaigns;
        for (const [adGroupName, adGroupData] of Object.entries(adGroups)) {
          const sanitizedAdGroupName = sanitizeDocumentId(adGroupName);
          const cleanAdGroupName = adGroupName.replace(/^["]+|["]+$/g, "").trim();
          const adGroupRef = doc(campaignRef, "adTypes", sanitizedAdGroupName);
          await setDoc(adGroupRef, {
            name: cleanAdGroupName,
            adGroupStatus: adGroupData.adGroupStatus || "Active",
            timestamp: serverTimestamp(),
            // Add maxCpc to ad group if bid strategy is Manual CPC
            ...(campaignStructure.bidStrategyType === "Manual CPC" && adGroupData.maxCpc ? { maxCpc: adGroupData.maxCpc } : {}),
            // Add other bid-related fields
            firstPageBid: adGroupData.firstPageBid,
            topOfPageBid: adGroupData.topOfPageBid,
            firstPositionBid: adGroupData.firstPositionBid,
          });

          // Import ads for this ad group
          if (adGroupData.ads) {
            for (const [adName, adData] of Object.entries(adGroupData.ads)) {
              const sanitizedAdName = sanitizeDocumentId(adName);
              const cleanAdName = adName.replace(/^["]+|["]+$/g, "").trim();
              const adRef = doc(adGroupRef, "categories", sanitizedAdName);
              await setDoc(adRef, {
                categoryName: cleanAdName, // Use cleaned name
                adStatus: adData.adStatus || "Active",
                timestamp: serverTimestamp(),
                // Preserve the exact structure of the arrays
                headlineValues: adData.headlineValues || [{ id: "headline-id-0", text: "", pin: "", isExtra: false }],
                descriptionValues: adData.descriptionValues || [{ id: "description-id-0", text: "", pin: "", isExtra: false }],
                pathValues: adData.pathValues || [
                  { id: "path-id-0", text: "" },
                  { id: "path-id-1", text: "" },
                ],
                finalUrlValues: adData.finalUrlValues || [{ id: "final-url-id-0", text: "" }],
                labelsValues: adData.labelsValues || [{ id: "label-id-0", text: "" }],
              });
            }
          }
        }
      }

      setShowToast(true);
      setIsModalOpen(false);
      setIsNamePromptOpen(false);
      setClientName("");
      setProcessedData(null);

      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Import error:", error);
      alert("Error importing data: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-md"
        title="Import Client">
        <FaFileImport size={18} />
      </button>

      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50"
          style={{
            position: "fixed",
            top: -80,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            width: "100vw",
          }}>
          <div className="bg-white rounded-lg w-1/4 max-w-4xl">
            {/* Header */}
            <div className="border-b px-6 py-4">
              <h2 className="text-2xl font-bold text-gray-800">Import Client Data</h2>
              <p className="text-gray-600 mt-1">Choose how you want to import your data</p>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Mode Toggle */}
              <div className="flex justify-center mb-6">
                <div className="inline-flex rounded-lg border border-gray-300 p-1">
                  <button
                    onClick={() => setIsPasteMode(false)}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${
                      !isPasteMode ? "bg-blue-500 text-white" : "text-gray-500 hover:text-gray-700"
                    }`}>
                    Upload File
                  </button>
                  <button
                    onClick={() => setIsPasteMode(true)}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${
                      isPasteMode ? "bg-blue-500 text-white" : "text-gray-500 hover:text-gray-700"
                    }`}>
                    Paste Text
                  </button>
                </div>
              </div>

              {/* File Upload Section */}
              {!isPasteMode && (
                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <FaFileImport className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg">
                    Select CSV File
                  </label>
                  {csvFile && (
                    <p className="mt-2 text-sm text-gray-600 break-words max-w-full overflow-hidden">Selected file: {csvFile.name}</p>
                  )}
                </div>
              )}

              {/* Paste Text Section */}
              {isPasteMode && (
                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8">
                  <textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Paste your CSV data here..."
                    className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    style={{ resize: "vertical" }}
                  />
                  <p className="mt-2 text-sm text-gray-600">
                    Paste your CSV data directly into this text area. The data should be tab-separated.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t px-6 py-4 bg-gray-50 flex justify-end gap-4">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setIsNamePromptOpen(false);
                  setClientName("");
                  setProcessedData(null);
                  setPastedText("");
                }}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                disabled={isLoading}>
                Cancel
              </button>
              <button
                onClick={handleInitialImport}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                disabled={(!csvFile && !pastedText.trim()) || isLoading}>
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 mr-2"
                      viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>Next</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {isNamePromptOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50"
          style={{
            position: "fixed",
            top: -80,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",

            minHeight: "100vh",
            width: "100vw",
          }}>
          <div className="bg-white rounded-lg w-2/3 max-w-4xl">
            {/* Header */}
            <div className="border-b px-6 py-4">
              <h2 className="text-2xl font-bold text-gray-800">Name Your Client</h2>
              <p className="text-gray-600 mt-1">Enter a name for the client you're importing</p>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="space-y-4">
                <label className="block">
                  <span className="text-gray-700 font-medium">Client Name</span>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Enter client name"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                  />
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t px-6 py-4 bg-gray-50 flex justify-end gap-4">
              <button
                onClick={() => {
                  setIsNamePromptOpen(false);
                  setIsModalOpen(false);
                  setClientName("");
                  setProcessedData(null);
                }}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                disabled={isLoading}>
                Cancel
              </button>
              <button
                onClick={handleFinalImport}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                disabled={!clientName.trim() || isLoading}>
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 mr-2"
                      viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Importing...
                  </>
                ) : (
                  <>Import</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showWarningModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "start",
            justifyContent: "center",
            paddingTop: "15vh",
            minHeight: "100vh",
            width: "100vw",
          }}>
          <div className="bg-white rounded-lg w-96 p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-red-600">Duplicate Client Name</h3>
            </div>
            <div className="mb-6">
              <p className="text-gray-600">
                A client with the name "<span className="font-semibold">{clientName}</span>" already exists. Please choose a different name.
              </p>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowWarningModal(false)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {showToast && <Toast message="Import completed successfully!" />}
    </>
  );
}
