"use client";
import React, { useEffect, useState, Suspense, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/authContext";
import ClientForm from "@/components/client/clientForm";
import { getDoc, collection, onSnapshot, serverTimestamp, setDoc, doc, getDocs, deleteDoc, updateDoc } from "firebase/firestore";
import {
  FaArrowLeft,
  FaPlus,
  FaTrash,
  FaChevronRight,
  FaChevronLeft,
  FaPen,
  FaChevronDown,
  FaArrowUp,
  FaRobot,
  FaSitemap,
  FaGear,
  FaCopy,
} from "react-icons/fa6";
import { useSearchParams } from "next/navigation";
import { db } from "@/firebase/firebase";
import Modal from "@/components/ModalClean";
import Button from "@/components/buttons";
import ImportClientCSV from "@/components/client/ImportClientCSV";
import ImportGoogleAdsButton from "@/components/client/ImportGoogleAdsButton";
import ExportToGoogleAdsButton from "@/components/client/ExportToGoogleAdsButton";
import ModalConfirm from "@/components/modalConfirm";
import NewClientModal from "@/components/NewClientModal";
import ProtectedRoute from "@/components/ProtectedRoute";

async function migrateToGenericAdGroup(currentUser) {
  if (!currentUser) return;

  try {
    // Get all clients
    const clientsRef = collection(db, "clients", currentUser.uid, "client");
    const clientsSnapshot = await getDocs(clientsRef);

    for (const clientDoc of clientsSnapshot.docs) {
      const clientName = clientDoc.id;

      // Create Generic ad group if it doesn't exist
      const genericAdGroupRef = doc(db, "clients", currentUser.uid, "client", clientName, "adGroups", "Generic");
      const genericAdGroupDoc = await getDoc(genericAdGroupRef);

      if (!genericAdGroupDoc.exists()) {
        await setDoc(genericAdGroupRef, {
          adGroupName: "Generic",
          timestamp: serverTimestamp(),
        });
      }

      // Create Generic category to store all headlines/descriptions
      const genericCategoryRef = doc(genericAdGroupRef, "categories", "All");

      // Get all ad groups for this client
      const adGroupsRef = collection(db, "clients", currentUser.uid, "client", clientName, "adGroups");
      const adGroupsSnapshot = await getDocs(adGroupsRef);

      let allHeadlines = [];
      let allDescriptions = [];

      // Collect all headlines and descriptions from all ad groups and categories
      for (const adGroupDoc of adGroupsSnapshot.docs) {
        if (adGroupDoc.id === "Generic") continue; // Skip Generic ad group

        const categoriesRef = collection(adGroupDoc.ref, "categories");
        const categoriesSnapshot = await getDocs(categoriesRef);

        for (const categoryDoc of categoriesSnapshot.docs) {
          const data = categoryDoc.data();

          if (data.headlineValues) {
            allHeadlines.push(
              ...data.headlineValues.map((h) => ({
                ...h,
                source: {
                  adGroup: adGroupDoc.id,
                  category: categoryDoc.id,
                },
                usageCount: 0,
              }))
            );
          }

          if (data.descriptionValues) {
            allDescriptions.push(
              ...data.descriptionValues.map((d) => ({
                ...d,
                source: {
                  adGroup: adGroupDoc.id,
                  category: categoryDoc.id,
                },
                usageCount: 0,
              }))
            );
          }
        }
      }

      // Remove duplicates while preserving metadata
      const uniqueHeadlines = Array.from(new Map(allHeadlines.map((h) => [h.text, h])).values());

      const uniqueDescriptions = Array.from(new Map(allDescriptions.map((d) => [d.text, d])).values());

      // Update Generic category with all unique headlines and descriptions
      await setDoc(genericCategoryRef, {
        headlineValues: uniqueHeadlines,
        descriptionValues: uniqueDescriptions,
        timestamp: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error("Error migrating to Generic ad group:", error);
  }
}

// Add this to track usage when headlines/descriptions are used
async function incrementUsageCount(currentUser, clientName, adGroup, category, type, text) {
  try {
    const genericRef = doc(db, "clients", currentUser.uid, "client", clientName, "adGroups", "Generic", "categories", "All");

    const genericDoc = await getDoc(genericRef);
    if (genericDoc.exists()) {
      const data = genericDoc.data();
      const field = type === "headline" ? "headlineValues" : "descriptionValues";
      const items = data[field];

      const updatedItems = items.map((item) => {
        if (item.text === text) {
          return {
            ...item,
            usageCount: (item.usageCount || 0) + 1,
            lastUsed: serverTimestamp(),
          };
        }
        return item;
      });

      await updateDoc(genericRef, {
        [field]: updatedItems,
      });
    }
  } catch (error) {
    console.error("Error incrementing usage count:", error);
  }
}

// Add rename functions
async function renameClient(currentUser, oldName, newName) {
  if (!currentUser || oldName === newName) return;

  try {
    const oldClientRef = doc(db, "clients", currentUser.uid, "client", oldName);
    const newClientRef = doc(db, "clients", currentUser.uid, "client", newName);

    // Check if source exists and target doesn't exist
    const oldClientDoc = await getDoc(oldClientRef);
    const newClientDoc = await getDoc(newClientRef);

    if (!oldClientDoc.exists()) {
      throw new Error("Source client does not exist");
    }

    // Get all ad groups from old client
    const oldAdGroupsRef = collection(oldClientRef, "adGroups");
    const oldAdGroupsSnapshot = await getDocs(oldAdGroupsRef);
    const adGroups = oldAdGroupsSnapshot.docs.map((doc) => ({
      id: doc.id,
      data: doc.data(),
    }));

    // For each ad group, get all ad types
    const adGroupsWithTypes = await Promise.all(
      adGroups.map(async (adGroup) => {
        const adTypesRef = collection(oldClientRef, "adGroups", adGroup.id, "adTypes");
        const adTypesSnapshot = await getDocs(adTypesRef);
        const adTypes = await Promise.all(
          adTypesSnapshot.docs.map(async (adTypeDoc) => {
            // Get categories for each ad type
            const categoriesRef = collection(oldClientRef, "adGroups", adGroup.id, "adTypes", adTypeDoc.id, "categories");
            const categoriesSnapshot = await getDocs(categoriesRef);
            const categories = categoriesSnapshot.docs.map((catDoc) => ({
              id: catDoc.id,
              data: catDoc.data(),
            }));

            return {
              id: adTypeDoc.id,
              data: adTypeDoc.data(),
              categories,
            };
          })
        );

        return {
          ...adGroup,
          adTypes,
        };
      })
    );

    if (newClientDoc.exists()) {
      // If target exists, merge the data
      for (const adGroup of adGroupsWithTypes) {
        const newAdGroupRef = doc(newClientRef, "adGroups", adGroup.id);
        await setDoc(newAdGroupRef, adGroup.data);

        // Copy/merge ad types and their categories
        for (const adType of adGroup.adTypes) {
          const newAdTypeRef = doc(newAdGroupRef, "adTypes", adType.id);
          await setDoc(newAdTypeRef, adType.data);

          // Copy categories
          for (const category of adType.categories) {
            const newCategoryRef = doc(newAdTypeRef, "categories", category.id);
            await setDoc(newCategoryRef, category.data);
          }
        }
      }
    } else {
      // If target doesn't exist, create new client with old data
      await setDoc(newClientRef, oldClientDoc.data());

      // Copy all ad groups and their nested collections
      for (const adGroup of adGroupsWithTypes) {
        const newAdGroupRef = doc(newClientRef, "adGroups", adGroup.id);
        await setDoc(newAdGroupRef, adGroup.data);

        // Copy ad types
        for (const adType of adGroup.adTypes) {
          const newAdTypeRef = doc(newAdGroupRef, "adTypes", adType.id);
          await setDoc(newAdTypeRef, adType.data);

          // Copy categories
          for (const category of adType.categories) {
            const newCategoryRef = doc(newAdTypeRef, "categories", category.id);
            await setDoc(newCategoryRef, category.data);
          }
        }
      }
    }

    // Delete old client and all its subcollections
    for (const adGroup of adGroupsWithTypes) {
      for (const adType of adGroup.adTypes) {
        for (const category of adType.categories) {
          const oldCategoryRef = doc(oldClientRef, "adGroups", adGroup.id, "adTypes", adType.id, "categories", category.id);
          await deleteDoc(oldCategoryRef);
        }
        const oldAdTypeRef = doc(oldClientRef, "adGroups", adGroup.id, "adTypes", adType.id);
        await deleteDoc(oldAdTypeRef);
      }
      const oldAdGroupRef = doc(oldClientRef, "adGroups", adGroup.id);
      await deleteDoc(oldAdGroupRef);
    }
    await deleteDoc(oldClientRef);
  } catch (error) {
    console.error("Error renaming client:", error);
    throw error;
  }
}

async function renameAdGroup(currentUser, clientName, oldName, newName) {
  if (!currentUser || oldName === newName) return;

  try {
    const clientRef = doc(db, "clients", currentUser.uid, "client", clientName);
    const oldAdGroupRef = doc(clientRef, "adGroups", oldName);
    const newAdGroupRef = doc(clientRef, "adGroups", newName);

    // Check if source exists
    const oldAdGroupDoc = await getDoc(oldAdGroupRef);
    if (!oldAdGroupDoc.exists()) {
      throw new Error("Source ad group does not exist");
    }

    // Get all ad types from old ad group
    const oldAdTypesRef = collection(oldAdGroupRef, "adTypes");
    const oldAdTypesSnapshot = await getDocs(oldAdTypesRef);
    const adTypes = await Promise.all(
      oldAdTypesSnapshot.docs.map(async (adTypeDoc) => {
        // Get categories for each ad type
        const categoriesRef = collection(oldAdGroupRef, "adTypes", adTypeDoc.id, "categories");
        const categoriesSnapshot = await getDocs(categoriesRef);
        const categories = categoriesSnapshot.docs.map((catDoc) => ({
          id: catDoc.id,
          data: catDoc.data(),
        }));

        return {
          id: adTypeDoc.id,
          data: adTypeDoc.data(),
          categories,
        };
      })
    );

    // Create new ad group with old data
    await setDoc(newAdGroupRef, {
      ...oldAdGroupDoc.data(),
      adGroupName: newName,
      timestamp: serverTimestamp(),
    });

    // Copy all ad types and their categories
    for (const adType of adTypes) {
      const newAdTypeRef = doc(newAdGroupRef, "adTypes", adType.id);
      await setDoc(newAdTypeRef, adType.data);

      // Copy categories
      for (const category of adType.categories) {
        const newCategoryRef = doc(newAdTypeRef, "categories", category.id);
        await setDoc(newCategoryRef, category.data);
      }
    }

    // Delete old ad types, categories, and ad group
    for (const adType of adTypes) {
      for (const category of adType.categories) {
        const oldCategoryRef = doc(oldAdGroupRef, "adTypes", adType.id, "categories", category.id);
        await deleteDoc(oldCategoryRef);
      }
      const oldAdTypeRef = doc(oldAdGroupRef, "adTypes", adType.id);
      await deleteDoc(oldAdTypeRef);
    }
    await deleteDoc(oldAdGroupRef);
  } catch (error) {
    console.error("Error renaming ad group:", error);
    throw error;
  }
}

async function renameAdType(currentUser, clientName, adGroupName, oldName, newName) {
  if (!currentUser || oldName === newName) return;

  try {
    // Construct the path step by step to ensure correct nesting
    const basePath = `clients/${currentUser.uid}/client/${clientName}`;
    const adGroupPath = `${basePath}/adGroups/${adGroupName}`;

    // Get references
    const adGroupRef = doc(db, basePath, "adGroups", adGroupName);
    const oldAdTypeRef = doc(adGroupRef, "adTypes", oldName);
    const newAdTypeRef = doc(adGroupRef, "adTypes", newName);

    // First verify the ad group exists
    const adGroupDoc = await getDoc(adGroupRef);
    if (!adGroupDoc.exists()) {
      throw new Error("Ad group does not exist");
    }

    // Then check if source ad type exists
    const oldAdTypeDoc = await getDoc(oldAdTypeRef);
    if (!oldAdTypeDoc.exists()) {
      throw new Error("Source ad type does not exist");
    }

    // Get all categories from old ad type
    const categoriesRef = collection(oldAdTypeRef, "categories");
    const categoriesSnapshot = await getDocs(categoriesRef);
    const categories = categoriesSnapshot.docs.map((doc) => ({
      id: doc.id,
      data: doc.data(),
    }));

    // Create new ad type with old data
    await setDoc(newAdTypeRef, {
      ...oldAdTypeDoc.data(),
      adTypeName: newName,
      name: newName,
      id: newName,
      timestamp: serverTimestamp(),
    });

    // Copy all categories
    for (const category of categories) {
      const newCategoryRef = doc(newAdTypeRef, "categories", category.id);
      await setDoc(newCategoryRef, {
        ...category.data,
        timestamp: serverTimestamp(),
      });
    }

    // Delete old categories and ad type
    for (const category of categories) {
      const oldCategoryRef = doc(oldAdTypeRef, "categories", category.id);
      await deleteDoc(oldCategoryRef);
    }
    await deleteDoc(oldAdTypeRef);

    // Return the new name to allow the caller to update the UI
    return newName;
  } catch (error) {
    console.error("Error renaming ad type:", error);
    throw error;
  }
}

async function renameCategory(currentUser, clientName, adGroupName, adTypeName, oldName, newName) {
  if (!currentUser || oldName === newName) return;

  try {
    const adTypeRef = doc(db, "clients", currentUser.uid, "client", clientName, "adGroups", adGroupName, "adTypes", adTypeName);
    const oldCategoryRef = doc(adTypeRef, "categories", oldName);
    const newCategoryRef = doc(adTypeRef, "categories", newName);

    const oldCategoryDoc = await getDoc(oldCategoryRef);
    if (!oldCategoryDoc.exists()) {
      throw new Error("Source category does not exist");
    }

    // Create new category with old data
    await setDoc(newCategoryRef, {
      ...oldCategoryDoc.data(),
      categoryName: newName,
      name: newName,
      id: newName,
      timestamp: serverTimestamp(),
    });

    // Delete old category
    await deleteDoc(oldCategoryRef);

    // Return the new name to allow the caller to update the UI
    return newName;
  } catch (error) {
    console.error("Error renaming category:", error);
    throw error;
  }
}

// Helper functions for merging and copying
async function mergeAdGroup(sourceRef, targetRef) {
  const adTypesRef = collection(sourceRef, "adTypes");
  const adTypesSnapshot = await getDocs(adTypesRef);

  for (const adTypeDoc of adTypesSnapshot.docs) {
    const targetAdTypeRef = doc(targetRef, "adTypes", adTypeDoc.id);
    const targetAdTypeDoc = await getDoc(targetAdTypeRef);

    if (targetAdTypeDoc.exists()) {
      await mergeAdType(adTypeDoc.ref, targetAdTypeRef);
    } else {
      await copyCollection(adTypeDoc.ref, targetAdTypeRef);
    }
  }

  await deleteDoc(sourceRef);
}

async function mergeAdType(sourceRef, targetRef) {
  const categoriesRef = collection(sourceRef, "categories");
  const categoriesSnapshot = await getDocs(categoriesRef);

  for (const categoryDoc of categoriesSnapshot.docs) {
    const targetCategoryRef = doc(targetRef, "categories", categoryDoc.id);
    const targetCategoryDoc = await getDoc(targetCategoryRef);

    if (targetCategoryDoc.exists()) {
      // Merge category data
      const sourceData = categoryDoc.data();
      const targetData = targetCategoryDoc.data();

      const mergedData = {
        headlineValues: [...(targetData.headlineValues || []), ...(sourceData.headlineValues || [])],
        descriptionValues: [...(targetData.descriptionValues || []), ...(sourceData.descriptionValues || [])],
        timestamp: serverTimestamp(),
      };

      await setDoc(targetCategoryRef, mergedData);
    } else {
      await setDoc(targetCategoryRef, categoryDoc.data());
    }
  }

  await deleteDoc(sourceRef);
}

async function copyCollection(sourceRef, targetRef) {
  const snapshot = await getDocs(collection(sourceRef, "categories"));

  for (const doc of snapshot.docs) {
    await setDoc(doc(targetRef, "categories", doc.id), doc.data());
  }
}

// Add this migration function at the top level
async function migrateAllClientsToNewStructure(currentUser) {
  if (!currentUser) return;

  try {
    // Get all clients
    const clientsRef = collection(db, "clients", currentUser.uid, "client");
    const clientsSnapshot = await getDocs(clientsRef);

    for (const clientDoc of clientsSnapshot.docs) {
      const clientName = clientDoc.id;
      console.log("Processing client:", clientName);

      // Step 1: Create Generic ad group
      const genericAdGroupRef = doc(db, "clients", currentUser.uid, "client", clientName, "adGroups", "Generic");

      // Create Generic ad group
      await setDoc(
        genericAdGroupRef,
        {
          adGroupName: "Generic",
          timestamp: serverTimestamp(),
        },
        { merge: true }
      );

      // Step 2: Create Generic ad type
      const genericAdTypeRef = doc(genericAdGroupRef, "adTypes", "Generic");
      await setDoc(
        genericAdTypeRef,
        {
          name: "Generic",
          timestamp: serverTimestamp(),
        },
        { merge: true }
      );

      // Step 3: Find and move categories from old structure
      const oldCategoriesRef = collection(db, "clients", currentUser.uid, "client", clientName, "categoryName");
      const oldCategoriesSnapshot = await getDocs(oldCategoriesRef);

      // Move each category to new structure
      for (const categoryDoc of oldCategoriesSnapshot.docs) {
        try {
          const categoryName = categoryDoc.id;
          const categoryData = categoryDoc.data();

          // Create new category under Generic ad type
          const newCategoryRef = doc(genericAdTypeRef, "categories", categoryName);

          // Move the category data
          await setDoc(newCategoryRef, {
            categoryName: categoryName,
            headlineValues: categoryData.headlineValues || [],
            descriptionValues: categoryData.descriptionValues || [],
            pathValues: categoryData.pathValues || [],
            finalUrlValues: categoryData.finalUrlValues || [],
            labelsValues: categoryData.labelsValues || [],
            adGroupStatus: categoryData.adGroupStatus || "enabled",
            timestamp: serverTimestamp(),
          });

          // Delete the old category
          await deleteDoc(categoryDoc.ref);
        } catch (error) {
          console.error(`Error moving category ${categoryDoc.id}:`, error);
        }
      }
    }

    alert("All clients have been migrated to the new structure!");
    window.location.reload();
  } catch (error) {
    console.error("Migration error:", error);
    alert("Error during migration. Check console for details.");
  }
}

// Add the StatusDot component
const StatusDot = ({ status }) => (
  <div className="relative inline-block">
    <div
      className={`w-2 h-2 rounded-full ${
        status?.toLowerCase() === "active" || status?.toLowerCase() === "enabled" ? "bg-green-500" : "bg-gray-400"
      }`}
    />
  </div>
);

// Add this new component before the ClientPage component
const ClientDropdown = ({ clients, selectedClient, onClientChange, onDeleteClient }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredClients = clients.filter((client) => decodeURIComponent(client.name).toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="relative mb-4">
      <div
        className="flex items-center justify-between w-full p-1 bg-white border rounded-lg cursor-pointer hover:bg-gray-50"
        onClick={() => setIsOpen(!isOpen)}>
        <span>{selectedClient ? decodeURIComponent(selectedClient.name) : "Select a client"}</span>
        <span className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>▼</span>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg">
          <input
            type="text"
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 border-b"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="max-h-60 overflow-y-auto">
            {filteredClients.map((client) => (
              <div
                key={client.id}
                className="p-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => {
                  onClientChange(client);
                  setIsOpen(false);
                  setSearchTerm("");
                }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusDot status={client.clientStatus} />
                    <span>{decodeURIComponent(client.name)}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteClient(client);
                    }}
                    className="text-red-500 hover:text-red-700">
                    <FaTrash size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default function ClientPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser } = useAuth();
  const [showSidebar, setShowSidebar] = useState(true);
  const [clients, setClients] = useState([]);
  const [expandedClients, setExpandedClients] = useState({});
  const [expandedAdGroups, setExpandedAdGroups] = useState({});
  const [expandedAdTypes, setExpandedAdTypes] = useState({});
  const [loading, setLoading] = useState(true);
  const [adTypes, setAdTypes] = useState({});

  // Form states
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedAdGroup, setSelectedAdGroup] = useState(null);
  const [selectedAdType, setSelectedAdType] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryName, setCategoryName] = useState("");
  const [categories, setCategories] = useState([]);

  // Add state for tree structure
  const [treeState, setTreeState] = useState({});

  // Add this function near the top with other state declarations
  const saveTreeState = useCallback(() => {
    const state = {
      expandedClients,
      expandedAdGroups,
      expandedAdTypes,
      selectedClient: selectedClient?.id,
      selectedAdGroup: selectedAdGroup?.id,
      selectedAdType: selectedAdType?.id,
      selectedCategory: selectedCategory?.id,
    };
    localStorage.setItem("treeState", JSON.stringify(state));
    setTreeState(state);
  }, [expandedClients, expandedAdGroups, expandedAdTypes, selectedClient, selectedAdGroup, selectedAdType, selectedCategory]);

  // Function to restore tree state
  const restoreTreeState = useCallback((clients) => {
    try {
      const savedState = localStorage.getItem("treeState");
      if (savedState) {
        const state = JSON.parse(savedState);
        setExpandedClients(state.expandedClients || {});
        setExpandedAdGroups(state.expandedAdGroups || {});
        setExpandedAdTypes(state.expandedAdTypes || {});

        if (state.selectedClient) {
          const client = clients.find((c) => c.id === state.selectedClient);
          if (client) {
            setSelectedClient(client);

            if (state.selectedAdGroup) {
              const adGroup = client.adGroups.find((g) => g.id === state.selectedAdGroup);
              if (adGroup) {
                setSelectedAdGroup(adGroup);

                if (state.selectedAdType) {
                  const adType = adGroup.adTypes.find((t) => t.id === state.selectedAdType);
                  if (adType) {
                    setSelectedAdType(adType);

                    if (state.selectedCategory) {
                      const category = adType.categories.find((c) => c.id === state.selectedCategory);
                      if (category) {
                        setSelectedCategory(category);
                        setCategoryName(category.categoryName);
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error restoring tree state:", error);
    }
  }, []);

  // Effect to restore tree state when clients change
  useEffect(() => {
    if (clients.length > 0) {
      restoreTreeState(clients);
    }
  }, [clients, restoreTreeState]);

  // Effect to save tree state when structure changes
  useEffect(() => {
    saveTreeState();
  }, [expandedClients, expandedAdGroups, expandedAdTypes, selectedClient, selectedAdGroup, selectedAdType, selectedCategory, saveTreeState]);

  // Initialize form values
  const createInitialValues = () => ({
    initialHeadlines: [
      ...Array(15)
        .fill("")
        .map((_, index) => ({
          id: `headline-id-${index}`,
          text: "",
          pin: "",
          isExtra: false,
        })),
      ...Array(10)
        .fill("")
        .map((_, index) => ({
          id: `extra-headline-id-${index}`,
          text: "",
          pin: "",
          isExtra: true,
        })),
    ],
    initialDescriptions: [
      ...Array(4)
        .fill("")
        .map((_, index) => ({
          id: `description-id-${index}`,
          text: "",
          pin: "",
          isExtra: false,
        })),
      ...Array(6)
        .fill("")
        .map((_, index) => ({
          id: `extra-description-id-${index}`,
          text: "",
          pin: "",
          isExtra: true,
        })),
    ],
  });

  const { initialHeadlines, initialDescriptions } = createInitialValues();
  const [headlineValues, setHeadlineValues] = useState(initialHeadlines);
  const [descriptionValues, setDescriptionValues] = useState(initialDescriptions);
  const [pathValues, setPathValues] = useState([
    { id: "path-id-0", text: "" },
    { id: "path-id-1", text: "" },
  ]);
  const [finalUrlValues, setFinalUrlValues] = useState([{ id: "final-url-id-0", text: "" }]);
  const [labelsValues, setLabelsValues] = useState([{ id: "label-id-0", text: "" }]);
  const [selectedHeadlines, setSelectedHeadlines] = useState([]);
  const [selectedDescriptions, setSelectedDescriptions] = useState([]);

  // Add these new states for renaming
  const [renameType, setRenameType] = useState(null);
  const [renameOldName, setRenameOldName] = useState("");
  const [renameNewName, setRenameNewName] = useState("");
  const [renameContext, setRenameContext] = useState({});
  const [renameModalOpen, setRenameModalOpen] = useState(false);

  // Add these state variables
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteType, setDeleteType] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Add this to the existing state declarations at the top of the ClientPage component
  const [searchQuery, setSearchQuery] = useState("");

  // Add this near the top where other state variables are defined
  const [statusFilter, setStatusFilter] = useState(() => {
    if (typeof window !== "undefined") {
      const savedFilter = localStorage.getItem("statusFilter");
      return savedFilter || "all";
    }
    return "all";
  });
  const [statusLevelFilter, setStatusLevelFilter] = useState(() => {
    if (typeof window !== "undefined") {
      const savedLevelFilter = localStorage.getItem("statusLevelFilter");
      return savedLevelFilter || "all";
    }
    return "all";
  });

  // Add this near other state declarations
  const [showOnlyWithAds, setShowOnlyWithAds] = useState(false);

  // Add new campaign-related state
  const [campaignDailyBudget, setCampaignDailyBudget] = useState("");
  const [campaignType, setCampaignType] = useState("Search");
  const [networks, setNetworks] = useState(["Google search", "Search Partners"]);
  const [languages, setLanguages] = useState(["en", "sv"]);
  const [maxCpc, setMaxCpc] = useState("");
  const [enhancedCpc, setEnhancedCpc] = useState(false);
  const [adRotation, setAdRotation] = useState("Rotate indefinit");
  const [location, setLocation] = useState("Sverige");
  const [campaignId, setCampaignId] = useState("");
  const [website, setWebsite] = useState("");
  const [bidStrategyType, setBidStrategyType] = useState("Manual CPC");

  // Add this near other state declarations
  const [sortOrder, setSortOrder] = useState("asc");

  // Add these new state variables near the top with other state declarations
  const [latestCreatedAd, setLatestCreatedAd] = useState(null);

  // Add state for tracking unsaved changes near other state declarations
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Add navigation handling
  const handleBeforeNavigate = useCallback((href) => {
    if (hasUnsavedChanges && selectedCategory) {
      const confirmed = window.confirm("You have unsaved changes. Are you sure you want to leave?");
      if (confirmed) {
        router.push(href);
      }
      return !confirmed;
    }
    return false;
  }, [hasUnsavedChanges, selectedCategory, router]);

  // Add beforeunload handler
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges && selectedCategory) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges, selectedCategory]);

  // Add navigation interceptor
  useEffect(() => {
    const handleClick = (e) => {
      if (e.target.tagName === "A" && e.target.href) {
        const href = e.target.getAttribute("href");
        if (href && href !== pathname) {
          if (handleBeforeNavigate(href)) {
            e.preventDefault();
          }
        }
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [handleBeforeNavigate, pathname]);

  // Function to handle programmatic navigation
  const handleNavigation = (href) => {
    if (!handleBeforeNavigate(href)) {
      router.push(href);
    }
  };

  // Move refreshAdTypes inside the component
  const refreshAdTypes = useCallback(async (clientName, adGroupName) => {
    try {
      if (!currentUser) return;

      const adTypesRef = collection(db, "clients", currentUser.uid, "client", clientName, "adGroups", adGroupName, "adTypes");
      const data = await getDocs(adTypesRef);
      const adTypeData = data.docs.map((doc) => ({
        id: doc.id,
        name: doc.id,
        ...doc.data(),
      }));
      setAdTypes((prev) => ({
        ...prev,
        [adGroupName]: adTypeData,
      }));
    } catch (err) {
      console.error("Error refreshing ad types:", err);
    }
  }, [currentUser]);

  // Move fetchData outside useEffect
  const fetchData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const clientsRef = collection(db, "clients", currentUser.uid, "client");

      // First get initial snapshot
      const clientsSnapshot = await getDocs(clientsRef);

      // Set up real-time listener
      const unsubscribe = onSnapshot(clientsRef, async (snapshot) => {
        try {
          const clientsData = await Promise.all(
            snapshot.docs.map(async (clientDoc) => {
              const clientData = clientDoc.data();
              const adGroupsRef = collection(clientDoc.ref, "adGroups");
              const adGroupsSnapshot = await getDocs(adGroupsRef);

              const adGroups = await Promise.all(
                adGroupsSnapshot.docs.map(async (adGroupDoc) => {
                  const adGroupData = adGroupDoc.data();
                  const adTypesRef = collection(adGroupDoc.ref, "adTypes");
                  const adTypesSnapshot = await getDocs(adTypesRef);

                  const adTypes = await Promise.all(
                    adTypesSnapshot.docs.map(async (adTypeDoc) => {
                      const adTypeData = adTypeDoc.data();
                      const categoriesRef = collection(adTypeDoc.ref, "categories");
                      const categoriesSnapshot = await getDocs(categoriesRef);

                      return {
                        id: adTypeDoc.id,
                        name: adTypeData.name || adTypeDoc.id,
                        adGroupStatus: adTypeData.adGroupStatus || "enabled",
                        categories: categoriesSnapshot.docs.map((categoryDoc) => {
                          const categoryData = categoryDoc.data();
                          return {
                            id: categoryDoc.id,
                            categoryName: categoryData.categoryName || categoryDoc.id,
                            adStatus: categoryData.adStatus || "enabled",
                            headlineValues: categoryData.headlineValues || [],
                            descriptionValues: categoryData.descriptionValues || [],
                            pathValues: categoryData.pathValues || [],
                            finalUrlValues: categoryData.finalUrlValues || [],
                            labelsValues: categoryData.labelsValues || [],
                          };
                        }),
                      };
                    })
                  );

                  return {
                    id: adGroupDoc.id,
                    name: adGroupData.adGroupName || adGroupDoc.id,
                    campaignStatus: adGroupData.campaignStatus || "enabled",
                    adTypes,
                  };
                })
              );

              return {
                id: clientDoc.id,
                name: clientDoc.id,
                clientStatus: clientData.clientStatus || "enabled",
                adGroups,
              };
            })
          );

          setClients(clientsData);

          // Update selected items if they exist in the new data
          if (selectedClient) {
            const updatedClient = clientsData.find((c) => c.id === selectedClient.id);
            if (updatedClient) {
              setSelectedClient(updatedClient);

              if (selectedAdGroup) {
                const updatedAdGroup = updatedClient.adGroups.find((g) => g.id === selectedAdGroup.id);
                if (updatedAdGroup) {
                  setSelectedAdGroup(updatedAdGroup);

                  if (selectedAdType) {
                    const updatedAdType = updatedAdGroup.adTypes.find((t) => t.id === selectedAdType.id);
                    if (updatedAdType) {
                      setSelectedAdType(updatedAdType);

                      if (selectedCategory) {
                        const updatedCategory = updatedAdType.categories.find((c) => c.id === selectedCategory.id);
                        if (updatedCategory) {
                          setSelectedCategory(updatedCategory);
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error("Error processing snapshot:", error);
        } finally {
          setLoading(false);
        }
      });

      // Return cleanup function
      return unsubscribe;
    } catch (error) {
      console.error("Error setting up data listener:", error);
      setLoading(false);
    }
  }, [currentUser, selectedClient, selectedAdGroup, selectedAdType, selectedCategory]);

  // Update useEffect to handle cleanup
  useEffect(() => {
    let unsubscribe;
    const setupListener = async () => {
      unsubscribe = await fetchData();
    };
    setupListener();

    return () => {
      if (unsubscribe && typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [currentUser, fetchData]);

  // Add useEffect to fetch categories when an ad type is selected
  useEffect(() => {
    const fetchCategories = async () => {
      if (!currentUser || !selectedClient?.id || !selectedAdGroup?.id || !selectedAdType?.id) {
        setCategories([]);
        return;
      }

      try {
        const categoriesRef = collection(
          db,
          "clients",
          currentUser.uid,
          "client",
          selectedClient.id,
          "adGroups",
          selectedAdGroup.id,
          "adTypes",
          selectedAdType.id,
          "categories"
        );

        const snapshot = await getDocs(categoriesRef);
        const categoryList = snapshot.docs.map((doc) => doc.id);
        setCategories(categoryList);
      } catch (error) {
        console.error("Error fetching categories:", error);
        setCategories([]);
      }
    };

    fetchCategories();
  }, [currentUser, selectedClient, selectedAdGroup, selectedAdType]);

  // Add this useEffect after the other useEffect hooks
  useEffect(() => {
    const fetchCategoryData = async () => {
      if (!currentUser || !selectedClient?.id || !selectedAdGroup?.id || !selectedAdType?.id) {
        return;
      }

      // If we're creating a new ad (selectedCategory is null and categoryName is empty)
      if (!selectedCategory && !categoryName) {
        setHeadlineValues(
          Array(25)
            .fill(null)
            .map((_, index) => ({
              id: `headline-id-${index}`,
              text: "",
              pin: "",
              isExtra: index >= 15,
            }))
        );
        setDescriptionValues(
          Array(10)
            .fill(null)
            .map((_, index) => ({
              id: `description-id-${index}`,
              text: "",
              pin: "",
              isExtra: index >= 4,
            }))
        );
        setPathValues([
          { id: "path-id-0", text: "" },
          { id: "path-id-1", text: "" },
        ]);
        setFinalUrlValues([{ id: "final-url-id-0", text: "" }]);
        setLabelsValues([{ id: "label-id-0", text: "" }]);
        return;
      }

      // If we're editing an existing category
      if (selectedCategory || categoryName) {
        try {
          const categoryRef = doc(
            db,
            "clients",
            currentUser.uid,
            "client",
            selectedClient.id,
            "adGroups",
            selectedAdGroup.id,
            "adTypes",
            selectedAdType.id,
            "categories",
            selectedCategory?.categoryName || categoryName
          );

          const categoryDoc = await getDoc(categoryRef);
          if (!categoryDoc.exists()) {
            return;
          }

          const data = categoryDoc.data();

          // Create complete headlines array (15 regular + 10 extra = 25 total)
          const headlines = Array(25)
            .fill(null)
            .map((_, index) => {
              const existingHeadline = data.headlineValues?.[index];
              return {
                id: `headline-id-${index}`,
                text: existingHeadline ? (typeof existingHeadline === "string" ? existingHeadline : existingHeadline.text || "") : "",
                pin: existingHeadline && typeof existingHeadline !== "string" ? existingHeadline.pin || "" : "",
                isExtra: index >= 15,
              };
            });
          setHeadlineValues(headlines);

          // Create complete descriptions array (4 regular + 6 extra = 10 total)
          const descriptions = Array(10)
            .fill(null)
            .map((_, index) => {
              const existingDescription = data.descriptionValues?.[index];
              return {
                id: `description-id-${index}`,
                text: existingDescription
                  ? typeof existingDescription === "string"
                    ? existingDescription
                    : existingDescription.text || ""
                  : "",
                pin: existingDescription && typeof existingDescription !== "string" ? existingDescription.pin || "" : "",
                isExtra: index >= 4,
              };
            });
          setDescriptionValues(descriptions);

          // Update path values (ensure at least one empty slot)
          const paths = (data.pathValues || [{ id: "path-id-0", text: "" }]).map((p, index) => ({
            id: `path-id-${index}`,
            text: typeof p === "string" ? p : p.text || "",
          }));
          setPathValues(paths);

          // Update final URL values (ensure at least one empty slot)
          const finalUrls = (data.finalUrlValues || [{ id: "final-url-id-0", text: "" }]).map((f, index) => ({
            id: `final-url-id-${index}`,
            text: typeof f === "string" ? f : f.text || "",
          }));
          setFinalUrlValues(finalUrls);

          // Update labels values (ensure at least one empty slot)
          const labels = (data.labelsValues || [{ id: "label-id-0", text: "" }]).map((l, index) => ({
            id: `label-id-${index}`,
            text: typeof l === "string" ? l : l.text || "",
          }));
          setLabelsValues(labels);
        } catch (error) {
          console.error("Error fetching category data:", error);
        }
      }
    };

    fetchCategoryData();
  }, [currentUser, selectedClient, selectedAdGroup, selectedAdType, selectedCategory, categoryName]);

  // Add useEffect for auth check
  useEffect(() => {
    if (!currentUser) {
      router.push("/");
    }
  }, [currentUser, router]);

  const toggleExpand = (type, id) => {
    switch (type) {
      case "client":
        setExpandedClients((prev) => ({ ...prev, [id]: !prev[id] }));
        break;
      case "adGroup":
        setExpandedAdGroups((prev) => ({ ...prev, [id]: !prev[id] }));
        break;
      case "adType":
        setExpandedAdTypes((prev) => ({ ...prev, [id]: !prev[id] }));
        break;
    }
  };

  const handleCreateCollection = async (e) => {
    e.preventDefault();
    if (!currentUser || !selectedClient?.name || !selectedAdGroup?.name || !selectedAdType?.name || !categoryName) {
      console.error("Missing required fields");
      alert("Please fill in all required fields (Client, Ad Group, Ad Type, and Category Name)");
      return;
    }

    try {
      // Save current expansion state
      const currentState = {
        expandedClients: { ...expandedClients },
        expandedAdGroups: { ...expandedAdGroups },
        expandedAdTypes: { ...expandedAdTypes },
      };

      // Create/update client document
      const clientRef = doc(db, "clients", currentUser.uid, "client", selectedClient.name);
      await setDoc(
        clientRef,
        {
          name: selectedClient.name,
          id: selectedClient.name,
          clientName: selectedClient.name,
          timestamp: serverTimestamp(),
        },
        { merge: true }
      );

      // Create/update ad group document
      const adGroupRef = doc(clientRef, "adGroups", selectedAdGroup.name);
      await setDoc(
        adGroupRef,
        {
          name: selectedAdGroup.name,
          id: selectedAdGroup.name,
          adGroupName: selectedAdGroup.name,
          timestamp: serverTimestamp(),
        },
        { merge: true }
      );

      // Create/update ad type document
      const adTypeRef = doc(adGroupRef, "adTypes", selectedAdType.name);
      await setDoc(
        adTypeRef,
        {
          name: selectedAdType.name,
          id: selectedAdType.name,
          timestamp: serverTimestamp(),
        },
        { merge: true }
      );

      // Create/update category document
      const categoryRef = doc(adTypeRef, "categories", categoryName);
      await setDoc(categoryRef, {
        categoryName: categoryName,
        id: categoryName,
        name: categoryName,
        adGroupStatus: "enabled",
        headlineValues: headlineValues.map((h) => ({
          ...h,
          text: h.text || "",
        })),
        descriptionValues: descriptionValues.map((d) => ({
          ...d,
          text: d.text || "",
        })),
        pathValues:
          pathValues?.map((p) => ({
            ...p,
            text: p.text || "",
          })) || [],
        finalUrlValues: finalUrlValues?.map((f) => ({
          ...f,
          text: f.text || "",
        })) || [{ id: "final-url-id-0", text: "" }],
        labelsValues: labelsValues?.map((l) => ({
          ...l,
          text: l.text || "",
        })) || [{ id: "label-id-0", text: "" }],
        timestamp: serverTimestamp(),
      });

      // Store the latest created ad info
      const latestAdInfo = {
        clientName: selectedClient.name,
        adGroupName: selectedAdGroup.name,
        adTypeName: selectedAdType.name,
        categoryName: categoryName,
      };
      localStorage.setItem("latestCreatedAd", JSON.stringify(latestAdInfo));

      // Reset form values
      const { initialHeadlines, initialDescriptions } = createInitialValues();
      setHeadlineValues(initialHeadlines);
      setDescriptionValues(initialDescriptions);
      setPathValues([
        { id: "path-id-0", text: "" },
        { id: "path-id-1", text: "" },
      ]);
      setFinalUrlValues([{ id: "final-url-id-0", text: "" }]);
      setLabelsValues([{ id: "label-id-0", text: "" }]);
      setCategoryName("");

      // Restore expansion state after fetching new data
      setExpandedClients(currentState.expandedClients);
      setExpandedAdGroups(currentState.expandedAdGroups);
      setExpandedAdTypes(currentState.expandedAdTypes);

      // Show success message
      alert("Saved successfully!");
    } catch (error) {
      console.error("Error saving data:", error);
      alert("Error saving data: " + error.message);
    }
  };

  const setClientName = useCallback(async (value) => {
    if (!handleBeforeNavigate(`/client/${value}`)) {
      return;
    }

    const client = clients.find((c) => c.name === value);
    if (client) {
      try {
        setSelectedClient(client);
        setSelectedAdGroup(null);
        setSelectedAdType(null);
        setSelectedCategory(null);
        setHasUnsavedChanges(false);
        localStorage.setItem("selectedClient", JSON.stringify({ id: client.id, name: client.name }));

        const clientRef = doc(db, "clients", currentUser.uid, "client", client.name);
        const clientDoc = await getDoc(clientRef);

        if (clientDoc.exists()) {
          const clientData = clientDoc.data();
          const adGroupsRef = collection(clientRef, "adGroups");
          const adGroupsSnapshot = await getDocs(adGroupsRef);

          const adGroups = await Promise.all(
            adGroupsSnapshot.docs.map(async (adGroupDoc) => {
              const adGroupData = adGroupDoc.data();
              const adTypesRef = collection(adGroupDoc.ref, "adTypes");
              const adTypesSnapshot = await getDocs(adTypesRef);

              const adTypes = await Promise.all(
                adTypesSnapshot.docs.map(async (adTypeDoc) => {
                  const adTypeData = adTypeDoc.data();
                  const categoriesRef = collection(adTypeDoc.ref, "categories");
                  const categoriesSnapshot = await getDocs(categoriesRef);

                  return {
                    id: adTypeDoc.id,
                    name: adTypeData.name || adTypeDoc.id,
                    adGroupStatus: adTypeData.adGroupStatus || "enabled",
                    categories: categoriesSnapshot.docs.map((categoryDoc) => {
                      const categoryData = categoryDoc.data();
                      return {
                        id: categoryDoc.id,
                        categoryName: categoryData.categoryName || categoryDoc.id,
                        adStatus: categoryData.adStatus || "enabled",
                        headlineValues: categoryData.headlineValues || [],
                        descriptionValues: categoryData.descriptionValues || [],
                        pathValues: categoryData.pathValues || [],
                        finalUrlValues: categoryData.finalUrlValues || [],
                        labelsValues: categoryData.labelsValues || [],
                      };
                    }),
                  };
                })
              );

              return {
                id: adGroupDoc.id,
                name: adGroupData.adGroupName || adGroupDoc.id,
                campaignStatus: adGroupData.campaignStatus || "enabled",
                adTypes,
              };
            })
          );

          setClients((prevClients) => {
            return prevClients.map((c) => {
              if (c.name === client.name) {
                return {
                  ...c,
                  clientStatus: clientData.clientStatus || "enabled",
                  adGroups,
                };
              }
              return c;
            });
          });

          setExpandedClients((prev) => ({ ...prev, [client.name]: true }));
        }
      } catch (error) {
        console.error("Error refreshing client data:", error);
      }
    } else {
      setSelectedClient({
        id: value,
        name: value,
        adGroups: [],
      });
      setHasUnsavedChanges(false);
      localStorage.setItem("selectedClient", JSON.stringify({ id: value, name: value }));
    }
  }, [clients, handleBeforeNavigate, currentUser, setSelectedClient, setHasUnsavedChanges, setClients, setExpandedClients]);

  // Add useEffect to restore selected client on mount
  useEffect(() => {
    const savedClient = localStorage.getItem("selectedClient");
    if (savedClient && clients.length > 0) {
      const parsedClient = JSON.parse(savedClient);
      const client = clients.find((c) => c.id === parsedClient.id || c.name === parsedClient.name);
      if (client) {
        setSelectedClient(client);
        setClientName(client.name);
      }
    }
  }, [clients, setClientName]);

  // Add useEffect to save selected client when it changes
  useEffect(() => {
    if (selectedClient) {
      localStorage.setItem(
        "selectedClient",
        JSON.stringify({
          id: selectedClient.id,
          name: selectedClient.name,
        })
      );
    }
  }, [selectedClient]);

  const setAdGroupName = useCallback((value) => {
    if (!handleBeforeNavigate(`/client/${selectedClient?.name}/ad-group/${value}`)) {
      return;
    }

    const adGroup = selectedClient?.adGroups?.find((g) => g.name === value);
    if (adGroup) {
      setSelectedAdGroup(adGroup);
      setSelectedAdType(null);
      setSelectedCategory(null);
      setHasUnsavedChanges(false);
    } else if (selectedClient) {
      setSelectedAdGroup({
        id: value,
        name: value,
        adTypes: [],
      });
      setHasUnsavedChanges(false);
    }
  }, [handleBeforeNavigate, selectedClient, setSelectedAdGroup, setSelectedAdType, setSelectedCategory, setHasUnsavedChanges]);

  const setAdType = useCallback((value) => {
    if (!handleBeforeNavigate(`/client/${selectedClient?.name}/ad-type/${value}`)) {
      return;
    }

    const adType = selectedAdGroup?.adTypes?.find((t) => t.name === value);
    if (adType) {
      setSelectedAdType(adType);
      setSelectedCategory(null);
      setHasUnsavedChanges(false);
    } else if (selectedClient && selectedAdGroup) {
      setSelectedAdType({
        id: value,
        name: value,
        categories: [],
      });
      setHasUnsavedChanges(false);
    }
  }, [handleBeforeNavigate, selectedClient, selectedAdGroup, setSelectedAdType, setSelectedCategory, setHasUnsavedChanges]);

  // Add this new function near the top with other functions
  const reloadSidebar = useCallback(async () => {
    try {
      setLoading(true);
      saveTreeState();

      const clientsRef = collection(db, "clients", currentUser.uid, "client");
      const clientsSnapshot = await getDocs(clientsRef);

      const clientsData = await Promise.all(
        clientsSnapshot.docs.map(async (clientDoc) => {
          const clientData = clientDoc.data();
          const adGroupsRef = collection(clientDoc.ref, "adGroups");
          const adGroupsSnapshot = await getDocs(adGroupsRef);

          const adGroups = await Promise.all(
            adGroupsSnapshot.docs.map(async (adGroupDoc) => {
              const adGroupData = adGroupDoc.data();
              const adTypesRef = collection(adGroupDoc.ref, "adTypes");
              const adTypesSnapshot = await getDocs(adTypesRef);

              const adTypes = await Promise.all(
                adTypesSnapshot.docs.map(async (adTypeDoc) => {
                  const adTypeData = adTypeDoc.data();
                  const categoriesRef = collection(adTypeDoc.ref, "categories");
                  const categoriesSnapshot = await getDocs(categoriesRef);

                  return {
                    id: adTypeDoc.id,
                    name: adTypeData.name || adTypeDoc.id,
                    adGroupStatus: adTypeData.adGroupStatus || "enabled",
                    categories: categoriesSnapshot.docs.map((categoryDoc) => {
                      const categoryData = categoryDoc.data();
                      return {
                        id: categoryDoc.id,
                        ...categoryData,
                        adStatus: categoryData.adStatus,
                      };
                    }),
                  };
                })
              );

              return {
                id: adGroupDoc.id,
                name: adGroupData.adGroupName || adGroupDoc.id,
                campaignStatus: adGroupData.campaignStatus,
                adTypes,
              };
            })
          );

          return {
            id: clientDoc.id,
            name: clientDoc.id,
            clientStatus: clientData.clientStatus,
            adGroups,
          };
        })
      );

      setClients(clientsData);
      restoreTreeState(clientsData);
    } catch (error) {
      console.error("Error reloading sidebar:", error);
    } finally {
      setLoading(false);
    }
  }, [currentUser, saveTreeState, setLoading, setClients, restoreTreeState]);

  // Add useEffect to restore state on initial load
  useEffect(() => {
    if (clients.length > 0) {
      restoreTreeState(clients);
    }
  }, [clients, restoreTreeState]);

  const handleDelete = useCallback(async () => {
    if (!currentUser || !deleteTarget) return;

    setIsDeleting(true);
    try {
      // Save current expansion state
      const currentState = {
        expandedClients: { ...expandedClients },
        expandedAdGroups: { ...expandedAdGroups },
        expandedAdTypes: { ...expandedAdTypes },
      };

      switch (deleteType) {
        case "client":
          await deleteClient(deleteTarget.clientName);
          break;
        case "adGroup":
          await deleteAdGroup(deleteTarget.clientName, deleteTarget.adGroupName);
          break;
        case "adType":
          await deleteAdType(deleteTarget.clientName, deleteTarget.adGroupName, deleteTarget.adTypeName);
          break;
        case "category":
          await deleteCategory(deleteTarget.clientName, deleteTarget.adGroupName, deleteTarget.adTypeName, deleteTarget.categoryName);
          break;
      }

      // Clear selections if deleted item was selected
      if (deleteType === "client" && selectedClient?.name === deleteTarget.clientName) {
        setSelectedClient(null);
        setSelectedAdGroup(null);
        setSelectedAdType(null);
        setSelectedCategory(null);
        setCategoryName("");
      } else if (deleteType === "adGroup" && selectedAdGroup?.name === deleteTarget.adGroupName) {
        setSelectedAdGroup(null);
        setSelectedAdType(null);
        setSelectedCategory(null);
        setCategoryName("");
      } else if (deleteType === "adType" && selectedAdType?.name === deleteTarget.adTypeName) {
        setSelectedAdType(null);
        setSelectedCategory(null);
        setCategoryName("");
      } else if (deleteType === "category" && selectedCategory?.categoryName === deleteTarget.categoryName) {
        setSelectedCategory(null);
        setCategoryName("");
      }

      // Close modal immediately
      setShowDeleteModal(false);
      setDeleteTarget(null);

      // Restore expansion state and refresh data
      setExpandedClients(currentState.expandedClients);
      setExpandedAdGroups(currentState.expandedAdGroups);
      setExpandedAdTypes(currentState.expandedAdTypes);

      // Refresh the data
      await fetchData();
    } catch (error) {
      console.error("Error deleting:", error);
      alert("Error deleting item. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }, [currentUser, deleteTarget, deleteType, expandedClients, expandedAdGroups, expandedAdTypes, selectedClient, selectedAdGroup, selectedAdType, selectedCategory, setSelectedClient, setSelectedAdGroup, setSelectedAdType, setSelectedCategory, setCategoryName, setExpandedClients, setExpandedAdGroups, setExpandedAdTypes, setShowDeleteModal, setDeleteTarget, setIsDeleting, fetchData]);

  const deleteClient = async (clientName) => {
    try {
      console.log("Starting client deletion:", clientName);
      const clientRef = doc(db, "clients", currentUser.uid, "client", clientName);

      // Get all ad groups
      const adGroupsRef = collection(clientRef, "adGroups");
      const adGroupsSnapshot = await getDocs(adGroupsRef);

      // Delete all ad groups and their nested collections
      for (const adGroupDoc of adGroupsSnapshot.docs) {
        const adTypesRef = collection(adGroupDoc.ref, "adTypes");
        const adTypesSnapshot = await getDocs(adTypesRef);

        // Delete all ad types and their categories
        for (const adTypeDoc of adTypesSnapshot.docs) {
          const categoriesRef = collection(adTypeDoc.ref, "categories");
          const categoriesSnapshot = await getDocs(categoriesRef);

          // Delete all categories
          for (const categoryDoc of categoriesSnapshot.docs) {
            await deleteDoc(categoryDoc.ref);
          }
          await deleteDoc(adTypeDoc.ref);
        }
        await deleteDoc(adGroupDoc.ref);
      }

      // Delete the client document itself
      await deleteDoc(clientRef);

      // Also delete any related documents in the fields collection
      const fieldsRef = doc(db, "clients", currentUser.uid, "fields", clientName);
      const fieldsDoc = await getDoc(fieldsRef);
      if (fieldsDoc.exists()) {
        // Delete all campaigns in the fields collection
        const campaignsRef = collection(fieldsRef, "campaigns");
        const campaignsSnapshot = await getDocs(campaignsRef);
        for (const campaignDoc of campaignsSnapshot.docs) {
          await deleteDoc(campaignDoc.ref);
        }
        // Delete the fields document
        await deleteDoc(fieldsRef);
      }

      console.log("Client deletion completed:", clientName);
    } catch (error) {
      console.error("Error deleting client:", error);
      throw error;
    }
  };

  const deleteAdGroup = async (clientName, adGroupName) => {
    try {
      console.log("Starting ad group deletion:", { clientName, adGroupName });
      const adGroupRef = doc(db, "clients", currentUser.uid, "client", clientName, "adGroups", adGroupName);

      // Get and delete all ad types and their categories
      const adTypesRef = collection(adGroupRef, "adTypes");
      const adTypesSnapshot = await getDocs(adTypesRef);

      for (const adTypeDoc of adTypesSnapshot.docs) {
        const categoriesRef = collection(adTypeDoc.ref, "categories");
        const categoriesSnapshot = await getDocs(categoriesRef);

        // Delete all categories first
        for (const categoryDoc of categoriesSnapshot.docs) {
          await deleteDoc(categoryDoc.ref);
        }
        // Then delete the ad type
        await deleteDoc(adTypeDoc.ref);
      }

      // Finally delete the ad group itself
      await deleteDoc(adGroupRef);

      // Also update any related campaign documents
      const fieldsRef = doc(db, "clients", currentUser.uid, "fields", clientName);
      const campaignsRef = collection(fieldsRef, "campaigns");
      const campaignsSnapshot = await getDocs(campaignsRef);

      for (const campaignDoc of campaignsSnapshot.docs) {
        const campaignData = campaignDoc.data();
        if (campaignData.adGroupName === adGroupName) {
          await deleteDoc(campaignDoc.ref);
        }
      }

      console.log("Ad group deletion completed:", adGroupName);
    } catch (error) {
      console.error("Error deleting ad group:", error);
      throw error;
    }
  };

  // Add handleDeleteAdGroup function
  const handleDeleteAdGroup = async (clientId, adGroupId) => {
    try {
      if (!currentUser || !clientId || !adGroupId) {
        console.error("Missing required parameters for deletion");
        return;
      }

      // Show confirmation dialog
      if (window.confirm("Are you sure you want to delete this ad group?")) {
        await deleteAdGroup(clientId, adGroupId);
        // Refresh the data after deletion
        await fetchData();
      }
    } catch (error) {
      console.error("Error in handleDeleteAdGroup:", error);
      alert("Failed to delete ad group. Please try again.");
    }
  };

  const deleteAdType = async (clientName, adGroupName, adTypeName) => {
    try {
      console.log("Starting ad type deletion:", { clientName, adGroupName, adTypeName });
      const adTypeRef = doc(db, "clients", currentUser.uid, "client", clientName, "adGroups", adGroupName, "adTypes", adTypeName);

      // Get and delete all categories first
      const categoriesRef = collection(adTypeRef, "categories");
      const categoriesSnapshot = await getDocs(categoriesRef);

      for (const categoryDoc of categoriesSnapshot.docs) {
        await deleteDoc(categoryDoc.ref);
      }

      // Then delete the ad type itself
      await deleteDoc(adTypeRef);

      // Update any related campaign documents
      const fieldsRef = doc(db, "clients", currentUser.uid, "fields", clientName);
      const campaignsRef = collection(fieldsRef, "campaigns");
      const campaignsSnapshot = await getDocs(campaignsRef);

      for (const campaignDoc of campaignsSnapshot.docs) {
        const campaignData = campaignDoc.data();
        if (campaignData.adGroupName === adGroupName && campaignData.adTypeName === adTypeName) {
          await deleteDoc(campaignDoc.ref);
        }
      }

      console.log("Ad type deletion completed:", adTypeName);
    } catch (error) {
      console.error("Error deleting ad type:", error);
      throw error;
    }
  };

  const deleteCategory = async (clientName, adGroupName, adTypeName, categoryName) => {
    try {
      console.log("Starting category deletion:", { clientName, adGroupName, adTypeName, categoryName });
      const categoryRef = doc(
        db,
        "clients",
        currentUser.uid,
        "client",
        clientName,
        "adGroups",
        adGroupName,
        "adTypes",
        adTypeName,
        "categories",
        categoryName
      );

      // Delete the category
      await deleteDoc(categoryRef);

      // Update any related campaign documents
      const fieldsRef = doc(db, "clients", currentUser.uid, "fields", clientName);
      const campaignsRef = collection(fieldsRef, "campaigns");
      const campaignsSnapshot = await getDocs(campaignsRef);

      for (const campaignDoc of campaignsSnapshot.docs) {
        const campaignData = campaignDoc.data();
        if (
          campaignData.adGroupName === adGroupName &&
          campaignData.adTypeName === adTypeName &&
          campaignData.categoryName === categoryName
        ) {
          await deleteDoc(campaignDoc.ref);
        }
      }

      console.log("Category deletion completed:", categoryName);
    } catch (error) {
      console.error("Error deleting category:", error);
      throw error;
    }
  };

  const saveToFirestore = async () => {
    try {
      if (!currentUser || !selectedClient?.name) {
        alert("Please enter a client name");
        return;
      }

      // Create the data objects with pin values
      const headlineData = headlineValues.map((h) => ({
        id: h.id,
        text: h.text || "",
        pin: h.pin || "",
      }));

      const descriptionData = descriptionValues.map((d) => ({
        id: d.id,
        text: d.text || "",
        pin: d.pin || "",
      }));

      // Save to fields collection
      const fieldsRef = doc(db, "clients", currentUser.uid, "fields", selectedClient.name);
      await setDoc(fieldsRef, {
        clientName: selectedClient.name,
        timestamp: serverTimestamp(),
      });

      // Save campaign with pin values
      const campaignRef = doc(collection(fieldsRef, "campaigns"));
      const campaignData = {
        clientName: selectedClient.name,
        adGroupName: selectedAdGroup?.name || "Generic",
        adTypeName: selectedAdType?.name || "Responsive search ad",
        categoryName: selectedCategory?.categoryName || categoryName,
        headlineValues: headlineData,
        descriptionValues: descriptionData,
        pathValues: pathValues,
        finalUrlValues: finalUrlValues,
        labelsValues: labelsValues,
        selectedOptionValues: "enabled",
        timestamp: serverTimestamp(),
      };
      await setDoc(campaignRef, campaignData);

      // Save category with pin values
      const categoryRef = doc(
        db,
        "clients",
        currentUser.uid,
        "client",
        selectedClient.name,
        "adGroups",
        selectedAdGroup?.name || "Generic",
        "adTypes",
        selectedAdType?.name || "Responsive search ad",
        "categories",
        selectedCategory?.categoryName || categoryName
      );

      await setDoc(categoryRef, {
        categoryName: selectedCategory?.categoryName || categoryName,
        headlineValues: headlineData,
        descriptionValues: descriptionData,
        pathValues: pathValues,
        finalUrlValues: finalUrlValues,
        labelsValues: labelsValues,
        selectedOptionValues: "enabled",
        timestamp: serverTimestamp(),
      });

      await fetchData();

      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Error saving data to Firestore:", error);
      alert("Error saving data. Please try again.");
    }
  };

  // Add these filtering helper functions
  const filterByClientStatus = (clients, statusToCheck) => {
    return clients.filter((client) => client.clientStatus?.toLowerCase() === statusToCheck);
  };

  const filterByCampaignStatus = (clients, statusToCheck) => {
    return clients
      .map((client) => ({
        ...client,
        adGroups: client.adGroups.filter((group) => group.campaignStatus?.toLowerCase() === statusToCheck),
      }))
      .filter((client) => client.adGroups.length > 0);
  };

  const filterByAdGroupStatus = (clients, statusToCheck) => {
    return clients
      .map((client) => ({
        ...client,
        adGroups: client.adGroups
          .map((group) => ({
            ...group,
            adTypes: group.adTypes.filter((type) => type.adGroupStatus?.toLowerCase() === statusToCheck),
          }))
          .filter((group) => group.adTypes.length > 0),
      }))
      .filter((client) => client.adGroups.length > 0);
  };

  const filterByAdStatus = (clients, statusToCheck) => {
    return clients
      .map((client) => ({
        ...client,
        adGroups: client.adGroups
          .map((group) => ({
            ...group,
            adTypes: group.adTypes
              .map((type) => ({
                ...type,
                categories: type.categories.filter((category) => category.adStatus?.toLowerCase() === statusToCheck),
              }))
              .filter((type) => type.categories.length > 0),
          }))
          .filter((group) => group.adTypes.length > 0),
      }))
      .filter((client) => client.adGroups.length > 0);
  };

  const filterClients = (clients) => {
    if (!searchQuery && statusFilter === "all" && statusLevelFilter === "all" && !showOnlyWithAds) {
      return sortClients(clients);
    }

    // First apply search filter if exists
    let filteredClients = clients;
    if (searchQuery) {
      filteredClients = clients
        .map((client) => {
          // Filter ad groups (campaigns)
          const filteredAdGroups = client.adGroups.filter((group) =>
            decodeURIComponent(group.name).toLowerCase().includes(searchQuery.toLowerCase())
          );

          // Keep client if it has matching campaigns
          return {
            ...client,
            adGroups: filteredAdGroups,
          };
        })
        .filter((client) => client.adGroups.length > 0);
    }

    // Apply status filters first
    if (statusFilter !== "all") {
      const statusToCheck = statusFilter.toLowerCase();

      // Apply status filters based on selected level
      switch (statusLevelFilter) {
        case "clients":
          filteredClients = filterByClientStatus(filteredClients, statusToCheck);
          break;

        case "campaigns":
          filteredClients = filterByCampaignStatus(filteredClients, statusToCheck);
          break;

        case "adGroups":
          filteredClients = filterByAdGroupStatus(filteredClients, statusToCheck);
          break;

        case "ads":
          filteredClients = filterByAdStatus(filteredClients, statusToCheck);
          break;

        case "all":
          // Filter hierarchically - if a parent doesn't match, remove entire subtree
          filteredClients = filteredClients
            .map((client) => {
              // If client doesn't match, remove entire subtree
              if (client.clientStatus?.toLowerCase() !== statusToCheck) {
                return null;
              }

              // Client matches, now filter adGroups
              const filteredAdGroups = client.adGroups
                .map((group) => {
                  // If campaign doesn't match, remove its subtree
                  if (group.campaignStatus?.toLowerCase() !== statusToCheck) {
                    return null;
                  }

                  // Campaign matches, now filter adTypes
                  const filteredAdTypes = group.adTypes
                    .map((type) => {
                      // If ad group doesn't match, remove its subtree
                      if (type.adGroupStatus?.toLowerCase() !== statusToCheck) {
                        return null;
                      }

                      // Ad group matches, now filter categories
                      const filteredCategories = type.categories.filter((category) => category.adStatus?.toLowerCase() === statusToCheck);

                      return {
                        ...type,
                        categories: filteredCategories,
                      };
                    })
                    .filter(Boolean);

                  return {
                    ...group,
                    adTypes: filteredAdTypes,
                  };
                })
                .filter(Boolean);

              return {
                ...client,
                adGroups: filteredAdGroups,
              };
            })
            .filter(Boolean);
          break;
      }
    }

    // Then apply "only with ads" filter if enabled
    if (showOnlyWithAds) {
      filteredClients = filteredClients
        .map((client) => ({
          ...client,
          adGroups: client.adGroups
            .map((group) => ({
              ...group,
              adTypes: group.adTypes
                .map((type) => ({
                  ...type,
                  categories: type.categories,
                }))
                .filter((type) => type.categories.length > 0),
            }))
            .filter((group) => group.adTypes.length > 0),
        }))
        .filter((client) => client.adGroups.length > 0);
    }

    return sortClients(filteredClients);
  };

  // Add new function to handle sorting
  const sortClients = (clients) => {
    return clients.map((client) => ({
      ...client,
      adGroups: [...client.adGroups]
        .sort((a, b) => {
          if (sortOrder === "mostUsed") {
            // Get total usage count for each ad group
            const aUsage = a.adTypes.reduce(
              (sum, type) => sum + type.categories.reduce((catSum, cat) => catSum + (cat.usageCount || 0), 0),
              0
            );
            const bUsage = b.adTypes.reduce(
              (sum, type) => sum + type.categories.reduce((catSum, cat) => catSum + (cat.usageCount || 0), 0),
              0
            );
            return bUsage - aUsage;
          }
          let nameA, nameB;
          try {
            nameA = decodeURIComponent(a.name).toLowerCase();
          } catch (e) {
            nameA = a.name.toLowerCase();
          }
          try {
            nameB = decodeURIComponent(b.name).toLowerCase();
          } catch (e) {
            nameB = b.name.toLowerCase();
          }
          return sortOrder === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        })
        .map((group) => ({
          ...group,
          adTypes: [...group.adTypes]
            .sort((a, b) => {
              if (sortOrder === "mostUsed") {
                // Get total usage count for each ad type
                const aUsage = a.categories.reduce((sum, cat) => sum + (cat.usageCount || 0), 0);
                const bUsage = b.categories.reduce((sum, cat) => sum + (cat.usageCount || 0), 0);
                return bUsage - aUsage;
              }
              const nameA = decodeURIComponent(a.name).toLowerCase();
              const nameB = decodeURIComponent(b.name).toLowerCase();
              return sortOrder === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
            })
            .map((type) => ({
              ...type,
              categories: [...type.categories].sort((a, b) => {
                if (sortOrder === "mostUsed") {
                  return (b.usageCount || 0) - (a.usageCount || 0);
                }
                let nameA, nameB;
                try {
                  nameA = decodeURIComponent(a.categoryName || a.name).toLowerCase();
                } catch (e) {
                  nameA = (a.categoryName || a.name).toLowerCase();
                }
                try {
                  nameB = decodeURIComponent(b.categoryName || b.name).toLowerCase();
                } catch (e) {
                  nameB = (b.categoryName || b.name).toLowerCase();
                }
                return sortOrder === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
              }),
            })),
        })),
    }));
  };

  // Add this useEffect to handle navigation to latest created ad
  useEffect(() => {
    if (latestCreatedAd && clients.length > 0) {
      // Find the client in the current state
      const client = clients.find((c) => c.name === latestCreatedAd.clientName);
      if (client) {
        // Set client and expand its node
        setSelectedClient(client);
        setExpandedClients((prev) => ({ ...prev, [latestCreatedAd.clientName]: true }));

        // Find and set ad group
        const adGroup = client.adGroups.find((g) => g.name === latestCreatedAd.adGroupName);
        if (adGroup) {
          setSelectedAdGroup(adGroup);
          setExpandedAdGroups((prev) => ({ ...prev, [latestCreatedAd.adGroupName]: true }));

          // Find and set ad type
          const adType = adGroup.adTypes.find((t) => t.name === latestCreatedAd.adTypeName);
          if (adType) {
            setSelectedAdType(adType);
            setExpandedAdTypes((prev) => ({ ...prev, [latestCreatedAd.adTypeName]: true }));

            // Find and set category
            const category = adType.categories.find((c) => c.categoryName === latestCreatedAd.categoryName);
            if (category) {
              setSelectedCategory(category);
              setCategoryName(category.categoryName);
            }
          }
        }
      }

      // Clear the latest created ad after 3 seconds
      const timer = setTimeout(() => {
        setLatestCreatedAd(null);
        localStorage.removeItem("latestCreatedAd");
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [latestCreatedAd, clients, setSelectedClient, setExpandedClients, setSelectedAdGroup, setExpandedAdGroups, setSelectedAdType, setExpandedAdTypes, setSelectedCategory, setCategoryName]);

  const handleSidebarPlusClick = (type) => {
    if (type === "campaign") {
      setSelectedCampaign(null);
      setCampaignName("");
      setSelectedAdGroup(null);
      setAdGroupName("");
      setSelectedAdType(null);
      setAdType("");
      setSelectedCategory(null);
      setCategoryName("");
      setHeadlineValues(
        Array(25)
          .fill(null)
          .map((_, index) => ({
            id: `headline-id-${index}`,
            text: "",
            pin: "",
            isExtra: index >= 15,
          }))
      );
      setDescriptionValues(
        Array(10)
          .fill(null)
          .map((_, index) => ({
            id: `description-id-${index}`,
            text: "",
            pin: "",
            isExtra: index >= 4,
          }))
      );
      setPathValues([
        { id: "path-id-0", text: "" },
        { id: "path-id-1", text: "" },
      ]);
      setFinalUrlValues([{ id: "final-url-id-0", text: "" }]);
      setLabelsValues([{ id: "label-id-0", text: "" }]);
    } else if (type === "adGroup") {
      setSelectedAdGroup(null);
      setAdGroupName("");
      setSelectedAdType(null);
      setAdType("");
      setSelectedCategory(null);
      setCategoryName("");
      setHeadlineValues(
        Array(25)
          .fill(null)
          .map((_, index) => ({
            id: `headline-id-${index}`,
            text: "",
            pin: "",
            isExtra: index >= 15,
          }))
      );
      setDescriptionValues(
        Array(10)
          .fill(null)
          .map((_, index) => ({
            id: `description-id-${index}`,
            text: "",
            pin: "",
            isExtra: index >= 4,
          }))
      );
      setPathValues([
        { id: "path-id-0", text: "" },
        { id: "path-id-1", text: "" },
      ]);
      setFinalUrlValues([{ id: "final-url-id-0", text: "" }]);
      setLabelsValues([{ id: "label-id-0", text: "" }]);
    } else if (type === "ad") {
      setSelectedAdType(null);
      setAdType("");
      setSelectedCategory(null);
      setCategoryName("");
      setHeadlineValues(
        Array(25)
          .fill(null)
          .map((_, index) => ({
            id: `headline-id-${index}`,
            text: "",
            pin: "",
            isExtra: index >= 15,
          }))
      );
      setDescriptionValues(
        Array(10)
          .fill(null)
          .map((_, index) => ({
            id: `description-id-${index}`,
            text: "",
            pin: "",
            isExtra: index >= 4,
          }))
      );
      setPathValues([
        { id: "path-id-0", text: "" },
        { id: "path-id-1", text: "" },
      ]);
      setFinalUrlValues([{ id: "final-url-id-0", text: "" }]);
      setLabelsValues([{ id: "label-id-0", text: "" }]);
    }
  };

  const [showNewClientModal, setShowNewClientModal] = useState(false);

  const handleCopyCampaign = async (campaignId) => {
    try {
      // Get campaign data
      const campaignRef = doc(db, "clients", currentUser.uid, "client", selectedClient.id, "adGroups", campaignId);
      const campaignDoc = await getDoc(campaignRef);
      const campaignData = campaignDoc.data();

      // Get ad groups
      const adTypesRef = collection(campaignRef, "adTypes");
      const adTypesSnapshot = await getDocs(adTypesRef);
      const adGroups = adTypesSnapshot.docs.map((doc) => doc.data());

      // Format field to handle special characters
      const formatField = (field) => {
        if (field === undefined || field === null) return "";
        return String(field).replace(/"/g, '""');
      };

      // Create header row based on bid strategy type
      const getHeaderRow = (bidStrategyType) => {
        const commonColumns = [
          "Campaign",
          "Labels",
          "Campaign Type",
          "Networks",
          "Budget",
          "Budget type",
          "Standard conversion goals",
          "Customer acquisition",
          "Languages",
          "Bid Strategy Type",
          "Bid Strategy Name",
          "Campaign Status",
          "Ad Location",
        ];

        const bidStrategyColumns = {
          "Manual CPC": [],
          "Maximize clicks": ["Maximum CPC bid limit"],
          "Maximize conversions": ["Target CPA"],
          "Maximize conversion value": ["Target ROAS"],
          "Target impression share": ["Target impression share", "Maximum CPC bid limit"],
        };

        const remainingColumns = [
          "Start Date",
          "End Date",
          "Broad match keywords",
          "Ad Schedule",
          "Ad rotation",
          "Content exclusions",
          "Targeting method",
          "Exclusion method",
          "Audience targeting",
          "Flexible Reach",
          "Text asset automation",
          "Final URL expansion",
          "Ad Group",
          "Ad Group Status",
          "Location",
          "ID",
          "Max CPC",
          "Target CPA",
          "Target ROAS",
        ];

        return [...commonColumns, ...(bidStrategyColumns[bidStrategyType] || []), ...remainingColumns].join("\t");
      };

      // Create campaign settings row
      const createCampaignRow = (campaignData) => {
        const commonFields = [
          formatField(campaignData.campaignName), // Campaign
          formatField(campaignData.labels), // Labels
          formatField(campaignData.campaignType), // Campaign Type
          formatField(campaignData.networks?.join(";")), // Networks
          formatField(campaignData.campaignDailyBudget), // Budget
          "Daily", // Budget type
          "Account-level", // Standard conversion goals
          "Bid equally", // Customer acquisition
          formatField(campaignData.languages?.join(";")), // Languages
          formatField(campaignData.bidStrategyType), // Bid Strategy Type
          "", // Bid Strategy Name
          formatField(campaignData.campaignStatus || "enabled"), // Campaign Status
          formatField(campaignData.adLocation || "Anywhere on results page"), // Ad Location
        ];

        // Add bid strategy specific fields
        const bidStrategyFields = {
          "Manual CPC": [],
          "Maximize clicks": [formatField(campaignData.maxCpc)], // Maximum CPC bid limit
          "Maximize conversions": [formatField(campaignData.targetCpa)], // Target CPA
          "Maximize conversion value": [formatField(campaignData.targetRoas)], // Target ROAS
          "Target impression share": [
            formatField(campaignData.targetImpressionShare), // Target impression share
            formatField(campaignData.maxCpc), // Maximum CPC bid limit
          ],
        };

        const remainingFields = [
          formatField(campaignData.startDate), // Start Date
          formatField(campaignData.endDate), // End Date
          formatField(campaignData.broadMatchKeywords), // Broad match keywords
          "[]", // Ad Schedule
          formatField(campaignData.adRotation), // Ad rotation
          "[]", // Content exclusions
          formatField(campaignData.targetingMethod), // Targeting method
          "Location of presence", // Exclusion method
          "Audience segments", // Audience targeting
          "Audience segments", // Flexible Reach
          "Disabled", // Text asset automation
          "Disabled", // Final URL expansion
          "", // Ad Group
          "", // Ad Group Status
          formatField(campaignData.location), // Location
          formatField(campaignData.locationId), // ID
          "", // Max CPC
          "", // Target CPA
          "", // Target ROAS
        ];

        return [...commonFields, ...(bidStrategyFields[campaignData.bidStrategyType] || []), ...remainingFields].join("\t");
      };

      // Create ad group row
      const createAdGroupRow = (campaignData, adGroup) => {
        const commonFields = [
          formatField(campaignData.campaignName), // Campaign
          "", // Labels
          "", // Campaign Type
          "", // Networks
          "", // Budget
          "", // Budget type
          "", // Standard conversion goals
          "", // Customer acquisition
          "", // Languages
          "", // Bid Strategy Type
          "", // Bid Strategy Name
          "", // Campaign Status
          "", // Ad Location
        ];

        // Add bid strategy specific fields
        const bidStrategyFields = {
          "Manual CPC": [],
          "Maximize clicks": [""], // Maximum CPC bid limit
          "Maximize conversions": [""], // Target CPA
          "Maximize conversion value": [""], // Target ROAS
          "Target impression share": ["", ""], // Target impression share, Maximum CPC bid limit
        };

        const remainingFields = [
          "", // Start Date
          "", // End Date
          "", // Broad match keywords
          "", // Ad Schedule
          "", // Ad rotation
          "", // Content exclusions
          "", // Targeting method
          "", // Exclusion method
          "", // Audience targeting
          "", // Flexible Reach
          "", // Text asset automation
          "", // Final URL expansion
          formatField(adGroup.name), // Ad Group
          formatField(adGroup.adGroupStatus || "enabled"), // Ad Group Status
          "", // Location
          "", // ID
          campaignData.bidStrategyType === "Manual CPC" ? formatField(adGroup.maxCpc) : "", // Max CPC
          campaignData.bidStrategyType === "Maximize conversions" ? formatField(adGroup.targetCpa || campaignData.targetCpa) : "", // Target CPA
          campaignData.bidStrategyType === "Maximize conversion value" ? formatField(adGroup.targetRoas || campaignData.targetRoas) : "", // Target ROAS
        ];

        return [...commonFields, ...(bidStrategyFields[campaignData.bidStrategyType] || []), ...remainingFields].join("\t");
      };

      // Combine all rows
      const csvContent = [
        getHeaderRow(campaignData.bidStrategyType),
        createCampaignRow(campaignData),
        ...adGroups.map((adGroup) => createAdGroupRow(campaignData, adGroup)),
      ].join("\n");

      // Copy to clipboard
      await navigator.clipboard.writeText(csvContent);
      alert("Campaign data copied to clipboard!");
    } catch (error) {
      console.error("Error copying campaign:", error);
      alert("Error copying campaign data. Please try again.");
    }
  };

  // Modify the click handler for categories to check for unsaved changes
  const handleCategoryClick = (e, adGroup, adType, category) => {
    e.stopPropagation();

    // Only check for unsaved changes, don't try to construct the full URL yet
    if (hasUnsavedChanges && selectedCategory) {
      const confirmed = window.confirm("You have unsaved changes. Are you sure you want to leave?");
      if (!confirmed) {
        return;
      }
    }

    // Update the selected items
    setSelectedAdGroup(adGroup);
    setSelectedAdType(adType);
    setSelectedCategory(category);
    setCategoryName(category.categoryName);
    setHasUnsavedChanges(false);
  };

  // Add useEffect to save statusFilter when it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("statusFilter", statusFilter);
    }
  }, [statusFilter]);

  // Add useEffect to save statusLevelFilter when it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("statusLevelFilter", statusLevelFilter);
    }
  }, [statusLevelFilter]);

  return (
    <ProtectedRoute>
      <div
        className="min-h-screen relative mt-[10px]"
        style={{ borderRadius: "10px" }}>
        <div
          className={`fixed top-[180px] left-0 h-full bg-white shadow-lg transition-all duration-500 ease-in-out overflow-hidden rounded-tr-2xl z-[50] ${
            showSidebar ? "w-72" : "w-0"
          }`}>
          <div className="h-full flex flex-col min-w-[288px]">
            <div className="p-4 border-b">
              <button
                onClick={() => setShowSidebar(false)}
                className="absolute top-2 right-2 p-1 text-black hover:text-blue-500 transition-colors duration-200"
                title="Hide Sidebar">
                <FaChevronLeft />
              </button>
              <div className="flex justify-evenly items-center mb-4">
                <button
                  onClick={() => setShowNewClientModal(true)}
                  className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-md"
                  title="New Client">
                  <FaPlus size={18} />
                </button>
                <ImportClientCSV onUpdate={fetchData} />
                <ImportGoogleAdsButton
                  currentUser={currentUser}
                  onUpdate={fetchData}
                  onUpdateComplete={setClients}
                />
                {selectedClient && (
                  <ExportToGoogleAdsButton
                    currentUser={currentUser}
                    clientName={selectedClient.name}
                    onUpdateComplete={fetchData}
                  />
                )}
              </div>

              <ClientDropdown
                clients={clients}
                selectedClient={selectedClient}
                onClientChange={(client) => {
                  setSelectedClient(client);
                  setSelectedAdGroup(null);
                  setSelectedAdType(null);
                  setSelectedCategory(null);
                }}
                onDeleteClient={(client) => {
                  setDeleteType("client");
                  setDeleteTarget({
                    clientName: client.name,
                  });
                  setShowDeleteModal(true);
                }}
              />

              {/* Add search input */}
              <div className="mb-2">
                <input
                  type="text"
                  placeholder="Search campaigns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                </select>
              </div>

              <div className="mb-2">
                <select
                  value={statusLevelFilter}
                  onChange={(e) => setStatusLevelFilter(e.target.value)}
                  className="w-full px-3 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="all">All Levels</option>
                  <option value="campaigns">Campaigns</option>
                  <option value="adGroups">Ad Groups</option>
                  <option value="ads">Ads</option>
                </select>
              </div>

              <div className="mb-2 flex items-center">
                <input
                  type="checkbox"
                  id="showOnlyWithAds"
                  checked={showOnlyWithAds}
                  onChange={(e) => setShowOnlyWithAds(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label
                  htmlFor="showOnlyWithAds"
                  className="ml-2 text-xs text-gray-700">
                  Only show campaigns containing ads
                </label>
              </div>

              {/* Add sort order toggle */}
              <div className="mb-2">
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="w-full px-3 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="asc">A-Z</option>
                  <option value="desc">Z-A</option>
                  <option value="mostUsed">Most Used</option>
                </select>
              </div>
            </div>

            <div
              className="overflow-y-auto flex-grow"
              style={{ borderRadius: "10px", borderTop: "1px solid rgba(0, 0, 0, 0.17)" }}>
              <div
                className="p-4"
                style={{ marginBottom: "10rem" }}>
                {selectedClient ? (
                  filterClients([selectedClient]).map((client) => (
                    <div key={client.id}>
                      {client.adGroups.map((adGroup, index) => (
                        <div
                          key={adGroup.id}
                          className="mb-1">
                          {index === 0 ? (
                            <div className="flex items-center justify-between text-xs font-semibold text-gray-500 mb-2 ml-1">
                              <span className="border-b border-gray-200 pb-0.5">CAMPAIGNS</span>
                              {/* Campaign + button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNavigation(`/campaign-create/${encodeURIComponent(selectedClient.id)}/new`);
                                }}
                                title="Create new campaign"
                                className={`text-blue-500 hover:text-blue-600 mr-2 ${
                                  !selectedClient ? "opacity-50 cursor-not-allowed" : ""
                                }`}
                                disabled={!selectedClient}>
                                <FaPlus size={12} />
                              </button>
                            </div>
                          ) : expandedAdGroups[client.adGroups[index - 1].id] ? (
                            <div className="flex items-center justify-between text-xs font-semibold text-gray-500 mb-2 ml-1 mt-4">
                              <span className="border-b border-gray-200 pb-0.5">CAMPAIGNS</span>
                              {/* Campaign + button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNavigation(`/campaign-create/${encodeURIComponent(selectedClient.id)}/new`);
                                }}
                                title="Create new campaign"
                                className={`text-blue-500 hover:text-blue-600 mr-2 ${
                                  !selectedClient ? "opacity-50 cursor-not-allowed" : ""
                                }`}
                                disabled={!selectedClient}>
                                <FaPlus size={12} />
                              </button>
                            </div>
                          ) : null}
                          <div
                            className={`flex items-center justify-between p-2 rounded hover:bg-sky-200 cursor-pointer ${
                              selectedAdGroup?.id === adGroup.id ? "bg-blue-50" : ""
                            } ${expandedAdGroups[adGroup.id] ? "bg-sky-100" : ""}`}
                            onClick={() => toggleExpand("adGroup", adGroup.id)}>
                            {/* Campaign name and icons */}
                            <div className="flex items-center gap-2">
                              <FaChevronDown
                                className={`transform transition-transform duration-200 ${
                                  expandedAdGroups[adGroup.id] ? "rotate-0" : "-rotate-90"
                                }`}
                              />
                              <StatusDot status={adGroup.campaignStatus} />
                              <span className={`text-sm ${selectedAdGroup?.id === adGroup.id ? "font-semibold" : ""}`}>{adGroup.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNavigation(`/campaign-create/${encodeURIComponent(selectedClient.id)}/${adGroup.id}`);
                                }}
                                className="text-gray-500 hover:text-gray-700"
                                title="Edit Campaign Settings">
                                <FaGear size={12} />
                              </button>
                              <button
                                onClick={(e) => handleCopyCampaign(adGroup.id)}
                                className="text-gray-500 hover:text-gray-700"
                                title="Copy Campaign">
                                <FaCopy size={12} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteAdGroup(selectedClient.id, adGroup.id);
                                }}
                                className="text-red-500 hover:text-red-700">
                                <FaTrash size={12} />
                              </button>
                            </div>
                          </div>

                          {expandedAdGroups[adGroup.id] && (
                            <div className="ml-4">
                              <div className="flex items-center justify-between text-xs font-semibold text-gray-500 mb-2 mt-2 ml-1">
                                <span className="border-b border-gray-200 pb-0.5">AD GROUPS</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedAdType(null);
                                    setSelectedCategory(null);
                                    setCategoryName("");
                                    setAdType("");
                                    setAdGroupName(adGroup.name);
                                    const { initialHeadlines, initialDescriptions } = createInitialValues();
                                    setHeadlineValues(initialHeadlines);
                                    setDescriptionValues(initialDescriptions);
                                    setPathValues([
                                      { id: "path-id-0", text: "" },
                                      { id: "path-id-1", text: "" },
                                    ]);
                                    setFinalUrlValues([{ id: "final-url-id-0", text: "" }]);
                                    setLabelsValues([{ id: "label-id-0", text: "" }]);
                                  }}
                                  title="Create new ad group"
                                  className="text-blue-500 hover:text-blue-600 mr-2">
                                  <FaPlus size={12} />
                                </button>
                              </div>
                              {adGroup.adTypes.map((adType) => (
                                <div
                                  key={adType.id}
                                  className="mb-1">
                                  <div
                                    className={`flex items-center justify-between p-2 rounded hover:bg-sky-200 cursor-pointer ${
                                      selectedAdType?.id === adType.id ? "bg-blue-50" : ""
                                    } ${expandedAdTypes[adType.id] ? "bg-sky-100" : ""}`}
                                    onClick={() => toggleExpand("adType", adType.id)}>
                                    <div className="flex items-center gap-2">
                                      <FaChevronRight
                                        className={`transform transition-transform ${expandedAdTypes[adType.id] ? "rotate-90" : ""}`}
                                      />
                                      <StatusDot status={adType.adGroupStatus} />
                                      <span className="text-sm font-medium pb-0.5">{adType.name}</span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setRenameType("adType");
                                          setRenameOldName(adType.name);
                                          setRenameNewName(adType.name);
                                          setRenameContext({ clientName: client.name, adGroupName: adGroup.name });
                                          setRenameModalOpen(true);
                                        }}
                                        className="text-gray-500 hover:text-gray-700">
                                        <FaPen size={12} />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeleteType("adType");
                                          setDeleteTarget({
                                            clientName: client.name,
                                            adGroupName: adGroup.name,
                                            adTypeName: adType.name,
                                          });
                                          setShowDeleteModal(true);
                                        }}
                                        className="text-red-500 hover:text-red-700">
                                        <FaTrash size={12} />
                                      </button>
                                    </div>
                                  </div>
                                  {expandedAdTypes[adType.id] && (
                                    <div className="ml-4">
                                      <div className="flex items-center justify-between text-xs font-semibold text-gray-500 mb-2 mt-2 ml-1">
                                        <span className="border-b border-gray-200 pb-0.5">ADS</span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            // Keep the current context from sidebar
                                            setSelectedAdGroup(adGroup);
                                            setSelectedAdType(adType);
                                            // Reset all form values
                                            setSelectedCategory(null);
                                            setCategoryName("");
                                            const { initialHeadlines, initialDescriptions } = createInitialValues();
                                            setHeadlineValues(initialHeadlines);
                                            setDescriptionValues(initialDescriptions);
                                            setPathValues([
                                              { id: "path-id-0", text: "" },
                                              { id: "path-id-1", text: "" },
                                            ]);
                                            setFinalUrlValues([{ id: "final-url-id-0", text: "" }]);
                                            setLabelsValues([{ id: "label-id-0", text: "" }]);
                                            // Force a re-render by updating a state that the useEffect depends on
                                            setHasUnsavedChanges(false);
                                            // Add a small delay to ensure state updates are processed
                                            setTimeout(() => {
                                              setHasUnsavedChanges(true);
                                            }, 100);
                                          }}
                                          title="Create new ad"
                                          className="text-blue-500 hover:text-blue-600 mr-2">
                                          <FaPlus size={12} />
                                        </button>
                                      </div>
                                      {adType.categories.map((category) => (
                                        <div
                                          key={category.id}
                                          className={`p-2 rounded hover:bg-sky-200 cursor-pointer text-sm ${
                                            selectedCategory?.id === category.id ? "bg-blue-50" : ""
                                          } ${
                                            latestCreatedAd &&
                                            latestCreatedAd.clientName === client.name &&
                                            latestCreatedAd.adGroupName === adGroup.name &&
                                            latestCreatedAd.adTypeName === adType.name &&
                                            latestCreatedAd.categoryName === category.categoryName
                                              ? "bg-green-100 animate-pulse"
                                              : ""
                                          }`}
                                          onClick={(e) => handleCategoryClick(e, adGroup, adType, category)}>
                                          <div className="flex items-center gap-2">
                                            <StatusDot status={category.adStatus} />
                                            <span>{category.categoryName}</span>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setRenameType("category");
                                                setRenameOldName(category.categoryName);
                                                setRenameNewName(category.categoryName);
                                                setRenameContext({
                                                  clientName: client.name,
                                                  adGroupName: adGroup.name,
                                                  adTypeName: adType.name,
                                                });
                                                setRenameModalOpen(true);
                                              }}
                                              className="text-gray-500 hover:text-gray-700">
                                              <FaPen size={12} />
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setDeleteType("category");
                                                setDeleteTarget({
                                                  clientName: client.name,
                                                  adGroupName: adGroup.name,
                                                  adTypeName: adType.name,
                                                  categoryName: category.categoryName,
                                                });
                                                setShowDeleteModal(true);
                                              }}
                                              className="text-red-500 hover:text-red-700">
                                              <FaTrash size={12} />
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500 text-center">Select a client to view campaigns</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {!showSidebar && (
          <div onClick={() => setShowSidebar(true)}>
            <button
              title="Show Sidebar"
              className="fixed top-[180px] left-2 z-40 flex items-center group bg-white rounded-lg p-2 w-8 hover:w-[132px] transition-all duration-500 overflow-hidden">
              <span className="opacity-0 group-hover:opacity-100 transform group-hover:translate-x-1 -translate-x-10 transition-all duration-500 whitespace-nowrap text-[#4C84EC] font-semibold text-sm">
                Show Sidebar
              </span>
              <FaChevronLeft className="transform rotate-180 text-[#2A5CBA] group-hover:text-black transition-all duration-500 absolute right-2 group-hover:right-2" />
            </button>
          </div>
        )}

        <div
          className="p-6"
          style={{ backgroundColor: "#FFFFFF", borderRadius: "10px" }}>
          {renameModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg">
                <h2 className="text-xl font-bold mb-4">Rename {renameType}</h2>
                <input
                  type="text"
                  value={renameNewName}
                  onChange={(e) => setRenameNewName(e.target.value)}
                  className="border p-2 mb-4 w-full"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setRenameModalOpen(false)}
                    className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        if (renameType === "client") {
                          await renameClient(currentUser, renameOldName, renameNewName);
                          await fetchData();
                        } else if (renameType === "adGroup") {
                          await renameAdGroup(currentUser, renameContext.clientName, renameOldName, renameNewName);
                          await fetchData();
                        } else if (renameType === "adType") {
                          await renameAdType(
                            currentUser,
                            renameContext.clientName,
                            renameContext.adGroupName,
                            renameOldName,
                            renameNewName
                          );
                          await refreshAdTypes(renameContext.clientName, renameContext.adGroupName);
                          setClients((prevClients) => {
                            return prevClients.map((client) => {
                              if (client.name === renameContext.clientName) {
                                return {
                                  ...client,
                                  adGroups: client.adGroups.map((adGroup) => {
                                    if (adGroup.name === renameContext.adGroupName) {
                                      return {
                                        ...adGroup,
                                        adTypes: adGroup.adTypes.map((adType) => {
                                          if (adType.id === renameOldName) {
                                            return {
                                              ...adType,
                                              id: renameNewName,
                                              name: renameNewName,
                                            };
                                          }
                                          return adType;
                                        }),
                                      };
                                    }
                                    return adGroup;
                                  }),
                                };
                              }
                              return client;
                            });
                          });
                        } else if (renameType === "category") {
                          await renameCategory(
                            currentUser,
                            renameContext.clientName,
                            renameContext.adGroupName,
                            renameContext.adTypeName,
                            renameOldName,
                            renameNewName
                          );
                          setClients((prevClients) => {
                            return prevClients.map((client) => {
                              if (client.name === renameContext.clientName) {
                                return {
                                  ...client,
                                  adGroups: client.adGroups.map((adGroup) => {
                                    if (adGroup.name === renameContext.adGroupName) {
                                      return {
                                        ...adGroup,
                                        adTypes: adGroup.adTypes.map((adType) => {
                                          if (adType.name === renameContext.adTypeName) {
                                            return {
                                              ...adType,
                                              categories: adType.categories.map((category) => {
                                                if (category.id === renameOldName) {
                                                  return {
                                                    ...category,
                                                    id: renameNewName,
                                                    name: renameNewName,
                                                    categoryName: renameNewName,
                                                  };
                                                }
                                                return category;
                                              }),
                                            };
                                          }
                                          return adType;
                                        }),
                                      };
                                    }
                                    return adGroup;
                                  }),
                                };
                              }
                              return client;
                            });
                          });
                        }
                        setRenameModalOpen(false);
                      } catch (error) {
                        console.error("Error renaming:", error);
                      }
                    }}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
                    Rename
                  </button>
                </div>
              </div>
            </div>
          )}

          <ClientForm
            clientName={selectedClient?.name || ""}
            adGroupName={selectedAdGroup?.name || ""}
            adType={selectedAdType?.name || ""}
            categoryName={categoryName}
            setCategoryName={setCategoryName}
            categories={categories}
            currentUser={currentUser}
            selectedClient={selectedClient}
            selectedAdGroup={selectedAdGroup}
            selectedAdType={selectedAdType}
            selectedCategory={selectedCategory}
            finalUrlValues={finalUrlValues}
            setFinalUrlValues={setFinalUrlValues}
            headlineValues={headlineValues}
            descriptionValues={descriptionValues}
            pathValues={pathValues}
            setPathValues={setPathValues}
            labelsValues={labelsValues}
            setLabelsValues={setLabelsValues}
            setHeadlineValues={setHeadlineValues}
            setDescriptionValues={setDescriptionValues}
            selectedHeadlines={selectedHeadlines}
            selectedDescriptions={selectedDescriptions}
            setSelectedHeadlines={setSelectedHeadlines}
            setSelectedDescriptions={setSelectedDescriptions}
            onUpdate={fetchData}
            clients={clients.map((client) => client.name)}
            adGroups={selectedClient?.adGroups?.map((group) => group.name) || []}
            adTypes={selectedAdGroup?.adTypes?.map((type) => type.name) || []}
            setClientName={setClientName}
            setAdGroupName={setAdGroupName}
            setAdType={setAdType}
            campaignDailyBudget={campaignDailyBudget}
            setCampaignDailyBudget={setCampaignDailyBudget}
            campaignType={campaignType}
            setCampaignType={setCampaignType}
            networks={networks}
            setNetworks={setNetworks}
            languages={languages}
            setLanguages={setLanguages}
            maxCpc={maxCpc}
            setMaxCpc={setMaxCpc}
            enhancedCpc={enhancedCpc}
            setEnhancedCpc={setEnhancedCpc}
            adRotation={adRotation}
            setAdRotation={setAdRotation}
            location={location}
            setLocation={setLocation}
            campaignId={campaignId}
            setCampaignId={setCampaignId}
            website={website}
            setWebsite={setWebsite}
            bidStrategyType={bidStrategyType}
            setBidStrategyType={setBidStrategyType}
            hasUnsavedChanges={hasUnsavedChanges}
            setHasUnsavedChanges={setHasUnsavedChanges}
          />
        </div>

        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
            <div
              className="p-6"
              style={{ padding: "0" }}>
              <div className="bg-white rounded-lg">
                <div
                  className="border-b px-6 py-4 mb-6"
                  style={{ padding: "1rem" }}>
                  <h2
                    className="text-2xl font-bold text-gray-800"
                    style={{ padding: "1rem" }}>
                    Confirm Delete
                  </h2>
                </div>

                <div
                  className="px-6"
                  style={{ paddingBottom: "2rem" }}>
                  <p className="text-gray-600 mb-8">
                    Are you sure you want to delete this {deleteType}?
                    {deleteType === "client" && (
                      <span className="block mt-2 text-red-600">This will delete all ad groups, ad types, and categories within it.</span>
                    )}
                    {deleteType === "adGroup" && (
                      <span className="block mt-2 text-red-600">This will delete all ad types and categories within it.</span>
                    )}
                    {deleteType === "adType" && <span className="block mt-2 text-red-600">This will delete all categories within it.</span>}
                  </p>
                  <div className="flex justify-end gap-4">
                    <Button
                      onClick={() => {
                        setShowDeleteModal(false);
                        setDeleteTarget(null);
                      }}
                      title="Cancel"
                      color="dark"
                      size="medium"
                    />
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-3xl disabled:opacity-50">
                      {isDeleting ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add the NewClientModal */}
        <NewClientModal
          isOpen={showNewClientModal}
          onClose={() => setShowNewClientModal(false)}
        />
      </div>
    </ProtectedRoute>
  );
}