"use client";
import { AuthProvider, useAuth } from "@/components/authContext";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FaTrash, FaPlus, FaArrowLeft } from "react-icons/fa6";
import ImportCopy from "@/components/clientname/importCopy";
import CategoryList from "@/components/clientname/categoryList";
import { collection, query, getDocs, where, doc, getDoc, deleteDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase/firebase";
import Link from "next/link";
import ModalConfirm from "@/components/modalConfirm";
import { notFound } from "next/navigation";

export default function ClientPage({ params }) {
  const { clientName } = params;
  const decodedClientName = decodeURIComponent(clientName);
  const router = useRouter();
  const auth = useAuth();
  const currentUser = auth?.currentUser;
  
  // State declarations
  const [categoryNames, setCategoryNames] = useState([]);
  const [headlinesAndDescriptions, setHeadlinesAndDescriptions] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState([]);
  const [selectedCopyCategories, setSelectedCopyCategories] = useState([]);
  const [markedList, setMarkedList] = useState([]);
  const [newListHeadlines, setNewListHeadlines] = useState([]);
  const [newListDescriptions, setNewListDescriptions] = useState([]);
  const [isOpen, setIsOpen] = useState(null);
  const [selectedCopyItems, setSelectedCopyItems] = useState([]);
  const [clientExists, setClientExists] = useState(null);
  const [loading, setLoading] = useState(true);
  const [arrowRotated, setArrowRotated] = useState(false);
  const [newList, setNewList] = useState([]);
  const [categoryHeadlines, setCategoryHeadlines] = useState([]);
  const [categoryDescriptions, setCategoryDescriptions] = useState([]);
  const [displayedHeadlines, setDisplayedHeadlines] = useState([]);
  const [displayedDescriptions, setDisplayedDescriptions] = useState([]);
  const [isCategoryChecked, setIsCategoryChecked] = useState({});
  const [selectedHeadlines, setSelectedHeadlines] = useState([]);
  const [selectedDescriptions, setSelectedDescriptions] = useState([]);
  const [markedCategories, setMarkedCategories] = useState([]);
  const [markedHeadlines, setMarkedHeadlines] = useState([]);
  const [markedDescriptions, setMarkedDescriptions] = useState([]);
  const [importedHeadlines, setImportedHeadlines] = useState([]);
  const [importedDescriptions, setImportedDescriptions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showNewAdGroupModal, setShowNewAdGroupModal] = useState(false);
  const [showDeleteAdGroupModal, setShowDeleteAdGroupModal] = useState(false);
  const [showDeleteAdTypeModal, setShowDeleteAdTypeModal] = useState(false);
  const [selectedAdGroupToDelete, setSelectedAdGroupToDelete] = useState(null);
  const [selectedAdTypeToDelete, setSelectedAdTypeToDelete] = useState(null);
  const [newAdGroupName, setNewAdGroupName] = useState("");
  const [adGroups, setAdGroups] = useState([]);
  const [expandedAdGroups, setExpandedAdGroups] = useState({});
  const [adTypes, setAdTypes] = useState({});
  const [expandedAdTypes, setExpandedAdTypes] = useState({});

  // FUNCTION DECLARATIONS
  // Wrap functions that are used in useEffect dependencies with useCallback
  
  const fetchHeadlinesAndDescriptions = useCallback(async (categoryName) => {
    try {
      if (currentUser && clientName) {
        const categoryRef = doc(db, "clients", currentUser.uid, "client", decodedClientName, "categoryName", categoryName);
        const docSnapshot = await getDoc(categoryRef);
        if (docSnapshot.exists()) {
          const { headlineValues, descriptionValues } = docSnapshot.data();
          const headlines = headlineValues.map((headline) => headline.text);
          const descriptions = descriptionValues.map((description) => description.text);

          const uniqueHeadlines = Array.from(new Set(headlines));
          const uniqueDescriptions = Array.from(new Set(descriptions));
          setHeadlinesAndDescriptions([
            {
              headlines: uniqueHeadlines,
              descriptions: uniqueDescriptions,
            },
          ]);
          setCategoryHeadlines(headlines);
          setCategoryDescriptions(descriptions);
          setExpandedCategories((prevExpandedCategories) =>
            prevExpandedCategories.includes(categoryName)
              ? prevExpandedCategories.filter((category) => category !== categoryName)
              : [...prevExpandedCategories, categoryName]
          );
          setIsOpen(categoryName);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentUser, clientName, decodedClientName]);

  const handleImportCopies = useCallback((importedHeadlines, importedDescriptions) => {
    try {
      const encodedLowercaseHeadlines = importedHeadlines.map((headline) => encodeURIComponent(headline));
      const encodedLowercaseDescriptions = importedDescriptions.map((description) => encodeURIComponent(description));

      const mergedHeadlines = [...newListHeadlines, ...encodedLowercaseHeadlines];
      const mergedDescriptions = [...newListDescriptions, ...encodedLowercaseDescriptions];

      const removeDuplicates = (array) => Array.from(new Set(array));
      const filteredHeadlines = removeDuplicates(mergedHeadlines);
      const filteredDescriptions = removeDuplicates(mergedDescriptions);

      setNewListHeadlines(filteredHeadlines);
      setNewListDescriptions(filteredDescriptions);
    } catch (error) {
      console.error("Error handling imported copy:", error);
    }
  }, [newListHeadlines, newListDescriptions]);

  // ... other function declarations (same as before but wrapped with useCallback if needed in deps)

  // HOOKS - all hooks must be unconditional
  useEffect(() => {
    if (isOpen) {
      fetchHeadlinesAndDescriptions(isOpen);
    }
  }, [isOpen, fetchHeadlinesAndDescriptions]);

  useEffect(() => {
    if (importedHeadlines.length > 0 || importedDescriptions.length > 0) {
      handleImportCopies(importedHeadlines, importedDescriptions);
      setImportedHeadlines([]);
      setImportedDescriptions([]);
    }
  }, [importedHeadlines, importedDescriptions, handleImportCopies]);

  useEffect(() => {
    async function fetchData() {
      try {
        if (currentUser && clientName) {
          const q = query(collection(db, "clients", currentUser.uid, "client", decodedClientName, "categoryName"));
          const data = await getDocs(q);
          const categoryData = data.docs.map((doc) => ({
            id: doc.id,
            categoryName: doc.id,
          }));
          setCategoryNames(categoryData);
          setSelectedCopyItems(
            categoryData.map((category) => ({
              categoryName: category.categoryName,
              selectedItems: [],
            }))
          );
        }
      } catch (err) {
        console.error(err);
      }
    }
    fetchData();
  }, [currentUser, decodedClientName, clientName]);

  useEffect(() => {
    // Set the displayed headlines based on selectedHeadlines
    setDisplayedHeadlines(selectedHeadlines);
    // Set the displayed descriptions based on selectedDescriptions
    setDisplayedDescriptions(selectedDescriptions);
  }, [selectedHeadlines, selectedDescriptions]);

  useEffect(() => {
    setMarkedList(newList);
    setNewList(newList);
  }, [newList]);

  useEffect(() => {
    const initialIsCategoryChecked = {};
    categoryNames.forEach((category) => {
      initialIsCategoryChecked[`${category.categoryName}_category`] = false;
      initialIsCategoryChecked[`${category.categoryName}_headline`] = false;
      initialIsCategoryChecked[`${category.categoryName}_description`] = false;
    });
    setIsCategoryChecked(initialIsCategoryChecked);
  }, [categoryNames]);

  useEffect(() => {
    async function fetchAdGroups() {
      try {
        if (currentUser && clientName) {
          const adGroupsRef = collection(db, "clients", currentUser.uid, "client", decodedClientName, "adGroups");
          const data = await getDocs(adGroupsRef);
          const adGroupData = data.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setAdGroups(adGroupData);
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    }
    fetchAdGroups();
  }, [currentUser, decodedClientName, clientName]);

  useEffect(() => {
    async function checkClientExists() {
      try {
        if (currentUser && clientName) {
          const clientRef = doc(db, "clients", currentUser.uid, "client", decodedClientName);
          const clientSnapshot = await getDoc(clientRef);
          setClientExists(clientSnapshot.exists());
          if (!clientSnapshot.exists()) {
            router.push("/404");
          }
        }
      } catch (err) {
        console.error(err);
        setClientExists(false);
        router.push("/404");
      } finally {
        setLoading(false);
      }
    }

    if (currentUser) {
      checkClientExists();
    }
  }, [currentUser, decodedClientName, clientName, router]);

  // Early return if no clientName
  if (!clientName) {
    return <p>Client Name is not defined.</p>;
  }

  // Don't render anything until we've checked if the client exists
  if (loading || clientExists === null) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  // Skip rendering the client page content if we know the client doesn't exist
  if (clientExists === false) {
    return null;
  }

  // ... rest of the component (return JSX) remains the same
  return (
    <div className="flex flex-col gap-4">
      {/* ... rest of your JSX code */}
    </div>
  );
}