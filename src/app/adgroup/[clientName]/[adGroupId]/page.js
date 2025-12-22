"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/authContext";
import { collection, getDocs, doc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/firebase";
import { FaTrash } from "react-icons/fa6";
import Link from "next/link";
import CategoryList from "@/components/clientname/categoryList";
import ImportCopy from "@/components/clientname/importCopy";
import ModalConfirm from "@/components/modalConfirm";

export default function AdGroupPage({ params }) {
  const { clientName, adGroupId } = params;
  const decodedClientName = decodeURIComponent(clientName);
  const decodedAdGroupId = decodeURIComponent(adGroupId);
  const router = useRouter();
  const auth = useAuth();
  const currentUser = auth?.currentUser;
  const [categoryNames, setCategoryNames] = useState([]);
  const [headlinesAndDescriptions, setHeadlinesAndDescriptions] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState([]);
  const [selectedCopyCategories, setSelectedCopyCategories] = useState([]);
  const [markedList, setMarkedList] = useState([]);
  const [newListHeadlines, setNewListHeadlines] = useState([]);
  const [newListDescriptions, setNewListDescriptions] = useState([]);
  const [isOpen, setIsOpen] = useState(null);
  const [selectedCopyItems, setSelectedCopyItems] = useState([]);
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

  // Function to open modal
  const openModal = useCallback(() => {
    setShowModal(true);
  }, []);

  // Function to close modal
  const closeModal = useCallback(() => {
    setShowModal(false);
  }, []);

  // Wrap functions with useCallback to include in useEffect dependencies
  const fetchHeadlinesAndDescriptions = useCallback(async (categoryName) => {
    try {
      if (currentUser && clientName && adGroupId) {
        const categoryRef = doc(db, "clients", currentUser.uid, "client", decodedClientName, "adGroups", decodedAdGroupId, "categories", categoryName);
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
  }, [currentUser, clientName, adGroupId, decodedClientName, decodedAdGroupId]);

  const handleImportCopies = useCallback((importedHeadlines, importedDescriptions) => {
    try {
      const encodedLowercaseHeadlines = importedHeadlines.map((headline) => encodeURIComponent(headline));
      const encodedLowercaseDescriptions = importedDescriptions.map((description) => encodeURIComponent(description));

      const mergedHeadlines = [...newListHeadlines, ...encodedLowercaseHeadlines];
      const mergedDescriptions = [...newListDescriptions, ...encodedLowercaseDescriptions];

      const filteredHeadlines = removeDuplicates(mergedHeadlines);
      const filteredDescriptions = removeDuplicates(mergedDescriptions);

      setNewListHeadlines(filteredHeadlines);
      setNewListDescriptions(filteredDescriptions);
    } catch (error) {
      console.error("Error handling imported copy:", error);
    }
  }, [newListHeadlines, newListDescriptions]);

  const removeDuplicates = useCallback((array) => {
    return Array.from(new Set(array));
  }, []);

  // Fixed useEffect with proper dependencies
  useEffect(() => {
    if (isOpen) {
      fetchHeadlinesAndDescriptions(isOpen);
    }
  }, [isOpen, fetchHeadlinesAndDescriptions]);

  // Fixed useEffect with proper dependencies
  useEffect(() => {
    if (importedHeadlines.length > 0 || importedDescriptions.length > 0) {
      handleImportCopies(importedHeadlines, importedDescriptions);
      setImportedHeadlines([]);
      setImportedDescriptions([]);
    }
  }, [importedHeadlines, importedDescriptions, handleImportCopies]);

  // Fixed useEffect with proper dependencies
  useEffect(() => {
    async function fetchData() {
      try {
        if (currentUser && clientName && adGroupId) {
          const q = collection(db, "clients", currentUser.uid, "client", decodedClientName, "adGroups", decodedAdGroupId, "categories");
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
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [currentUser, decodedClientName, decodedAdGroupId, clientName, adGroupId]);

  // Empty useEffect - can be removed if not needed
  useEffect(() => {
    // No dependencies needed for empty effect
  }, []);

  // Empty useEffect - can be removed if not needed
  useEffect(() => {
    // No dependencies needed for empty effect
  }, []);

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
    setDisplayedHeadlines(selectedHeadlines);
    setDisplayedDescriptions(selectedDescriptions);
  }, [selectedHeadlines, selectedDescriptions]);

  const fetchCategoryData = useCallback(async (clientName, categoryName) => {
    try {
      if (currentUser && clientName && adGroupId) {
        const categoryRef = doc(db, "clients", currentUser.uid, "client", decodedClientName, "adGroups", decodedAdGroupId, "categories", categoryName);
        const docSnapshot = await getDoc(categoryRef);
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          const headlines = data.headlineValues ? data.headlineValues.map((headline) => headline.text || "") : [];
          const descriptions = data.descriptionValues ? data.descriptionValues.map((description) => description.text || "") : [];
          const finalUrls = data.finalUrlValues ? data.finalUrlValues.map((url) => url.text || "") : [];
          const paths = data.pathValues ? data.pathValues.map((path) => path.text || "") : [];
          const labels = data.labelsValues
            ? Array.isArray(data.labelsValues)
              ? data.labelsValues.map((label) => label.text || "")
              : [data.labelsValues]
            : [];
          return {
            headlines,
            descriptions,
            finalUrls,
            paths,
            labelsValues: labels,
          };
        }
        return null;
      }
    } catch (error) {
      console.error("Error fetching category data:", error);
      return null;
    }
  }, [currentUser, adGroupId, decodedClientName, decodedAdGroupId]);

  const onViewAd = useCallback((categoryData) => {
    // Handle the fetched data here
  }, []);

  const toggleCategoryVisibility = useCallback((categoryName) => {
    setArrowRotated((prevArrowRotated) => !prevArrowRotated);
    if (isOpen === categoryName) {
      setIsOpen(null);
      setHeadlinesAndDescriptions([]);
    } else {
      fetchHeadlinesAndDescriptions(categoryName);
    }
  }, [isOpen, fetchHeadlinesAndDescriptions]);

  const handleCheckboxChange = useCallback(async (categoryName, type, index, checked) => {
    try {
      let currentCategoryHeadlines = [];
      let currentCategoryDescriptions = [];
      if (type === "category" || type === "headline" || type === "description") {
        if (categoryName) {
          const categoryRef = doc(db, "clients", currentUser.uid, "client", decodedClientName, "adGroups", decodedAdGroupId, "categories", categoryName);
          const docSnapshot = await getDoc(categoryRef);
          if (docSnapshot.exists()) {
            const { headlineValues, descriptionValues } = docSnapshot.data();
            currentCategoryHeadlines = headlineValues.map((headline) => headline.text);
            currentCategoryDescriptions = descriptionValues.map((description) => description.text);
          }
        }
      }

      if (type === "category") {
        setIsCategoryChecked(prev => ({
          ...prev,
          [`${categoryName}_category`]: checked,
          [`${categoryName}_headline`]: checked,
          [`${categoryName}_description`]: checked
        }));

        if (checked) {
          setSelectedHeadlines(prev => [...new Set([...prev, ...currentCategoryHeadlines])]);
          setSelectedDescriptions(prev => [...new Set([...prev, ...currentCategoryDescriptions])]);
          setNewListHeadlines(prev => [...new Set([...prev, ...currentCategoryHeadlines])]);
          setNewListDescriptions(prev => [...new Set([...prev, ...currentCategoryDescriptions])]);
        } else {
          setSelectedHeadlines(prev => prev.filter(h => !currentCategoryHeadlines.includes(h)));
          setSelectedDescriptions(prev => prev.filter(d => !currentCategoryDescriptions.includes(d)));
          setNewListHeadlines(prev => prev.filter(h => !currentCategoryHeadlines.includes(h)));
          setNewListDescriptions(prev => prev.filter(d => !currentCategoryDescriptions.includes(d)));
        }
      } else if (type === "headline") {
        setIsCategoryChecked(prev => ({
          ...prev,
          [`${categoryName}_headline`]: checked
        }));

        if (checked) {
          if (index === -2) {
            const allHeadlines = headlinesAndDescriptions[0]?.headlines || [];
            setSelectedHeadlines(prev => [...new Set([...prev, ...allHeadlines])]);
            setNewListHeadlines(prev => [...new Set([...prev, ...allHeadlines])]);
          } else {
            const headline = headlinesAndDescriptions[0]?.headlines[index];
            if (headline) {
              setSelectedHeadlines(prev => [...new Set([...prev, headline])]);
              setNewListHeadlines(prev => [...new Set([...prev, headline])]);
            }
          }
        } else {
          if (index === -2) {
            setSelectedHeadlines(prev => prev.filter(h => !currentCategoryHeadlines.includes(h)));
            setNewListHeadlines(prev => prev.filter(h => !currentCategoryHeadlines.includes(h)));
          } else {
            const headline = headlinesAndDescriptions[0]?.headlines[index];
            if (headline) {
              setSelectedHeadlines(prev => prev.filter(h => h !== headline));
              setNewListHeadlines(prev => prev.filter(h => h !== headline));
            }
          }
        }
      } else if (type === "description") {
        setIsCategoryChecked(prev => ({
          ...prev,
          [`${categoryName}_description`]: checked
        }));

        if (checked) {
          if (index === -2) {
            const allDescriptions = headlinesAndDescriptions[0]?.descriptions || [];
            setSelectedDescriptions(prev => [...new Set([...prev, ...allDescriptions])]);
            setNewListDescriptions(prev => [...new Set([...prev, ...allDescriptions])]);
          } else {
            const description = headlinesAndDescriptions[0]?.descriptions[index];
            if (description) {
              setSelectedDescriptions(prev => [...new Set([...prev, description])]);
              setNewListDescriptions(prev => [...new Set([...prev, description])]);
            }
          }
        } else {
          if (index === -2) {
            setSelectedDescriptions(prev => prev.filter(d => !currentCategoryDescriptions.includes(d)));
            setNewListDescriptions(prev => prev.filter(d => !currentCategoryDescriptions.includes(d)));
          } else {
            const description = headlinesAndDescriptions[0]?.descriptions[index];
            if (description) {
              setSelectedDescriptions(prev => prev.filter(d => d !== description));
              setNewListDescriptions(prev => prev.filter(d => d !== description));
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentUser, decodedClientName, decodedAdGroupId, headlinesAndDescriptions]);

  const deleteAdGroup = useCallback(async () => {
    try {
      console.log("Deleting ad group...");
      if (!currentUser || !clientName || !adGroupId) {
        console.log("User is not logged in or ad group info is not defined.");
        return;
      }

      // Delete categories within the ad group
      const categoriesRef = collection(db, "clients", currentUser.uid, "client", decodedClientName, "adGroups", decodedAdGroupId, "categories");
      const categorySnapshot = await getDocs(categoriesRef);
      for (const categoryDoc of categorySnapshot.docs) {
        await deleteDoc(categoryDoc.ref);
      }

      // Delete the ad group
      const adGroupRef = doc(db, "clients", currentUser.uid, "client", decodedClientName, "adGroups", decodedAdGroupId);
      await deleteDoc(adGroupRef);
      
      console.log("Ad group deleted successfully.");
      openModal();
      router.push(`/${encodeURIComponent(clientName)}`);
    } catch (error) {
      console.error("Error deleting ad group:", error);
    }
  }, [currentUser, clientName, adGroupId, decodedClientName, decodedAdGroupId, openModal, router]);

  const handleConfirmDelete = useCallback(async () => {
    await deleteAdGroup();
    closeModal();
    router.push(`/${encodeURIComponent(clientName)}`);
  }, [deleteAdGroup, closeModal, router, clientName]);

  const handleRemoveItem = useCallback((index, type) => {
    if (type === "headline") {
      setNewListHeadlines((prevHeadlines) => prevHeadlines.filter((_, idx) => idx !== index));
    } else if (type === "description") {
      setNewListDescriptions((prevDescriptions) => prevDescriptions.filter((_, idx) => idx !== index));
    }
  }, []);

  const copyAllAdsFromCategories = useCallback(async () => {
    try {
      const allAds = await Promise.all(categoryNames.map(async (category) => {
        const categoryData = await fetchCategoryData(clientName, category.categoryName);
        return categoryData || { headlines: [], descriptions: [] };
      }));

      const maxHeadlines = 15;
      const maxDescriptions = 4;

      const headerColumns = [
        "Ad type",
        ...Array.from({ length: maxHeadlines }, (_, i) => `Headline ${i + 1}`),
        ...Array.from({ length: maxDescriptions }, (_, i) => `Description ${i + 1}`)
      ];

      const adRows = allAds.map(categoryData => {
        const row = new Array(1 + maxHeadlines + maxDescriptions).fill('');
        row[0] = "Responsive search ad";
        
        const headlines = categoryData.headlines || [];
        headlines.forEach((headline, i) => {
          if (i < maxHeadlines) {
            row[i + 1] = headline || '';
          }
        });
        
        const descriptions = categoryData.descriptions || [];
        descriptions.forEach((description, i) => {
          if (i < maxDescriptions) {
            row[i + maxHeadlines + 1] = description || '';
          }
        });
        
        return row;
      });

      const textToCopy = [
        headerColumns.join('\t'),
        ...adRows.map(row => row.join('\t'))
      ].join('\n');

      await navigator.clipboard.writeText(textToCopy);
    } catch (err) {
      console.error('Failed to copy content:', err);
    }
  }, [categoryNames, fetchCategoryData, clientName]);

  return (
    <div className="text-white mt-6">
      <div className="text-center font-bold text-3xl">
        <p>Ad Group: {decodedAdGroupId}</p>
      </div>
      <div className="flex justify-between mt-6 -translate-x-9">
        <div className="flex flex-col">
          <h2 className="underline font-bold text-2xl mb-4">Categories:</h2>
          {Array.isArray(categoryNames) &&
            categoryNames.map((category) => (
              <CategoryList
                key={category.id}
                clientName={clientName}
                category={{ ...category, adGroupId: decodedAdGroupId }}
                categoryName={decodeURIComponent(category.categoryName)}
                isOpen={isOpen}
                toggleCategoryVisibility={toggleCategoryVisibility}
                isCategoryChecked={isCategoryChecked}
                handleCheckboxChange={handleCheckboxChange}
                selectedHeadlines={selectedHeadlines}
                selectedDescriptions={selectedDescriptions}
                headlinesAndDescriptions={headlinesAndDescriptions}
                loading={loading}
                setMarkedHeadlines={setMarkedHeadlines}
                setMarkedDescriptions={setMarkedDescriptions}
                setSelectedCopyCategories={setSelectedCopyCategories}
                selectedCopyItems={selectedCopyItems}
                categoryHeadlines={categoryHeadlines}
                categoryDescriptions={categoryDescriptions}
                fetchCategoryData={fetchCategoryData}
                newListDescriptions={newListDescriptions}
                newListHeadlines={newListHeadlines}
                onViewAd={onViewAd}
                setNewListHeadlines={setNewListHeadlines}
                setSelectedHeadlines={setSelectedHeadlines}
                setSelectedDescriptions={setSelectedDescriptions}
                setNewListDescriptions={setNewListDescriptions}
              />
            ))}
        </div>
        <div className="flex flex-col mt-7">
          {markedCategories.map((category, index) => (
            <li key={index}>{category}</li>
          ))}
          {newListHeadlines.length > 0 && (
            <>
              <p className="font-bold underline text-2xl">Marked Headlines:</p>
              <ul className="w-96">
                {newListHeadlines
                  .filter((headline) => headline.trim() !== "")
                  .map((headline, index) => (
                    <li
                      className="mb-2 border-b rounded-sm py-2 border-b-slate-200 flex items-center justify-between"
                      key={index}>
                      {decodeURIComponent(headline)}
                      <button
                        onClick={() => handleRemoveItem(index, "headline")}
                        className="px-2 items-center hover:text-slate-200 text-slate-700 text-xl">
                        <FaTrash />
                      </button>
                    </li>
                  ))}
              </ul>
            </>
          )}
          {newListDescriptions.length > 0 && (
            <>
              <p className="font-bold underline text-2xl">Marked Descriptions:</p>
              <ul className="w-96">
                {newListDescriptions
                  .filter((description) => description.trim() !== "")
                  .map((description, index) => (
                    <li
                      className="mb-2 border-b rounded-sm py-2 border-b-slate-200 flex items-center justify-between"
                      key={index}>
                      {decodeURIComponent(description)}
                      <button
                        onClick={() => handleRemoveItem(index, "description")}
                        className="px-2 items-center hover:text-slate-200 text-slate-700 text-xl">
                        <FaTrash />
                      </button>
                    </li>
                  ))}
              </ul>
            </>
          )}
          <div className="w-fit flex flex-col items-start gap-2">
            <button
              onClick={copyAllAdsFromCategories}
              className="border border-slate-600 bg-slate-700 hover:bg-slate-500 text-white rounded-lg px-3 py-2">
              Copy all ads
            </button>
            
            <Link
              className="border border-slate-600 bg-slate-700 hover:bg-slate-500 text-white rounded-lg px-3 py-2"
              href={`/client?newListHeadlines=${encodeURIComponent(
                JSON.stringify(newListHeadlines)
              )}&newListDescriptions=${encodeURIComponent(JSON.stringify(newListDescriptions))}&clientName=${encodeURIComponent(
                clientName
              )}&adGroupId=${encodeURIComponent(adGroupId)}`}>
              Create a new ad
            </Link>
            <ImportCopy onImportCopies={handleImportCopies} />
            <button
              onClick={openModal}
              className="bg-red-500 rounded-lg w-fit px-3 py-2 hover:bg-red-700">
              Delete Ad Group
            </button>
          </div>
        </div>
      </div>
      <ModalConfirm
        isOpen={showModal}
        onClose={closeModal}
        onConfirm={handleConfirmDelete}
        content={"Are you sure you want to delete this ad group?"}
      />
    </div>
  );
}