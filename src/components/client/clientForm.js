"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import Modal from "../ModalClean";
import Button from "@/components/buttons";
import MarkedItems from "./markedItems";
import HeadlinesComponent from "./headlinesComponent";
import DescriptionsComponent from "./descriptionsComponent";
import DuplicateChecker from "../checkDuplicates/checkDuplicates";
import PathFinalLabelComponent from "./pathFinalLabelComponent";
import AiHelperModal from "./aiHelperModal";
import AiEnhanceModal from "./aiEnhanceModal";
import { doc, getDoc, collection, getDocs, updateDoc, serverTimestamp, setDoc, writeBatch } from "firebase/firestore";
import { db } from "@/firebase/firebase";
import AutocompleteInput from "@/components/common/AutocompleteInput";
import ImportCopy from "@/components/clientname/importCopy";
import Toast from "@/components/Toast";
import { CiUndo, CiRedo } from "react-icons/ci";
import { createPortal } from "react-dom";
import { useRouter, usePathname } from "next/navigation";

// Helper function to sanitize document IDs for Firebase
const sanitizeDocumentId = (id) => {
  if (!id) return id;
  // Replace slashes with underscores to create valid Firebase document IDs
  return id.replace(/\//g, "_");
};

// Add this new component before the ClientForm component
const CategoriesDropdown = ({
  currentUser,
  clientName,
  adGroupName,
  adType,
  categoryName,
  selectedImportCategory,
  setSelectedImportCategory,
  setImportedContent,
}) => {
  const [allCategories, setAllCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const dropdownContentRef = useRef(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  // Clear dropdown when client changes
  useEffect(() => {
    setSelectedImportCategory("");
    setImportedContent(null);
    setAllCategories([]);
  }, [clientName, setImportedContent, setSelectedImportCategory]); // Added missing dependencies

  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        dropdownContentRef.current &&
        !dropdownContentRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchAllCategories = async () => {
      if (!currentUser || !clientName) return;
      setIsLoading(true);

      try {
        const adGroupsRef = collection(db, "clients", currentUser.uid, "client", decodeURIComponent(clientName), "adGroups");
        const adGroupsSnapshot = await getDocs(adGroupsRef);

        let allCats = [];

        for (const adGroupDoc of adGroupsSnapshot.docs) {
          const adGroupName = adGroupDoc.id;
          if (adGroupName === "Generic") continue;

          const adTypesRef = collection(adGroupDoc.ref, "adTypes");
          const adTypesSnapshot = await getDocs(adTypesRef);

          for (const adTypeDoc of adTypesSnapshot.docs) {
            const adTypeName = adTypeDoc.id;

            const categoriesRef = collection(adTypeDoc.ref, "categories");
            const categoriesSnapshot = await getDocs(categoriesRef);

            for (const categoryDoc of categoriesSnapshot.docs) {
              const categoryName = categoryDoc.id;
              allCats.push({
                adGroup: adGroupName,
                adType: adTypeName,
                category: categoryName,
              });
            }
          }
        }

        setAllCategories(allCats);
      } catch (error) {
        console.error("Error fetching all categories:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllCategories();
  }, [currentUser, clientName]);

  const handleCategoryChange = async (selectedCat) => {
    setSelectedImportCategory(selectedCat);
    setIsOpen(false);

    if (!selectedCat) {
      setImportedContent(null);
      return;
    }

    try {
      if (!currentUser || !clientName) {
        console.log("Missing required fields:", { currentUser, clientName });
        return;
      }

      // Special handling for All Headlines & Descriptions
      if (selectedCat === "Generic") {
        try {
          // Get all ad groups for the current client only
          const adGroupsRef = collection(db, "clients", currentUser.uid, "client", decodeURIComponent(clientName), "adGroups");
          const adGroupsSnapshot = await getDocs(adGroupsRef);

          let allHeadlines = [];
          let allDescriptions = [];
          const headlineCounts = new Map();
          const descriptionCounts = new Map();

          // For each ad group in the current client
          for (const adGroupDoc of adGroupsSnapshot.docs) {
            const adGroupName = adGroupDoc.id;
            if (adGroupName === "Generic") continue;

            const adTypesRef = collection(adGroupDoc.ref, "adTypes");
            const adTypesSnapshot = await getDocs(adTypesRef);

            for (const adTypeDoc of adTypesSnapshot.docs) {
              const adTypeName = adTypeDoc.id;

              const categoriesRef = collection(adTypeDoc.ref, "categories");
              const categoriesSnapshot = await getDocs(categoriesRef);

              for (const categoryDoc of categoriesSnapshot.docs) {
                const categoryName = categoryDoc.id;
                const data = categoryDoc.data();

                if (data.headlineValues) {
                  data.headlineValues.forEach((h) => {
                    const text = typeof h === "string" ? h : h.text;
                    if (text) {
                      headlineCounts.set(text, (headlineCounts.get(text) || 0) + 1);

                      const existingIndex = allHeadlines.findIndex((existing) => existing.text === text);

                      const location = {
                        adGroup: adGroupName,
                        adType: adTypeName,
                        category: categoryName,
                      };

                      if (existingIndex === -1) {
                        allHeadlines.push({
                          text: text,
                          usageCount: headlineCounts.get(text),
                          locations: [location],
                        });
                      } else {
                        if (!allHeadlines[existingIndex].locations) {
                          allHeadlines[existingIndex].locations = [];
                        }
                        allHeadlines[existingIndex].locations.push(location);
                      }
                    }
                  });
                }

                if (data.descriptionValues) {
                  data.descriptionValues.forEach((d) => {
                    const text = typeof d === "string" ? d : d.text;
                    if (text) {
                      descriptionCounts.set(text, (descriptionCounts.get(text) || 0) + 1);

                      const existingIndex = allDescriptions.findIndex((existing) => existing.text === text);

                      const location = {
                        adGroup: adGroupName,
                        adType: adTypeName,
                        category: categoryName,
                      };

                      if (existingIndex === -1) {
                        allDescriptions.push({
                          text: text,
                          usageCount: descriptionCounts.get(text),
                          locations: [location],
                        });
                      } else {
                        if (!allDescriptions[existingIndex].locations) {
                          allDescriptions[existingIndex].locations = [];
                        }
                        allDescriptions[existingIndex].locations.push(location);
                      }
                    }
                  });
                }
              }
            }
          }

          allHeadlines = allHeadlines.map((h) => ({
            ...h,
            usageCount: headlineCounts.get(h.text) || 0,
          }));

          allDescriptions = allDescriptions.map((d) => ({
            ...d,
            usageCount: descriptionCounts.get(d.text) || 0,
          }));

          allHeadlines.sort((a, b) => b.usageCount - a.usageCount);
          allDescriptions.sort((a, b) => b.usageCount - a.usageCount);

          setImportedContent({
            categoryName: "All Headlines & Descriptions",
            headlines: allHeadlines,
            descriptions: allDescriptions,
            selectedAdGroup: "All",
            isGeneric: true,
          });
          return;
        } catch (error) {
          console.error("Error fetching all content:", error);
          setImportedContent(null);
          setSelectedImportCategory("");
          return;
        }
      }

      // For regular categories - parse the selected value which now includes adGroup and adType
      const [selectedAdGroup, selectedAdType, selectedCategory] = selectedCat.split("|");

      const categoryRef = doc(
        db,
        "clients",
        currentUser.uid,
        "client",
        decodeURIComponent(clientName),
        "adGroups",
        selectedAdGroup,
        "adTypes",
        selectedAdType,
        "categories",
        selectedCategory
      );

      const docSnapshot = await getDoc(categoryRef);

      if (docSnapshot.exists()) {
        const data = docSnapshot.data();

        const headlines = (data.headlineValues || []).map((h) => {
          if (typeof h === "string") {
            return { text: h, source: { adGroup: selectedAdGroup, adType: selectedAdType, category: selectedCategory } };
          }
          return h;
        });

        const descriptions = (data.descriptionValues || []).map((d) => {
          if (typeof d === "string") {
            return { text: d, source: { adGroup: selectedAdGroup, adType: selectedAdType, category: selectedCategory } };
          }
          return d;
        });

        setImportedContent({
          categoryName: selectedCategory,
          headlines,
          descriptions,
          pathValues: data.pathValues || [],
          finalUrlValues: data.finalUrlValues || [],
          labelsValues: data.labelsValues || [],
          adStatus: data.adStatus,
          adGroupStatus: data.adGroupStatus,
          campaignStatus: data.campaignStatus,
          selectedAdGroup: selectedAdGroup,
          selectedAdType: selectedAdType,
        });
      }
    } catch (error) {
      console.error("Error fetching category data:", error);
      setImportedContent(null);
      setSelectedImportCategory("");
    }
  };

  const filteredCategories = allCategories.filter((cat) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      cat.adGroup.toLowerCase().includes(searchLower) ||
      cat.adType.toLowerCase().includes(searchLower) ||
      cat.category.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div
      className="relative"
      ref={dropdownRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-64 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer bg-white flex justify-between items-center">
        <span className="truncate">
          {selectedImportCategory
            ? selectedImportCategory === "Generic"
              ? "All Headlines & Descriptions"
              : selectedImportCategory.split("|")[2]
            : "Select a category"}
        </span>
        <span className="ml-2">{isOpen ? "▲" : "▼"}</span>
      </div>

      {isOpen &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            ref={dropdownContentRef}
            className="fixed z-[9999] w-64 bg-white border rounded-lg shadow-lg max-h-96 overflow-hidden"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
            }}>
            <div className="p-2 border-b sticky top-0 bg-white">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search categories..."
                className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            <div className="overflow-y-auto max-h-80">
              <div
                className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCategoryChange("Generic");
                }}>
                All Headlines & Descriptions
              </div>

              {filteredCategories.map((cat, index) => (
                <div
                  key={index}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer truncate group"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCategoryChange(`${cat.adGroup}|${cat.adType}|${cat.category}`);
                  }}
                  title={`${cat.adGroup} - ${cat.adType} - ${cat.category}`}>
                  <span>{cat.category}</span>
                  <span className="text-xs text-gray-500 ml-2 opacity-0 group-hover:opacity-100">({cat.adGroup})</span>
                </div>
              ))}

              {isLoading && <div className="px-3 py-2 text-gray-500">Loading categories...</div>}

              {!isLoading && filteredCategories.length === 0 && searchTerm && (
                <div className="px-3 py-2 text-gray-500">No categories found</div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

const ClientForm = ({
  clientName = "",
  setClientName = () => {},
  categoryName = "",
  setCategoryName = () => {},
  headlineValues = [],
  descriptionValues = [],
  pathValues = [],
  finalUrlValues = [{ id: "final-url-id-0", text: "" }],
  updateFirebase = () => {},
  setPathValues = () => {},
  setFinalUrlValues = () => {},
  copyNotification = null,
  setCopyNotification = () => {},
  newListHeadlines = [],
  newListDescriptions = [],
  setNewListHeadlines = () => {},
  setNewListDescriptions = () => {},
  markAndSave = () => {},
  setHeadlineValues = () => {},
  setDescriptionValues = () => {},
  selectedHeadlines = [],
  selectedDescriptions = [],
  savedMessage = false,
  setSavedMessage = () => {},
  clientNameExist = false,
  setClientNameExist = () => {},
  isClientNameExistOpen = false,
  setIsClientNameExistOpen = () => {},
  controlClientCheckMessage = false,
  adType = "",
  setAdType = () => {},
  newListFinalUrls = [],
  newListPaths = [],
  setNewListFinalUrls = () => {},
  viewAllHeadlines = [],
  viewAllDescriptions = [],
  viewAllPaths = [],
  viewAllFinalUrl = [],
  viewAllLabels = [],
  setViewAllHeadlines = () => {},
  setViewAllDescriptions = () => {},
  setViewAllPaths = () => {},
  setViewAllFinalUrl = () => {},
  setViewAllLabels = () => {},
  labelsValues = [{ id: "label-id-0", text: "" }],
  setLabelsValues = () => {},
  selectedOptionValues = "enabled",
  setSelectedOptionValues = () => {},
  handleChangeDescription,
  propClientName,
  categories = [],
  currentUser = null,
  adGroupName = "",
  setAdGroupName = () => {},
  clients = [],
  adGroups = [],
  adTypes = [],
  onUpdate = () => {},
  campaignDailyBudget = "",
  setCampaignDailyBudget = () => {},
  campaignType = "Search",
  setCampaignType = () => {},
  networks = ["Google search", "Search Partners"],
  setNetworks = () => {},
  languages = ["en", "sv"],
  setLanguages = () => {},
  maxCpc = "",
  setMaxCpc = () => {},
  enhancedCpc = false,
  setEnhancedCpc = () => {},
  adRotation = "Rotate indefinit",
  setAdRotation = () => {},
  location = "Sverige",
  setLocation = () => {},
  campaignId = "",
  setCampaignId = () => {},
  website = "",
  setWebsite = () => {},
  bidStrategyType = "Manual CPC",
  setBidStrategyType = () => {},
  setSelectedHeadlines = () => {},
  setSelectedDescriptions = () => {},
  hasUnsavedChanges,
  setHasUnsavedChanges,
}) => {
  const router = useRouter();
  const pathname = usePathname();

  // All state hooks at the top level
  const [isClearConfirmationOpen, setClearConfirmationOpen] = useState(false);
  const [isopenAiHelper, setopenAiHelper] = useState(false);
  const [isDuplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState("");
  const [useViewAllData, setUseViewAllData] = useState(false);
  const [hasMarkedItems, setHasMarkedItems] = useState(false);
  const [capitalizeFirstLetter, setCapitalizeFirstLetter] = useState(false);
  const [finalUrl, setFinalUrl] = useState("");
  const [importedContent, setImportedContent] = useState(null);
  const [selectedImportHeadlines, setSelectedImportHeadlines] = useState([]);
  const [selectedImportDescriptions, setSelectedImportDescriptions] = useState([]);
  const [availableSlots, setAvailableSlots] = useState({ headlines: 0, descriptions: 0 });
  const [panelPosition, setPanelPosition] = useState({ x: 0, y: 16 });
  const [panelSize, setPanelSize] = useState({ width: 288, height: "auto" });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState({ active: false, edge: null });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedImportCategory, setSelectedImportCategory] = useState("");
  const [isEnhanceModalOpen, setEnhanceModalOpen] = useState(false);
  const [genericContent, setGenericContent] = useState(null);
  const [genericFilter, setGenericFilter] = useState({
    searchTerm: "",
    sortBy: "usage",
    limit: 10,
  });
  const [filteredContent, setFilteredContent] = useState(null);
  const [displayLimits, setDisplayLimits] = useState({ headlines: 10, descriptions: 10 });
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [importPanelPosition, setImportPanelPosition] = useState({ x: 0, y: 0 });
  const [importPanelSize, setImportPanelSize] = useState({ width: 400 });
  const [isDraggingPanel, setIsDraggingPanel] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [clientStatus, setClientStatus] = useState("Active");
  const [campaignStatus, setCampaignStatus] = useState("Active");
  const [adGroupStatus, setAdGroupStatus] = useState("Active");
  const [adStatus, setAdStatus] = useState("Active");
  const [showToast, setShowToast] = useState(false);
  const [preEnhancedValues, setPreEnhancedValues] = useState(null);
  const [showingEnhanced, setShowingEnhanced] = useState(true);
  const [enhancedValues, setEnhancedValues] = useState(null);
  const [formData, setFormData] = useState({
    targetCpa: "",
    startDate: null,
    endDate: null,
    status: "Enabled",
  });
  const [sortOrder, setSortOrder] = useState("mostUsed"); // Add this line for sort order state
  const [headlineDisplayLimit, setHeadlineDisplayLimit] = useState(16);
  const [descriptionDisplayLimit, setDescriptionDisplayLimit] = useState(6);
  const [showAllHeadlines, setShowAllHeadlines] = useState(false);
  const [showAllDescriptions, setShowAllDescriptions] = useState(false);
  const [importedHeadlines, setImportedHeadlines] = useState([]);
  const [importedDescriptions, setImportedDescriptions] = useState([]);
  const [draggedItem, setDraggedItem] = useState(null);
  const [selectAllHeadlines, setSelectAllHeadlines] = useState(false);
  const [selectAllDescriptions, setSelectAllDescriptions] = useState(false);

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
    setHasUnsavedChanges(true);
  };

  // All useEffect hooks
  useEffect(() => {
    if (typeof window !== "undefined") {
      setPanelPosition({ x: window.innerWidth - 320, y: 16 });
    }
  }, []);

  // Memoize handlePanelMouseMove with useCallback
  const handlePanelMouseMove = useCallback((e) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;

      const maxX = window.innerWidth - panelSize.width;
      const maxY = window.innerHeight - 100;

      setPanelPosition({
        x: Math.min(Math.max(0, newX), maxX),
        y: Math.min(Math.max(0, newY), maxY),
      });
    } else if (isResizing.active) {
      const minWidth = 200;
      const maxWidth = 600;

      if (isResizing.edge === "left") {
        const deltaX = e.clientX - dragStart.x;
        const newWidth = Math.min(Math.max(minWidth, panelSize.width - deltaX), maxWidth);
        if (newWidth !== panelSize.width) {
          setPanelPosition((prev) => ({
            ...prev,
            x: panelPosition.x + (panelSize.width - newWidth),
          }));
          setPanelSize((prev) => ({ ...prev, width: newWidth }));
        }
      } else if (isResizing.edge === "right") {
        const deltaX = e.clientX - (panelPosition.x + panelSize.width);
        const newWidth = Math.min(Math.max(minWidth, panelSize.width + deltaX), maxWidth);
        setPanelSize((prev) => ({ ...prev, width: newWidth }));
      }
    }
  }, [isDragging, isResizing, dragStart, panelSize, panelPosition]);

  const stopDragging = () => {
    setIsDragging(false);
    setIsResizing({ active: false, edge: null });
  };

  useEffect(() => {
    if (isDragging || isResizing.active) {
      window.addEventListener("mousemove", handlePanelMouseMove);
      window.addEventListener("mouseup", stopDragging);
      return () => {
        window.removeEventListener("mousemove", handlePanelMouseMove);
        window.removeEventListener("mouseup", stopDragging);
      };
    }
  }, [isDragging, isResizing, handlePanelMouseMove, stopDragging]); // Added missing dependencies

  useEffect(() => {
    if (useViewAllData) {
      convertViewAllToValues();
    }
  }, [useViewAllData]);

  useEffect(() => {
    if (newListDescriptions && newListDescriptions.length > 0) {
      const flatDescriptions = newListDescriptions.flat();
      setDescriptionValues((prevValues) =>
        prevValues.map((item, index) => ({
          ...item,
          text: flatDescriptions[index] || "",
        }))
      );
    }
  }, [newListDescriptions, setDescriptionValues]);

  useEffect(() => {
    // Populate headline values if available
    if (newListHeadlines && newListHeadlines.length > 0) {
      setHeadlineValues((prevValues) =>
        prevValues.map((item, index) => ({
          ...item,
          text: newListHeadlines[index] || item.text,
        }))
      );
    }

    // Populate final URL values if available
    if (newListFinalUrls && newListFinalUrls.length > 0) {
      setFinalUrlValues((prevValues) =>
        prevValues.map((item, index) => ({
          ...item,
          text: newListFinalUrls[index] || item.text,
        }))
      );
    }

    // Populate path values if available
    if (newListPaths && newListPaths.length > 0) {
      setPathValues((prevValues) =>
        prevValues.map((item, index) => ({
          ...item,
          text: newListPaths[index] || item.text,
        }))
      );
    }
  }, [newListHeadlines, newListFinalUrls, newListPaths, setHeadlineValues, setFinalUrlValues, setPathValues]);

  // Add useEffect to calculate available slots
  useEffect(() => {
    const emptyHeadlines = headlineValues.filter((h) => !h.text).length;
    const emptyDescriptions = descriptionValues.filter((d) => !d.text).length;
    setAvailableSlots({
      headlines: emptyHeadlines,
      descriptions: emptyDescriptions,
    });
  }, [headlineValues, descriptionValues]);

  function openClearConfirmation() {
    setClearConfirmationOpen(true);
  }

  // Function to close the clear confirmation modal
  function closeClearConfirmation() {
    setClearConfirmationOpen(false);
  }

  const openAiHelper = () => {
    const url = finalUrlValues.length > 0 ? finalUrlValues[0].text : ""; // Access `text` property of the first object
    setFinalUrl(url); // Store in `finalUrl` state
    setopenAiHelper(true); // Open modal
  };

  const closeAiHelper = () => {
    setopenAiHelper(false);
  };

  function handleClearConfirmation(confirmed) {
    if (confirmed) {
      clearInput();

      console.log("Cleared values:", {
        headlineValues,
        descriptionValues,
        pathValues,
        finalUrlValues,
        labelsValues,
      });
    }

    // Close the clear confirmation modal
    closeClearConfirmation();
  }

  function clearInput() {
    // setClientName("");
    // setAdGroupName("");
    // setAdType("");
    // setCategoryName("");
    setHeadlineValues((prevValues) => prevValues.map((input) => ({ ...input, text: "", headlineNumber: "" })));
    setDescriptionValues((prevValues) =>
      prevValues.map((input) => ({
        ...input,
        text: "",
        descriptionNumber: "",
      }))
    );
    setPathValues((prevValues) => prevValues.map((input) => ({ ...input, text: "" })));
    setFinalUrlValues((prevValues) => prevValues.map((input) => ({ ...input, text: "" })));
    setLabelsValues((prevValues) => prevValues.map((input) => ({ ...input, text: "" })));
    setUseViewAllData(false);
    setViewAllHeadlines([]);
    setViewAllDescriptions([]);
    setViewAllPaths([]);
    setViewAllFinalUrl([]);
    setViewAllLabels([]);
  }

  function getNonEmptyTexts(values) {
    if (!Array.isArray(values)) {
      console.error("Error: values is not an array");
      return [];
    }

    return values
      .filter((item) => item && typeof item === "object" && "text" in item)
      .map((item) => item.text.trim())
      .filter(Boolean);
  }

  const handleSave = (selectedHeadlines, selectedDescriptions) => {
    setHeadlineValues((prev) => {
      const updated = [...prev];
      let index = 0;
      selectedHeadlines.forEach((headline) => {
        // Find the first empty field in headlineValues
        while (index < updated.length && updated[index].text) {
          index++;
        }
        if (index < updated.length) {
          updated[index].text = headline;
          index++;
        }
      });
      return updated;
    });
    setDescriptionValues((prev) => {
      const updated = [...prev];
      let index = 0;
      selectedDescriptions.forEach((description) => {
        // Find the first empty field in descriptionValues
        while (index < updated.length && updated[index].text) {
          index++;
        }
        if (index < updated.length) {
          updated[index].text = description;
          index++;
        }
      });
      return updated;
    });
  };

  function copyAllInput() {
    // Always include one Ad type
    const adTypeRow = { field: "Ad type", text: "Responsive search ad" };

    // Include headlines and their positions
    const headlineRows = Array.from({ length: 15 }, (_, index) => ({
      field: `Headline ${index + 1}`,
      text: headlineValues[index]?.text || "",
      position: headlineValues[index]?.pin || "", // Store pin as position
    }));

    // Include descriptions and their positions
    const descriptionRows = Array.from({ length: 4 }, (_, index) => ({
      field: `Description ${index + 1}`,
      text: descriptionValues[index]?.text || "",
      position: descriptionValues[index]?.pin || "", // Store pin as position
    }));

    // Include Final URL
    const finalUrlRow = { field: "Final URL", text: finalUrlValues[0]?.text || "" };

    // Add label as the last column
    const labelRow = { field: "Labels", text: labelsValues[0]?.text || "" };

    // Add all status fields
    const statusRows = [
      { field: "Status", text: selectedOptionValues || "Enabled" },
      { field: "Client Status", text: clientStatus || "Active" },
      { field: "Campaign Status", text: campaignStatus || "Active" },
      { field: "Ad Group Status", text: adGroupStatus || "Active" },
      { field: "Ad Status", text: adStatus || "Active" },
    ];

    // Combine all rows in order
    const allTexts = [adTypeRow, ...headlineRows, ...descriptionRows, finalUrlRow, labelRow, ...statusRows];

    // Create tab-separated headers and values
    const headers = allTexts
      .map(({ field, position }) => {
        if (field.startsWith("Headline") || field.startsWith("Description")) {
          return position ? `${field}\t${field} position` : field;
        }
        return field;
      })
      .join("\t");

    // Create tab-separated values
    const values = allTexts
      .map(({ text, position }) => {
        return position ? `${text}\t${position}` : text;
      })
      .join("\t");

    // Combine headers and values
    const combinedText = `${headers}\n${values}`;

    // Copy to clipboard
    navigator.clipboard
      .writeText(combinedText)
      .then(() => {
        console.log("Copied to clipboard:", combinedText);
        setCopyNotification("Text copied!");
        setTimeout(() => setCopyNotification(null), 2000);
      })
      .catch((err) => console.error("Copy failed", err));
  }

  // Modify handleImportSelection to reset the dropdown
  const handleImportSelection = async () => {
    try {
      // Find empty slots in current headlines and descriptions
      const emptyHeadlineSlots = headlineValues
        .map((h, index) => ({ index, isEmpty: !h.text }))
        .filter((h) => h.isEmpty)
        .map((h) => h.index);

      const emptyDescriptionSlots = descriptionValues
        .map((d, index) => ({ index, isEmpty: !d.text }))
        .filter((d) => d.isEmpty)
        .map((d) => d.index);

      // Update headlines - only fill empty slots
      setHeadlineValues((prev) => {
        const updated = [...prev];
        selectedImportHeadlines.forEach((headline, i) => {
          if (i < emptyHeadlineSlots.length) {
            const emptyIndex = emptyHeadlineSlots[i];
            updated[emptyIndex] = {
              ...updated[emptyIndex],
              text: headline.text,
            };
          }
        });
        return updated;
      });

      // Update descriptions - only fill empty slots
      setDescriptionValues((prev) => {
        const updated = [...prev];
        selectedImportDescriptions.forEach((description, i) => {
          if (i < emptyDescriptionSlots.length) {
            const emptyIndex = emptyDescriptionSlots[i];
            updated[emptyIndex] = {
              ...updated[emptyIndex],
              text: description.text,
            };
          }
        });
        return updated;
      });

      // Update usage counts in Firestore
      if (currentUser && clientName) {
        const batch = writeBatch(db);

        // Update headlines usage
        for (const headline of selectedImportHeadlines) {
          const { text, source } = headline;
          if (source && source.adGroup && source.adType && source.category) {
            const categoryRef = doc(
              db,
              "clients",
              currentUser.uid,
              "client",
              decodeURIComponent(clientName),
              "adGroups",
              source.adGroup,
              "adTypes",
              source.adType,
              "categories",
              source.category
            );

            const categoryDoc = await getDoc(categoryRef);
            if (categoryDoc.exists()) {
              const data = categoryDoc.data();
              const headlineValues = data.headlineValues || [];
              const updatedHeadlines = headlineValues.map((h) => {
                const hText = typeof h === "string" ? h : h.text;
                if (hText === text) {
                  return {
                    text: hText,
                    usageCount: (typeof h === "string" ? 0 : h.usageCount || 0) + 1,
                    lastUsed: serverTimestamp(),
                    source: source,
                  };
                }
                return h;
              });
              batch.update(categoryRef, { headlineValues: updatedHeadlines });
            }
          }
        }

        // Update descriptions usage
        for (const description of selectedImportDescriptions) {
          const { text, source } = description;
          if (source && source.adGroup && source.adType && source.category) {
            const categoryRef = doc(
              db,
              "clients",
              currentUser.uid,
              "client",
              decodeURIComponent(clientName),
              "adGroups",
              source.adGroup,
              "adTypes",
              source.adType,
              "categories",
              source.category
            );

            const categoryDoc = await getDoc(categoryRef);
            if (categoryDoc.exists()) {
              const data = categoryDoc.data();
              const descriptionValues = data.descriptionValues || [];
              const updatedDescriptions = descriptionValues.map((d) => {
                const dText = typeof d === "string" ? d : d.text;
                if (dText === text) {
                  return {
                    text: dText,
                    usageCount: (typeof d === "string" ? 0 : d.usageCount || 0) + 1,
                    lastUsed: serverTimestamp(),
                    source: source,
                  };
                }
                return d;
              });
              batch.update(categoryRef, { descriptionValues: updatedDescriptions });
            }
          }
        }

        // Commit all updates
        await batch.commit();
      }

      // Clear only the selected items, not the entire imported content
      setSelectedImportHeadlines([]);
      setSelectedImportDescriptions([]);
    } catch (error) {
      console.error("Error updating usage counts:", error);
    }
  };

  // Add a close button handler in the import panel
  const handleCloseImportPanel = () => {
    setImportedContent(null);
    setSelectedImportCategory("");
    setSelectedImportHeadlines([]);
    setSelectedImportDescriptions([]);
    setImportedHeadlines([]);
    setImportedDescriptions([]);
  };

  // Modify the enhance click handler
  const handleEnhanceClick = () => {
    const nonEmptyHeadlines = headlineValues.map((h) => h.text).filter((text) => text && text.trim() !== "");
    const nonEmptyDescriptions = descriptionValues.map((d) => d.text).filter((text) => text && text.trim() !== "");

    if (nonEmptyHeadlines.length === 0 && nonEmptyDescriptions.length === 0) {
      alert("Please add some headlines or descriptions first");
      return;
    }

    // Save current values before enhancement
    setPreEnhancedValues({
      headlines: [...headlineValues],
      descriptions: [...descriptionValues],
    });

    setEnhanceModalOpen(true);
  };

  // Modify handleSaveEnhancements to store enhanced values
  const handleSaveEnhancements = (enhancedHeadlines, enhancedDescriptions) => {
    // Store the enhanced values
    const newEnhancedValues = {
      headlines: headlineValues.map((h, index) => ({
        ...h,
        text: enhancedHeadlines[index] || h.text,
      })),
      descriptions: descriptionValues.map((d, index) => ({
        ...d,
        text: enhancedDescriptions[index] || d.text,
      })),
    };
    setEnhancedValues(newEnhancedValues);

    // Update current values
    if (enhancedHeadlines.length > 0) {
      setHeadlineValues(newEnhancedValues.headlines);
    }

    if (enhancedDescriptions.length > 0) {
      setDescriptionValues(newEnhancedValues.descriptions);
    }
  };

  // Modify handleReset to use stored enhanced values
  const handleReset = () => {
    if (preEnhancedValues && enhancedValues) {
      if (showingEnhanced) {
        // Switch to original values
        setHeadlineValues(preEnhancedValues.headlines);
        setDescriptionValues(preEnhancedValues.descriptions);
      } else {
        // Switch back to enhanced values
        setHeadlineValues(enhancedValues.headlines);
        setDescriptionValues(enhancedValues.descriptions);
      }
      setShowingEnhanced(!showingEnhanced);
    }
  };

  // Move these functions to component level
  const countContentOccurrences = async () => {
    if (!currentUser || !clientName) return;

    try {
      // Get all ad groups
      const adGroupsRef = collection(db, "clients", currentUser.uid, "client", decodeURIComponent(clientName), "adGroups");
      const adGroupsSnapshot = await getDocs(adGroupsRef);

      const headlineCounts = new Map();
      const descriptionCounts = new Map();

      // Iterate through each ad group
      for (const adGroupDoc of adGroupsSnapshot.docs) {
        // Get all ad types in this ad group
        const adTypesRef = collection(adGroupDoc.ref, "adTypes");
        const adTypesSnapshot = await getDocs(adTypesRef);

        // Iterate through each ad type
        for (const adTypeDoc of adTypesSnapshot.docs) {
          // Get all categories in this ad type
          const categoriesRef = collection(adTypeDoc.ref, "categories");
          const categoriesSnapshot = await getDocs(categoriesRef);

          // Iterate through each category
          for (const categoryDoc of categoriesSnapshot.docs) {
            const data = categoryDoc.data();

            // Count headlines
            if (data.headlineValues) {
              data.headlineValues.forEach((h) => {
                const text = typeof h === "string" ? h : h.text;
                if (text) {
                  headlineCounts.set(text, (headlineCounts.get(text) || 0) + 1);
                }
              });
            }

            // Count descriptions
            if (data.descriptionValues) {
              data.descriptionValues.forEach((d) => {
                const text = typeof d === "string" ? d : d.text;
                if (text) {
                  descriptionCounts.set(text, (descriptionCounts.get(text) || 0) + 1);
                }
              });
            }
          }
        }
      }

      // Update the generic content with the new counts
      const genericRef = doc(
        db,
        "clients",
        currentUser.uid,
        "client",
        decodeURIComponent(clientName),
        "adGroups",
        "Generic",
        "categories",
        "All"
      );

      const genericDoc = await getDoc(genericRef);
      if (genericDoc.exists()) {
        const data = genericDoc.data();

        // Update headlines with counts
        const updatedHeadlines = (data.headlineValues || []).map((h) => {
          const text = typeof h === "string" ? h : h.text;
          return {
            ...(typeof h === "string" ? { text: h } : h),
            usageCount: headlineCounts.get(text) || 0,
          };
        });

        // Update descriptions with counts
        const updatedDescriptions = (data.descriptionValues || []).map((d) => {
          const text = typeof d === "string" ? d : d.text;
          return {
            ...(typeof d === "string" ? { text: d } : d),
            usageCount: descriptionCounts.get(text) || 0,
          };
        });

        // Update the document
        await updateDoc(genericRef, {
          headlineValues: updatedHeadlines,
          descriptionValues: updatedDescriptions,
        });

        // Update local state
        setGenericContent({
          ...data,
          headlineValues: updatedHeadlines,
          descriptionValues: updatedDescriptions,
        });
      }
    } catch (error) {
      console.error("Error counting content occurrences:", error);
    }
  };

  // Memoize fetchGenericContent with useCallback
  const fetchGenericContent = useCallback(async () => {
    if (!currentUser || !clientName) return;

    try {
      // First count all occurrences
      await countContentOccurrences();

      // Then fetch the updated generic content
      const genericRef = doc(
        db,
        "clients",
        currentUser.uid,
        "client",
        decodeURIComponent(clientName),
        "adGroups",
        "Generic",
        "categories",
        "All"
      );

      const docSnapshot = await getDoc(genericRef);
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        setGenericContent(data);
      }
    } catch (error) {
      console.error("Error fetching generic content:", error);
    }
  }, [currentUser, clientName, countContentOccurrences]);

  // Add useEffect at component level
  useEffect(() => {
    if (currentUser && clientName) {
      fetchGenericContent();
    }
  }, [currentUser, clientName, fetchGenericContent]); // Added missing dependency

  // Add these new functions for improved dragging
  const startDraggingPanel = (e) => {
    setIsDraggingPanel(true);
    setDragOffset({
      x: e.clientX - importPanelPosition.x,
      y: e.clientY - importPanelPosition.y,
    });
  };

  // Memoize handleMouseMove with useCallback
  const handleMouseMove = useCallback((e) => {
    if (isDraggingPanel) {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      // Keep the panel within window bounds
      const maxX = window.innerWidth - 800; // 800px is panel width
      const maxY = window.innerHeight - 400; // Approximate max height

      setImportPanelPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    }
  }, [isDraggingPanel, dragOffset.x, dragOffset.y]);

  const handleMouseUp = useCallback(() => {
    setIsDraggingPanel(false);
  }, []);

  // Add effect to handle mouse events
  useEffect(() => {
    if (isDraggingPanel) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingPanel, handleMouseMove, handleMouseUp]); // Added missing dependencies

  // Add this function to ClientForm
  const handleImportCopies = (headlines, descriptions) => {
    // Update headlines - find empty slots and fill them
    setHeadlineValues((prevValues) => {
      const updated = [...prevValues];
      let headlineIndex = 0;

      // Find first empty slot
      while (headlineIndex < updated.length && updated[headlineIndex].text) {
        headlineIndex++;
      }

      // Fill empty slots with new headlines
      headlines.forEach((headline) => {
        if (headlineIndex < updated.length) {
          updated[headlineIndex] = {
            ...updated[headlineIndex],
            text: headline,
          };
          headlineIndex++;
        }
      });

      return updated;
    });

    // Update descriptions - find empty slots and fill them
    setDescriptionValues((prevValues) => {
      const updated = [...prevValues];
      let descriptionIndex = 0;

      // Find first empty slot
      while (descriptionIndex < updated.length && updated[descriptionIndex].text) {
        descriptionIndex++;
      }

      // Fill empty slots with new descriptions
      descriptions.forEach((description) => {
        if (descriptionIndex < updated.length) {
          updated[descriptionIndex] = {
            ...updated[descriptionIndex],
            text: description,
          };
          descriptionIndex++;
        }
      });

      return updated;
    });
  };

  // Add this useEffect to watch headlineValues and update categoryName
  useEffect(() => {
    // Only set default name if categoryName is empty and there's a first headline
    if ((!categoryName || categoryName === "") && headlineValues && headlineValues.length > 0 && headlineValues[0].text) {
      setCategoryName(headlineValues[0].text);
    }
  }, [headlineValues, categoryName, setCategoryName]); // Added missing dependencies

  const handleCreateCollection = async (e) => {
    e.preventDefault();
    // Set hasUnsavedChanges to false immediately to prevent navigation prompt
    setHasUnsavedChanges(false);
    // Only check for required name fields
    if (!currentUser || !clientName || !adGroupName || !adType || !categoryName) {
      console.error("Missing required fields");
      alert("Please fill in all required fields (Client, Campaign Name, Ad Group, and Ad Name)");
      // Reset hasUnsavedChanges back to true if validation fails
      setHasUnsavedChanges(true);
      return;
    }

    try {
      // Create/update client document with status
      const clientRef = doc(db, "clients", currentUser.uid, "client", clientName);
      await setDoc(
        clientRef,
        {
          name: clientName,
          id: clientName,
          clientName: clientName,
          clientStatus: clientStatus,
          timestamp: serverTimestamp(),
        },
        { merge: true }
      );

      // Create/update ad group (campaign) document with all settings
      const adGroupRef = doc(clientRef, "adGroups", adGroupName);
      await setDoc(
        adGroupRef,
        {
          name: adGroupName,
          id: adGroupName,
          adGroupName: adGroupName,
          campaignStatus: campaignStatus,
          // Campaign settings
          campaignDailyBudget,
          campaignType,
          networks,
          languages,
          maxCpc,
          enhancedCpc,
          adRotation,
          location,
          campaignId,
          website,
          bidStrategyType,
          // Additional campaign settings from formData
          targetCpa: formData.targetCpa || "",
          targetRoas: formData.targetRoas || "",
          targetImpressionShare: formData.targetImpressionShare || "",
          broadMatchKeywords: formData.broadMatchKeywords || "Off",
          labels: formData.labels || "",
          targetingMethod: formData.targetingMethod || "Location of presence or Area of interest",
          startDate: formData.startDate,
          endDate: formData.endDate,
          timestamp: serverTimestamp(),
        },
        { merge: true }
      );

      // Sanitize document IDs to avoid Firebase path errors
      const safeAdType = sanitizeDocumentId(adType);
      const safeCategoryName = sanitizeDocumentId(categoryName);

      // Create/update ad type document with status
      const adTypeRef = doc(adGroupRef, "adTypes", safeAdType);
      await setDoc(
        adTypeRef,
        {
          name: adType, // Keep original display name
          id: adType,
          adGroupStatus: adGroupStatus,
          timestamp: serverTimestamp(),
        },
        { merge: true }
      );

      // First, check if there's an existing document with googleAdsId
      const categoryRef = doc(adTypeRef, "categories", safeCategoryName);
      const existingDoc = await getDoc(categoryRef);

      // Prepare the data to save
      const categoryData = {
        categoryName: categoryName,
        id: categoryName,
        name: categoryName,
        adStatus: adStatus,
        headlineValues: headlineValues.map((h) => ({
          ...h,
          text: h.text || "",
        })),
        descriptionValues: descriptionValues.map((d) => ({
          ...d,
          text: d.text || "",
        })),
        pathValues: pathValues,
        finalUrlValues: finalUrlValues,
        labelsValues: labelsValues,
        timestamp: serverTimestamp(),
      };

      // If there's an existing googleAdsId, preserve it
      if (existingDoc.exists() && existingDoc.data().googleAdsId) {
        categoryData.googleAdsId = existingDoc.data().googleAdsId;
      }

      // Save the document
      await setDoc(categoryRef, categoryData);

      // Replace alert with toast
      setShowToast(true);

      // Call onUpdate to refresh the sidebar data
      await onUpdate();

      setHasUnsavedChanges(false);

      // Optionally clear the form or reset states
      setSavedMessage(true);
      setTimeout(() => {
        setSavedMessage(false);
      }, 2000);
    } catch (error) {
      console.error("Error saving data:", error);
      alert("Error saving data: " + error.message);
    }
  };

  // Add this near the top of the component where other useEffects are
  useEffect(() => {
    const loadSavedStatuses = async () => {
      if (!currentUser || !clientName || !adGroupName || !adType || !categoryName) return;

      try {
        // Get client status
        const clientRef = doc(db, "clients", currentUser.uid, "client", clientName);
        const clientDoc = await getDoc(clientRef);
        if (clientDoc.exists() && clientDoc.data().clientStatus) {
          setClientStatus(clientDoc.data().clientStatus);
        }

        // Get campaign status
        const adGroupRef = doc(clientRef, "adGroups", adGroupName);
        const adGroupDoc = await getDoc(adGroupRef);
        if (adGroupDoc.exists() && adGroupDoc.data().campaignStatus) {
          setCampaignStatus(adGroupDoc.data().campaignStatus);
        }

        // Sanitize document IDs to avoid Firebase path errors
        const safeAdType = sanitizeDocumentId(adType);
        const safeCategoryName = sanitizeDocumentId(categoryName);

        // Get ad group status
        const adTypeRef = doc(adGroupRef, "adTypes", safeAdType);
        const adTypeDoc = await getDoc(adTypeRef);
        if (adTypeDoc.exists() && adTypeDoc.data().adGroupStatus) {
          setAdGroupStatus(adTypeDoc.data().adGroupStatus);
        }

        // Get ad status
        const categoryRef = doc(adTypeRef, "categories", safeCategoryName);
        const categoryDoc = await getDoc(categoryRef);
        if (categoryDoc.exists() && categoryDoc.data().adStatus) {
          setAdStatus(categoryDoc.data().adStatus);
        }
      } catch (error) {
        console.error("Error loading statuses:", error);
      }
    };

    loadSavedStatuses();
  }, [currentUser, clientName, adGroupName, adType, categoryName]); // Dependencies array

  // Add useEffect for auto-dismissing toast
  useEffect(() => {
    if (showToast) {
      setTimeout(() => {
        setShowToast(false);
      }, 2000);
    }
  }, [showToast]);

  // Add useEffect to close import panel when client changes
  useEffect(() => {
    if (importedContent) {
      handleCloseImportPanel();
      setSelectedImportCategory("");
    }
  }, [clientName, importedContent]); // Added missing dependency

  const handleSaveCampaignSettings = async (e) => {
    e.preventDefault();
    if (!currentUser || !clientName || !adGroupName) {
      alert("Please fill in Client Name and Campaign Name");
      return;
    }

    try {
      // Sanitize document IDs to avoid Firebase path errors
      const safeClientName = sanitizeDocumentId(clientName);
      const safeAdGroupName = sanitizeDocumentId(adGroupName);

      // Create/update ad group document with campaign settings
      const clientRef = doc(db, "clients", currentUser.uid, "client", safeClientName);
      const adGroupRef = doc(clientRef, "adGroups", safeAdGroupName);
      await setDoc(
        adGroupRef,
        {
          campaignDailyBudget,
          campaignType,
          networks,
          languages,
          maxCpc,
          enhancedCpc,
          adRotation,
          location,
          campaignId,
          website,
          bidStrategyType,
          campaignStatus,
          timestamp: serverTimestamp(),
        },
        { merge: true }
      );

      setShowToast(true);
    } catch (error) {
      console.error("Error saving campaign settings:", error);
      alert("Error saving campaign settings. Please try again.");
    }
  };

  // Add handleCheckboxChange function
  const handleCheckboxChange = (categoryName, type, index, checked) => {
    if (type === "headlines") {
      const headline = importedContent.headlines[index];
      setSelectedHeadlines((prev) => {
        if (checked) {
          return [...prev, headline.text];
        } else {
          return prev.filter((h) => h !== headline.text);
        }
      });
    } else if (type === "descriptions") {
      const description = importedContent.descriptions[index];
      setSelectedDescriptions((prev) => {
        if (checked) {
          return [...prev, description.text];
        } else {
          return prev.filter((d) => d !== description.text);
        }
      });
    }
  };

  // Add new useEffect for handling imported content
  useEffect(() => {
    if (importedContent) {
      // Store imported content in separate state variables
      setImportedHeadlines(
        importedContent.headlines.map((headline, index) => ({
          id: `imported-headline-${index}`,
          text: headline.text || "",
          pin: headline.pin || "",
          isExtra: false,
        }))
      );

      setImportedDescriptions(
        importedContent.descriptions.map((description, index) => ({
          id: `imported-description-${index}`,
          text: description.text || "",
          pin: description.pin || "",
          isExtra: false,
        }))
      );

      // Set status values if they exist
      if (importedContent.adStatus) {
        setAdStatus(importedContent.adStatus);
      }
      if (importedContent.adGroupStatus) {
        setAdGroupStatus(importedContent.adGroupStatus);
      }
      if (importedContent.campaignStatus) {
        setCampaignStatus(importedContent.campaignStatus);
      }
    }
  }, [importedContent, setAdStatus, setAdGroupStatus, setCampaignStatus]); // Added missing dependencies

  const handleSelectAllHeadlines = () => {
    const visibleHeadlines = importedHeadlines
      .sort((a, b) => {
        if (sortOrder === "mostUsed") {
          return (b.usageCount || 0) - (a.usageCount || 0);
        }
        return sortOrder === "asc" ? a.text.localeCompare(b.text) : b.text.localeCompare(a.text);
      })
      .slice(0, showAllHeadlines ? undefined : headlineDisplayLimit)
      .map((h) => h.text);

    if (selectedHeadlines.length === visibleHeadlines.length) {
      setSelectedHeadlines([]);
    } else {
      setSelectedHeadlines(visibleHeadlines);
    }
  };

  const handleSelectAllDescriptions = () => {
    const visibleDescriptions = importedDescriptions
      .sort((a, b) => {
        if (sortOrder === "mostUsed") {
          return (b.usageCount || 0) - (a.usageCount || 0);
        }
        return sortOrder === "asc" ? a.text.localeCompare(b.text) : b.text.localeCompare(a.text);
      })
      .slice(0, showAllDescriptions ? undefined : descriptionDisplayLimit)
      .map((d) => d.text);

    const allCurrentlySelected =
      selectedDescriptions.length === visibleDescriptions.length &&
      visibleDescriptions.every((desc) => selectedDescriptions.includes(desc));

    if (allCurrentlySelected) {
      setSelectedDescriptions([]);
    } else {
      setSelectedDescriptions(visibleDescriptions);
    }
  };

  const handleImportFromEditor = (importData) => {
    // Set campaign name (ad group name)
    if (importData.campaignName) {
      setAdGroupName(importData.campaignName);
    }

    // Set ad group name (ad type)
    if (importData.adGroupName) {
      setAdType(importData.adGroupName);
    }

    // Set headlines
    if (importData.headlines.length > 0) {
      setHeadlineValues((prevValues) => {
        const newValues = [...prevValues];
        importData.headlines.forEach((headline, index) => {
          if (index < newValues.length) {
            newValues[index] = {
              ...newValues[index],
              text: headline.text,
              pin: headline.pin,
            };
          }
        });
        return newValues;
      });
    }

    // Set descriptions
    if (importData.descriptions.length > 0) {
      setDescriptionValues((prevValues) => {
        const newValues = [...prevValues];
        importData.descriptions.forEach((description, index) => {
          if (index < newValues.length) {
            newValues[index] = {
              ...newValues[index],
              text: description.text,
              pin: description.pin,
            };
          }
        });
        return newValues;
      });
    }

    // Set paths
    if (importData.paths.length > 0) {
      setPathValues((prevValues) => {
        const newValues = [...prevValues];
        importData.paths.forEach((path, index) => {
          if (index < newValues.length) {
            newValues[index] = {
              ...newValues[index],
              text: path.text,
            };
          }
        });
        return newValues;
      });
    }

    // Set final URL
    if (importData.finalUrl) {
      setFinalUrlValues((prevValues) => [
        {
          ...prevValues[0],
          text: importData.finalUrl,
        },
      ]);
    }

    // Set labels
    if (importData.labels) {
      setLabelsValues((prevValues) => [
        {
          ...prevValues[0],
          text: importData.labels,
        },
      ]);
    }

    // Set statuses - update all status fields
    if (importData.status) setSelectedOptionValues(importData.status);
    if (importData.clientStatus) setClientStatus(importData.clientStatus);
    if (importData.campaignStatus) setCampaignStatus(importData.campaignStatus);
    if (importData.adGroupStatus) setAdGroupStatus(importData.adGroupStatus);
    if (importData.adStatus) setAdStatus(importData.adStatus);

    setShowImportPanel(false);
  };

  // Add these new functions for drag and drop
  const handleDragStart = (e, item, type) => {
    // Set data for the drag operation
    e.dataTransfer.setData("text/plain", item.text);
    e.dataTransfer.setData("type", type);

    // Store source information for usage tracking
    setDraggedItem({
      text: item.text,
      type,
      source: {
        adGroup: importedContent?.selectedAdGroup,
        adType: importedContent?.selectedAdType,
        category: importedContent?.categoryName,
      },
    });
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  // Function to update usage count in Firebase
  const updateUsageCount = async (text, type) => {
    if (!currentUser || !clientName || !draggedItem) return;

    try {
      const { adGroup, adType, category } = draggedItem.source;
      if (!adGroup || !adType || !category) return;

      const categoryRef = doc(
        db,
        "clients",
        currentUser.uid,
        "client",
        decodeURIComponent(clientName),
        "adGroups",
        adGroup,
        "adTypes",
        adType,
        "categories",
        category
      );

      const categoryDoc = await getDoc(categoryRef);
      if (categoryDoc.exists()) {
        const data = categoryDoc.data();

        if (type === "headline") {
          const headlineValues = data.headlineValues || [];
          const updatedHeadlines = headlineValues.map((h) => {
            const hText = typeof h === "string" ? h : h.text;
            if (hText === text) {
              return {
                text: hText,
                usageCount: (typeof h === "string" ? 0 : h.usageCount || 0) + 1,
                lastUsed: serverTimestamp(),
                source: { adGroup, adType, category },
              };
            }
            return h;
          });

          await updateDoc(categoryRef, { headlineValues: updatedHeadlines });
        } else if (type === "description") {
          const descriptionValues = data.descriptionValues || [];
          const updatedDescriptions = descriptionValues.map((d) => {
            const dText = typeof d === "string" ? d : d.text;
            if (dText === text) {
              return {
                text: dText,
                usageCount: (typeof d === "string" ? 0 : d.usageCount || 0) + 1,
                lastUsed: serverTimestamp(),
                source: { adGroup, adType, category },
              };
            }
            return d;
          });

          await updateDoc(categoryRef, { descriptionValues: updatedDescriptions });
        }
      }
    } catch (error) {
      console.error("Error updating usage count:", error);
    }
  };

  // Add new function to check if content exists
  const checkIfContentExists = (text, type) => {
    if (type === "headline") {
      return headlineValues.some((h) => h.text === text);
    } else if (type === "description") {
      return descriptionValues.some((d) => d.text === text);
    }
    return false;
  };

  // Add this useEffect near the top of the component with other useEffects
  useEffect(() => {
    // Clear imported content when client changes
    setImportedContent(null);
    setSelectedImportCategory("");
    setSelectedImportHeadlines([]);
    setSelectedImportDescriptions([]);
  }, [clientName]);

  // Add useEffect to initialize hasUnsavedChanges
  useEffect(() => {
    setHasUnsavedChanges(false);
  }, [setHasUnsavedChanges]); // Added missing dependency

  // Add a ref for the flex justify-end div
  const endDivRef = useRef(null);

  // Add useEffect to reset hasUnsavedChanges when the ad changes
  useEffect(() => {
    // When any of these values change, it means we're editing a different ad
    // Reset the hasUnsavedChanges state to ensure the save status shows as expected
    setHasUnsavedChanges(false);
  }, [clientName, adGroupName, adType, categoryName, setHasUnsavedChanges]); // Added missing dependency

  // Add useEffect to handle save button positioning
  useEffect(() => {
    const handleScroll = () => {
      const saveButton = document.querySelector(".fixed.z-50");
      const endDiv = endDivRef.current;

      if (!saveButton || !endDiv) return;

      // Get the position of the endDiv relative to the viewport
      const endDivRect = endDiv.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Check if the bottom of the endDiv is visible in the viewport
      if (endDivRect.bottom < windowHeight) {
        // Calculate the distance from the bottom of the viewport to place the button
        // This ensures the button doesn't go below the bottom of the endDiv
        const newButtonBottom = windowHeight - endDivRect.bottom - 24; // 20px buffer

        // Apply the new position to the button
        saveButton.style.bottom = `${newButtonBottom}px`;
      } else {
        // Reset to default position when bottom of div is not visible
        saveButton.style.bottom = "30px";
      }
    };

    // Call once on mount
    handleScroll();

    // Add scroll event listener
    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  // Add navigation handling
  const handleBeforeNavigate = (href) => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm("You have unsaved changes. Are you sure you want to leave?");
      if (confirmed) {
        router.push(href);
      }
      return !confirmed;
    }
    return false;
  };

  // Add beforeunload handler
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Add click handler for links
  useEffect(() => {
    const handleClick = (e) => {
      const target = e.target.closest("a");
      if (target && target.href) {
        const href = target.getAttribute("href");
        if (href && href !== pathname) {
          if (hasUnsavedChanges) {
            e.preventDefault();
            const confirmed = window.confirm("You have unsaved changes. Are you sure you want to leave?");
            if (confirmed) {
              router.push(href);
            }
          }
        }
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [hasUnsavedChanges, pathname, router]);

  // Function to handle programmatic navigation
  const handleNavigation = (href) => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm("You have unsaved changes. Are you sure you want to leave?");
      if (confirmed) {
        router.push(href);
      }
    } else {
      router.push(href);
    }
  };

  // Add missing function - convertViewAllToValues
  const convertViewAllToValues = () => {
    // Implementation of the missing function
    if (viewAllHeadlines.length > 0) {
      const newHeadlineValues = [...headlineValues];
      viewAllHeadlines.forEach((headline, index) => {
        if (index < newHeadlineValues.length) {
          newHeadlineValues[index] = {
            ...newHeadlineValues[index],
            text: headline.text || "",
          };
        }
      });
      setHeadlineValues(newHeadlineValues);
    }

    if (viewAllDescriptions.length > 0) {
      const newDescriptionValues = [...descriptionValues];
      viewAllDescriptions.forEach((description, index) => {
        if (index < newDescriptionValues.length) {
          newDescriptionValues[index] = {
            ...newDescriptionValues[index],
            text: description.text || "",
          };
        }
      });
      setDescriptionValues(newDescriptionValues);
    }

    if (viewAllPaths.length > 0) {
      const newPathValues = [...pathValues];
      viewAllPaths.forEach((path, index) => {
        if (index < newPathValues.length) {
          newPathValues[index] = {
            ...newPathValues[index],
            text: path.text || "",
          };
        }
      });
      setPathValues(newPathValues);
    }

    if (viewAllFinalUrl.length > 0) {
      const newFinalUrlValues = [...finalUrlValues];
      viewAllFinalUrl.forEach((finalUrl, index) => {
        if (index < newFinalUrlValues.length) {
          newFinalUrlValues[index] = {
            ...newFinalUrlValues[index],
            text: finalUrl.text || "",
          };
        }
      });
      setFinalUrlValues(newFinalUrlValues);
    }

    if (viewAllLabels.length > 0) {
      const newLabelsValues = [...labelsValues];
      viewAllLabels.forEach((label, index) => {
        if (index < newLabelsValues.length) {
          newLabelsValues[index] = {
            ...newLabelsValues[index],
            text: label.text || "",
          };
        }
      });
      setLabelsValues(newLabelsValues);
    }
  };

  const toggleMarkedItems = useCallback((hasItems) => {
    setHasMarkedItems(hasItems);
  }, [setHasMarkedItems]);

  const onDragEnd = (result, type) => {
    if (!result.destination) {
      return;
    }
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    // Update state variables based on the type
    if (type === "HEADLINE") {
      const updatedHeadlineValues = Array.from(headlineValues);
      const [removed] = updatedHeadlineValues.splice(sourceIndex, 1);
      updatedHeadlineValues.splice(destinationIndex, 0, removed);
      console.log("Updated Headline Values:", updatedHeadlineValues);
      setHeadlineValues(updatedHeadlineValues);
      setHasUnsavedChanges(true);
    } else if (type === "DESCRIPTION") {
      const updatedDescriptionValues = Array.from(descriptionValues);
      const [removed] = updatedDescriptionValues.splice(sourceIndex, 1);
      updatedDescriptionValues.splice(destinationIndex, 0, removed);
      console.log("Updated Description Values:", updatedDescriptionValues);
      setDescriptionValues(updatedDescriptionValues);
      setHasUnsavedChanges(true);
    }
  };

  return (
    <div className={`flex justify-center ${importedContent ? "mx-4 max-w-[95vw]" : ""}`}>
      <div className={`flex flex-col ${importedContent ? "flex-shrink" : "flex-grow"}`}>
        <div className="flex flex-col">
          {/* Input fields for client name, category name, and buttons */}
          <div className="flex gap-3 mb-5 mt-3 w-full justify-end -translate-x-2 -translate-y-2">
            <div className="flex gap-3 items-center">
              <div className="flex gap-2">
                <CategoriesDropdown
                  currentUser={currentUser}
                  clientName={clientName}
                  adGroupName={adGroupName}
                  adType={adType}
                  categoryName={categoryName}
                  selectedImportCategory={selectedImportCategory}
                  setSelectedImportCategory={setSelectedImportCategory}
                  setImportedContent={setImportedContent}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleEnhanceClick}
                  title="AI Enhance"
                  size="medium"
                  color="dark"
                  className="border border-slate-600 bg-slate-700 hover:bg-slate-500 text-white rounded-md"
                />
                {preEnhancedValues && enhancedValues && (
                  <button
                    onClick={handleReset}
                    className="border border-slate-600 bg-slate-700 hover:bg-slate-500 text-white rounded-2xl px-2 py-1.5 flex items-center gap-1.5 w-20 justify-center"
                    title={showingEnhanced ? "Reset enhancement" : "Redo enhancement"}>
                    {showingEnhanced ? (
                      <>
                        <CiUndo size={16} />
                        <span className="text-sm">Reset</span>
                      </>
                    ) : (
                      <>
                        <CiRedo size={16} />
                        <span className="text-sm">Redo</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              <div>
                <Button
                  onClick={openAiHelper}
                  finalUrl={finalUrlValues[0]?.text}
                  title="AI Help"
                  color="dark"
                  size="medium"
                />
              </div>
              <div>
                <Button
                  onClick={() => setShowImportPanel(true)}
                  title="Paste from Editor"
                  color="dark"
                  size="medium"
                />
              </div>
              <div>
                <Button
                  onClick={() => setClearConfirmationOpen(true)}
                  title="Clear all"
                  color="dark"
                  size="medium"
                />
              </div>
              <div>
                <div className="relative z-10">
                  <DuplicateChecker
                    adType={adType}
                    headlineValues={headlineValues}
                    descriptionValues={descriptionValues}
                    pathValues={pathValues}
                    finalUrlValues={finalUrlValues}
                    setIsCopying={copyAllInput}
                    setDuplicateModalOpen={setDuplicateModalOpen}
                    setModalContent={setModalContent}
                    copyFieldValues={copyAllInput}
                  />
                </div>
                {/* Copy notification */}
                <div className="flex justify-center">
                  {copyNotification && (
                    <div
                      className={`copy-notification text-black flex items-center mt-2 px-2 opacity-0 transition-opacity duration-500 ease-in-out ${
                        copyNotification && "opacity-100"
                      }`}>
                      {copyNotification}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div
            className="flex justify-end"
            ref={endDivRef}>
            <div className="extrabox">
              <div className={`flex gap-4 ${importedContent ? "max-w-[60vw]" : ""}`}>
                <div className="flex flex-col gap-10">
                  <div
                    className="ml-8 flex flex-col gap-4"
                    style={{ marginLeft: "28px" }}>
                    <AutocompleteInput
                      // className="hidden"
                      value={clientName ? decodeURIComponent(clientName) : ""}
                      onChange={(value) => {
                        setClientName(value);
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="Client name"
                      suggestions={clients || []}
                      required
                    />
                    <AutocompleteInput
                      // className="hidden"
                      value={adGroupName}
                      onChange={(value) => {
                        setAdGroupName(value);
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="Campaign Name"
                      suggestions={adGroups || []}
                      required
                    />
                    <AutocompleteInput
                      // className="hidden"
                      value={adType}
                      onChange={(value) => {
                        setAdType(value);
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="Ad Group"
                      suggestions={adTypes || []}
                      required
                    />
                    <AutocompleteInput
                      value={categoryName}
                      onChange={(value) => {
                        setCategoryName(value);
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="Ad Name"
                      suggestions={categories || []}
                      required
                    />
                  </div>

                  {/* Headlines */}
                  <HeadlinesComponent
                    headlineValues={headlineValues}
                    setHeadlineValues={(newValues) => {
                      setHeadlineValues(newValues);
                      setHasUnsavedChanges(true);
                    }}
                    viewAllHeadlines={viewAllHeadlines}
                    setViewAllHeadlines={setViewAllHeadlines}
                    onDragEnd={onDragEnd}
                  />
                </div>

                <div className="flex flex-col">
                  {/* Move PathFinalLabelComponent before DescriptionsComponent */}
                  <PathFinalLabelComponent
                    pathValues={pathValues}
                    finalUrlValues={finalUrlValues}
                    setPathValues={(newValues) => {
                      setPathValues(newValues);
                      setHasUnsavedChanges(true);
                    }}
                    setFinalUrlValues={(newValues) => {
                      setFinalUrlValues(newValues);
                      setHasUnsavedChanges(true);
                    }}
                    viewAllPaths={viewAllPaths}
                    viewAllFinalUrl={viewAllFinalUrl}
                    viewAllLabels={viewAllLabels}
                    setViewAllPaths={setViewAllPaths}
                    setViewAllFinalUrl={setViewAllFinalUrl}
                    setViewAllLabels={setViewAllLabels}
                    labelsValues={labelsValues}
                    setLabelsValues={(newValues) => {
                      setLabelsValues(newValues);
                      setHasUnsavedChanges(true);
                    }}
                    selectedOptionValues={selectedOptionValues}
                    setSelectedOptionValues={(value) => {
                      setSelectedOptionValues(value);
                      setHasUnsavedChanges(true);
                    }}
                    clientStatus={clientStatus}
                    setClientStatus={(value) => {
                      setClientStatus(value);
                      setHasUnsavedChanges(true);
                    }}
                    campaignStatus={campaignStatus}
                    setCampaignStatus={(value) => {
                      setCampaignStatus(value);
                      setHasUnsavedChanges(true);
                    }}
                    adGroupStatus={adGroupStatus}
                    setAdGroupStatus={(value) => {
                      setAdGroupStatus(value);
                      setHasUnsavedChanges(true);
                    }}
                    adStatus={adStatus}
                    setAdStatus={(value) => {
                      setAdStatus(value);
                      setHasUnsavedChanges(true);
                    }}
                    useViewAllData={useViewAllData}
                    currentUser={currentUser}
                    clientName={clientName}
                  />

                  {/* Move DescriptionsComponent after PathFinalLabelComponent */}
                  <div className="mt-10">
                    <DescriptionsComponent
                      descriptionValues={descriptionValues}
                      setDescriptionValues={(newValues) => {
                        setDescriptionValues(newValues);
                        setHasUnsavedChanges(true);
                      }}
                      viewAllDescriptions={viewAllDescriptions}
                      setViewAllDescription={setViewAllDescriptions}
                      onDragEnd={onDragEnd}
                      handleChangeDescription={handleChangeDescription}
                    />
                  </div>
                </div>
              </div>

              <div className="translate-y-14">
                <MarkedItems
                  newListHeadlines={newListHeadlines}
                  newListDescriptions={newListDescriptions}
                  markAndSave={markAndSave}
                  setHeadlineValues={setHeadlineValues}
                  setDescriptionValues={setDescriptionValues}
                  selectedHeadlines={selectedHeadlines}
                  selectedDescriptions={selectedDescriptions}
                  setNewListDescriptions={setNewListDescriptions}
                  setNewListHeadlines={setNewListHeadlines}
                  headlineValues={headlineValues}
                  descriptionValues={descriptionValues}
                  toggleMarkedItems={toggleMarkedItems}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Remove the original save button section */}
        {controlClientCheckMessage && (
          <p className="text-center font-bold text-md text-red-600 mt-2">
            Client name and Category name <br />
            must be filled in
          </p>
        )}

        {/* Modals */}
        {isopenAiHelper && (
          <AiHelperModal
            onClose={closeAiHelper}
            finalUrl={finalUrl}
            onSave={handleSave}
          />
        )}

        {/* Fixed save button that follows user when scrolling */}
        <div
          className="fixed z-50"
          style={{
            right: "20px",
            bottom: "30px",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          }}>
          <div
            className="bg-white p-3 rounded-lg flex flex-col items-center text-center"
            style={{
              width: "180px",
              minHeight: "130px",
              display: "flex",
              justifyContent: "center",
            }}>
            <div className={`text-sm font-medium mb-2 ${hasUnsavedChanges ? "text-red-500" : "text-green-500"}`}>
              {hasUnsavedChanges ? "Unsaved changes" : "All changes are saved"}
            </div>
            {controlClientCheckMessage && (
              <p className="text-xs font-bold text-red-600 mb-2">Client name and Category name must be filled in</p>
            )}
            <Button
              onClick={handleCreateCollection}
              title="Save"
              size="medium"
              color="dark"
              className="border border-slate-600 bg-slate-700 hover:bg-slate-500 text-white rounded-md"
            />
            {savedMessage && <p className="text-center font-bold text-sm text-green-600 mt-2">Saved!</p>}
          </div>
        </div>

        <div className="z-10 relative">
          <Modal
            isOpen={isClearConfirmationOpen}
            onClose={() => handleClearConfirmation(false)}
            content={
              <div className="font-nunito text-md text">
                <h1 className="mb-5 font-bold">Are you sure you want to clear all input fields?</h1>
                <div className="flex gap-3 justify-center mt-10 font-nunito">
                  <Button
                    onClick={() => handleClearConfirmation(true)}
                    title="Yes"
                    size="medium"
                    color="dark"
                    className="border border-slate-600 bg-slate-700 hover:bg-slate-500 text-white px-2 rounded-md"
                  />
                  <Button
                    onClick={() => handleClearConfirmation(false)}
                    title="No"
                    size="medium"
                    color="dark"
                  />
                </div>
              </div>
            }
          />
          <Modal
            isOpen={isDuplicateModalOpen}
            onClose={() => setDuplicateModalOpen(false)}
            content={modalContent}
          />
        </div>

        <Modal
          isOpen={isClientNameExistOpen}
          onClose={() => setIsClientNameExistOpen(false)}
          content={
            <div className="font-nunito text-md text">
              <h1 className="mb-5 font-bold">You already have an existing ad with this name. Would you like to overwrite it?</h1>
              <div className="flex gap-3 justify-center mt-10 font-nunito">
                <Button
                  onClick={() => {
                    updateFirebase();
                    setSavedMessage(true);
                    setIsClientNameExistOpen(false);
                  }}
                  title="Yes"
                  size="medium"
                  color="dark"
                  className="border border-slate-600 bg-slate-700 hover:bg-slate-500 text-white px-2 rounded-md"
                />
                <Button
                  onClick={() => setIsClientNameExistOpen(false)}
                  title="No"
                  size="medium"
                  color="dark"
                />
              </div>
            </div>
          }
        />

        {/* Add AiEnhanceModal */}
        {isEnhanceModalOpen && (
          <AiEnhanceModal
            onClose={() => setEnhanceModalOpen(false)}
            headlines={headlineValues.map((h) => h.text).filter((text) => text && text.trim() !== "")}
            descriptions={descriptionValues.map((d) => d.text).filter((text) => text && text.trim() !== "")}
            onSave={handleSaveEnhancements}
          />
        )}

        {showToast && <Toast message="Saved successfully!" />}

        {/* Add this near the other modals */}
        {showImportPanel && (
          <ImportCopy
            onImport={handleImportFromEditor}
            onClose={() => setShowImportPanel(false)}
          />
        )}
      </div>

      {/* Import Panel */}
      {importedContent && (
        <div
          className="fixed inset-0 z-50"
          style={{ pointerEvents: "none" }}>
          <div
            className="bg-white rounded-lg shadow-xl overflow-hidden"
            style={{
              padding: "1rem",
              position: "absolute",
              left: `${importPanelPosition.x}px`,
              top: `${importPanelPosition.y}px`,
              width: "600px", // Reduced from 800px
              maxHeight: "100vh",
              transform: "none",
              pointerEvents: "auto",
              backgroundColor: "white",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
              border: "1px solid #e5e7eb",
              cursor: isDraggingPanel ? "grabbing" : "default",
              transition: isDraggingPanel ? "none" : "box-shadow 0.2s ease",
              boxShadow: isDraggingPanel
                ? "0 8px 16px -4px rgba(0, 0, 0, 0.1), 0 4px 8px -2px rgba(0, 0, 0, 0.06)"
                : "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            }}>
            {/* Header */}
            <div
              className="bg-white border-b p-3 cursor-grab active:cursor-grabbing"
              onMouseDown={startDraggingPanel}
              style={{ userSelect: "none", touchAction: "none" }}>
              <div className="flex justify-between items-center">
                <h2 className="text-base font-medium text-gray-900">Import from Category</h2>
                <button
                  onClick={handleCloseImportPanel}
                  className="text-gray-400 hover:text-gray-600 transition-colors">
                  ✕
                </button>
              </div>
            </div>

            {/* Content */}
            <div
              className="overflow-y-auto"
              style={{ maxHeight: "calc(80vh - 48px)", paddingRight: "1rem" }}>
              {/* Add filter controls */}
              <div className="mb-4 space-y-2 bg-gray-50 p-3 rounded-lg">
                <div className="flex gap-3 items-center">
                  <input
                    type="text"
                    placeholder="Search headlines & descriptions..."
                    className="flex-1 px-3 py-1.5 border rounded text-sm"
                    onChange={(e) => {
                      const searchTerm = e.target.value.toLowerCase();
                      const filteredHeadlines = importedContent.headlines.filter((h) => h.text.toLowerCase().includes(searchTerm));
                      const filteredDescriptions = importedContent.descriptions.filter((d) => d.text.toLowerCase().includes(searchTerm));
                      setFilteredContent({
                        headlines: filteredHeadlines,
                        descriptions: filteredDescriptions,
                      });
                    }}
                  />
                  <select
                    className="px-3 py-1.5 border rounded text-sm bg-white"
                    onChange={(e) => {
                      const sortBy = e.target.value;
                      const sortedHeadlines = [...(filteredContent?.headlines || importedContent.headlines)];
                      const sortedDescriptions = [...(filteredContent?.descriptions || importedContent.descriptions)];

                      if (sortBy === "usage") {
                        sortedHeadlines.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
                        sortedDescriptions.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
                      } else if (sortBy === "least_used") {
                        sortedHeadlines.sort((a, b) => (a.usageCount || 0) - (b.usageCount || 0));
                        sortedDescriptions.sort((a, b) => (a.usageCount || 0) - (b.usageCount || 0));
                      } else if (sortBy === "az") {
                        sortedHeadlines.sort((a, b) => a.text.localeCompare(b.text));
                        sortedDescriptions.sort((a, b) => a.text.localeCompare(b.text));
                      } else if (sortBy === "za") {
                        sortedHeadlines.sort((a, b) => b.text.localeCompare(a.text));
                        sortedDescriptions.sort((a, b) => b.text.localeCompare(a.text));
                      }

                      setFilteredContent({
                        headlines: sortedHeadlines,
                        descriptions: sortedDescriptions,
                      });
                    }}>
                    <option value="">Sort by...</option>
                    <option value="usage">Most Used</option>
                    <option value="least_used">Least Used</option>
                    <option value="az">A-Z</option>
                    <option value="za">Z-A</option>
                  </select>
                </div>
                <div className="flex gap-3 items-center">
                  <div className="flex items-center gap-2">
                    <label className="text-sm">Headlines:</label>
                    <input
                      type="number"
                      min="1"
                      max={importedContent.headlines.length}
                      defaultValue={10}
                      disabled={showAllHeadlines}
                      className="w-20 px-2 py-1 border rounded text-sm"
                      onChange={(e) => {
                        setDisplayLimits((prev) => ({
                          ...prev,
                          headlines: parseInt(e.target.value) || 10,
                        }));
                      }}
                    />
                    <label className="flex items-center gap-1 text-sm">
                      <input
                        type="checkbox"
                        checked={showAllHeadlines}
                        onChange={(e) => {
                          setShowAllHeadlines(e.target.checked);
                          if (e.target.checked) {
                            setDisplayLimits((prev) => ({ ...prev, headlines: importedContent.headlines.length }));
                          } else {
                            setDisplayLimits((prev) => ({ ...prev, headlines: 10 }));
                          }
                        }}
                        className="w-4 h-4"
                      />
                      Show all
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm">Descriptions:</label>
                    <input
                      type="number"
                      min="1"
                      max={importedContent.descriptions.length}
                      defaultValue={10}
                      disabled={showAllDescriptions}
                      className="w-20 px-2 py-1 border rounded text-sm"
                      onChange={(e) => {
                        setDisplayLimits((prev) => ({
                          ...prev,
                          descriptions: parseInt(e.target.value) || 10,
                        }));
                      }}
                    />
                    <label className="flex items-center gap-1 text-sm">
                      <input
                        type="checkbox"
                        checked={showAllDescriptions}
                        onChange={(e) => {
                          setShowAllDescriptions(e.target.checked);
                          if (e.target.checked) {
                            setDisplayLimits((prev) => ({ ...prev, descriptions: importedContent.descriptions.length }));
                          } else {
                            setDisplayLimits((prev) => ({ ...prev, descriptions: 10 }));
                          }
                        }}
                        className="w-4 h-4"
                      />
                      Show all
                    </label>
                  </div>
                </div>
              </div>

              {/* Headlines Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">
                    Headlines <span className="text-sm text-gray-500">({availableSlots.headlines} slots available)</span>
                  </h4>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Select All</label>
                    <input
                      type="checkbox"
                      checked={selectAllHeadlines}
                      onChange={(e) => {
                        setSelectAllHeadlines(e.target.checked);
                        if (e.target.checked) {
                          // Select all headlines up to the available slots
                          const headlinesToSelect = (filteredContent?.headlines || importedContent.headlines)
                            .slice(0, availableSlots.headlines)
                            .filter((headline) => headline.text && headline.text.trim() !== "");
                          setSelectedImportHeadlines(headlinesToSelect);
                        } else {
                          setSelectedImportHeadlines([]);
                        }
                      }}
                      className="w-4 h-4"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  {(filteredContent?.headlines || importedContent.headlines)
                    .slice(0, displayLimits.headlines)
                    .filter((headline) => headline.text && headline.text.trim() !== "")
                    .map((headline, index) => {
                      const exists = checkIfContentExists(headline.text, "headline");
                      return (
                        <div
                          key={`headline-${index}`}
                          className={`flex items-center gap-2 p-2 border rounded ${exists ? "bg-red-50 border-red-200" : ""}`}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, headline, "headline")}
                          onDragEnd={handleDragEnd}>
                          <input
                            type="checkbox"
                            checked={selectedImportHeadlines.includes(headline)}
                            disabled={
                              !selectedImportHeadlines.includes(headline) && selectedImportHeadlines.length >= availableSlots.headlines
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                if (selectedImportHeadlines.length < availableSlots.headlines) {
                                  setSelectedImportHeadlines([...selectedImportHeadlines, headline]);
                                }
                              } else {
                                setSelectedImportHeadlines(selectedImportHeadlines.filter((h) => h !== headline));
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <div className="flex-1 cursor-grab">
                            <p className={`text-sm ${exists ? "text-red-600" : ""}`}>
                              {headline.text}
                              {exists && <span className="ml-2 text-xs text-red-500">(already exists in this ad)</span>}
                            </p>
                            {importedContent.isGeneric && (
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span>Used {headline.usageCount || 0} times</span>
                                <select
                                  className="px-1 py-0.5 text-xs border rounded bg-white cursor-pointer"
                                  defaultValue=""
                                  onChange={(e) => {
                                    const selectedIndex = parseInt(e.target.value);
                                    const location = headline.locations[selectedIndex];
                                    if (location) {
                                      setAdGroupName(location.adGroup);
                                      setAdType(location.adType);
                                      setCategoryName(location.category);
                                    }
                                  }}>
                                  <option
                                    value=""
                                    disabled>
                                    View locations...
                                  </option>
                                  {headline.locations?.map((loc, i) => (
                                    <option
                                      key={i}
                                      value={i}>
                                      {loc.adGroup}/{loc.adType}/{loc.category}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Descriptions Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">
                    Descriptions <span className="text-sm text-gray-500">({availableSlots.descriptions} slots available)</span>
                  </h4>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Select All</label>
                    <input
                      type="checkbox"
                      checked={selectAllDescriptions}
                      onChange={(e) => {
                        setSelectAllDescriptions(e.target.checked);
                        if (e.target.checked) {
                          // Select all descriptions up to the available slots
                          const descriptionsToSelect = (filteredContent?.descriptions || importedContent.descriptions)
                            .slice(0, availableSlots.descriptions)
                            .filter((description) => description.text && description.text.trim() !== "");
                          setSelectedImportDescriptions(descriptionsToSelect);
                        } else {
                          setSelectedImportDescriptions([]);
                        }
                      }}
                      className="w-4 h-4"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  {(filteredContent?.descriptions || importedContent.descriptions)
                    .slice(0, displayLimits.descriptions)
                    .filter((description) => description.text && description.text.trim() !== "")
                    .map((description, index) => {
                      const exists = checkIfContentExists(description.text, "description");
                      return (
                        <div
                          key={`description-${index}`}
                          className={`flex items-center gap-2 p-2 border rounded ${exists ? "bg-red-50 border-red-200" : ""}`}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, description, "description")}
                          onDragEnd={handleDragEnd}>
                          <input
                            type="checkbox"
                            checked={selectedImportDescriptions.includes(description)}
                            disabled={
                              !selectedImportDescriptions.includes(description) &&
                              selectedImportDescriptions.length >= availableSlots.descriptions
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                if (selectedImportDescriptions.length < availableSlots.descriptions) {
                                  setSelectedImportDescriptions([...selectedImportDescriptions, description]);
                                }
                              } else {
                                setSelectedImportDescriptions(selectedImportDescriptions.filter((d) => d !== description));
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <div className="flex-1 cursor-grab">
                            <p className={`text-sm ${exists ? "text-red-600" : ""}`}>
                              {description.text}
                              {exists && <span className="ml-2 text-xs text-red-500">(already exists in this ad)</span>}
                            </p>
                            {importedContent.isGeneric && (
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span>Used {description.usageCount || 0} times</span>
                                <select
                                  className="px-1 py-0.5 text-xs border rounded bg-white cursor-pointer"
                                  defaultValue=""
                                  onChange={(e) => {
                                    const selectedIndex = parseInt(e.target.value);
                                    const location = description.locations[selectedIndex];
                                    if (location) {
                                      setAdGroupName(location.adGroup);
                                      setAdType(location.adType);
                                      setCategoryName(location.category);
                                    }
                                  }}>
                                  <option
                                    value=""
                                    disabled>
                                    View locations...
                                  </option>
                                  {description.locations?.map((loc, i) => (
                                    <option
                                      key={i}
                                      value={i}>
                                      {loc.adGroup}/{loc.adType}/{loc.category}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Import Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleImportSelection}
                  disabled={selectedImportHeadlines.length === 0 && selectedImportDescriptions.length === 0}
                  className={`px-4 py-2 rounded-md text-sm mr-4 ${
                    selectedImportHeadlines.length === 0 && selectedImportDescriptions.length === 0
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-gray-700 hover:bg-gray-600 text-white"
                  }`}>
                  Import Selected
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientForm;
