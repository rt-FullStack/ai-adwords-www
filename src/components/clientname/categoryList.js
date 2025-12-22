"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { db } from "@/firebase/firebase";
import { useAuth } from "../authContext";
import { doc, deleteDoc, getDoc, updateDoc, collection, getDocs } from "firebase/firestore";
import Modal from "../modalConfirm";
import { FaArrowUp, FaTrash } from "react-icons/fa";
import { useRouter } from "next/navigation";
import ImportCopy from "@/components/clientname/importCopy";

export default function CategoryList({
  clientName,
  adGroupId,
  adTypeId,
  onCategoryDeleted,
}) {
  const [viewAllHeadlines, setViewAllHeadlines] = useState([]);
  const [viewAllDescriptions, setViewAllDescriptions] = useState([]);
  const [viewAllPaths, setViewAllPaths] = useState([]);
  const [viewAllFinalUrl, setViewAllFinalUrl] = useState([]);
  const [viewAllLabelValues, setViewAllLabelValues] = useState([]);
  const [isDataMarked, setIsDataMarked] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const { currentUser } = useAuth();
  const [adGroupStatus, setAdGroupStatus] = useState("");
  const [categoryNames, setCategoryNames] = useState([]);
  const [selectedHeadlines, setSelectedHeadlines] = useState([]);
  const [selectedDescriptions, setSelectedDescriptions] = useState([]);
  const [isCategoryChecked, setIsCategoryChecked] = useState({});
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(null);
  const [newListHeadlines, setNewListHeadlines] = useState([]);
  const [newListDescriptions, setNewListDescriptions] = useState([]);
  const [markedCategories, setMarkedCategories] = useState([]);

  const router = useRouter();
  const decodedClientName = decodeURIComponent(clientName);
  const decodedAdGroupId = decodeURIComponent(adGroupId);

  const fetchCategories = useCallback(async () => {
    try {
      if (currentUser && clientName && adGroupId && adTypeId) {
        const q = collection(
          db, 
          "clients", 
          currentUser.uid, 
          "client", 
          decodedClientName, 
          "adGroups",
          adGroupId,
          "adTypes",
          adTypeId,
          "categories"
        );
        const data = await getDocs(q);
        const categoryData = data.docs.map((doc) => ({
          id: doc.id,
          categoryName: doc.id,
          ...doc.data()
        }));
        setCategoryNames(categoryData);
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }, [currentUser, clientName, decodedClientName, adGroupId, adTypeId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const toggleCategoryVisibility = (categoryName) => {
    setIsOpen(isOpen === categoryName ? null : categoryName);
  };

  const handleCopyButtonClick = () => {
    setIsDataMarked(true);
  };

  const handleViewAdClick = (category) => {
    const url = `/client?clientName=${encodeURIComponent(clientName)}&adGroupId=${encodeURIComponent(
      adGroupId
    )}&categoryName=${encodeURIComponent(
      category.categoryName
    )}&viewAllHeadlines=${encodeURIComponent(JSON.stringify(category.headlineValues?.map(h => h.text) || []))}&viewAllDescriptions=${encodeURIComponent(
      JSON.stringify(category.descriptionValues?.map(d => d.text) || [])
    )}&viewAllFinalUrl=${encodeURIComponent(JSON.stringify(viewAllFinalUrl))}&viewAllPaths=${encodeURIComponent(
      JSON.stringify(viewAllPaths)
    )}&viewAllLabelValues=${encodeURIComponent(JSON.stringify(viewAllLabelValues))}`;

    router.push(url);
  };

  const handleCheckboxChange = (categoryName, type, index, checked) => {
    setIsCategoryChecked(prev => ({
      ...prev,
      [`${categoryName}_${type}`]: checked
    }));

    const category = categoryNames.find(c => c.categoryName === categoryName);
    if (!category) return;

    if (type === "category") {
      if (checked) {
        // Mark all headlines and descriptions
        const headlines = category.headlineValues?.map(h => h.text) || [];
        const descriptions = category.descriptionValues?.map(d => d.text) || [];
        
        setNewListHeadlines(prev => [...new Set([...prev, ...headlines.map(h => encodeURIComponent(h))])]);
        setNewListDescriptions(prev => [...new Set([...prev, ...descriptions.map(d => encodeURIComponent(d))])]);
      }
    } else if (type.startsWith("headline_")) {
      const headline = category.headlineValues[index]?.text;
      if (headline) {
        if (checked) {
          setNewListHeadlines(prev => [...new Set([...prev, encodeURIComponent(headline)])]);
        } else {
          setNewListHeadlines(prev => prev.filter(h => h !== encodeURIComponent(headline)));
        }
      }
    } else if (type.startsWith("description_")) {
      const description = category.descriptionValues[index]?.text;
      if (description) {
        if (checked) {
          setNewListDescriptions(prev => [...new Set([...prev, encodeURIComponent(description)])]);
        } else {
          setNewListDescriptions(prev => prev.filter(d => d !== encodeURIComponent(description)));
        }
      }
    }
  };

  const handleImportCopies = (importedHeadlines, importedDescriptions) => {
    try {
      const encodedHeadlines = importedHeadlines.map(h => encodeURIComponent(h));
      const encodedDescriptions = importedDescriptions.map(d => encodeURIComponent(d));
      
      setNewListHeadlines(prev => [...new Set([...prev, ...encodedHeadlines])]);
      setNewListDescriptions(prev => [...new Set([...prev, ...encodedDescriptions])]);
    } catch (error) {
      console.error("Error handling imported copy:", error);
    }
  };

  const handleRemoveItem = (index, type) => {
    if (type === "headline") {
      setNewListHeadlines(prev => prev.filter((_, idx) => idx !== index));
    } else if (type === "description") {
      setNewListDescriptions(prev => prev.filter((_, idx) => idx !== index));
    }
  };

  if (loading) {
    return <div>Loading categories...</div>;
  }

  return (
    <div className="flex justify-between">
      <div className="w-full">
        <div className="text-center font-bold text-3xl">
          <p>Campaign: {decodedAdGroupId}</p>
        </div>

        <div className="flex justify-between mt-6 -translate-x-9">
          <div className="flex flex-col">
            <h2 className="underline font-bold text-2xl mb-4">Ads:</h2>
            {categoryNames.map((category) => (
              <div className="flex" key={category.id}>
                <div className="overflow-hidden flex flex-col items-start text-slate-400 bg-slate-200 border rounded-md mb-4 w-100">
                  <div className="flex items-center justify-around w-full space-x-2 py-2">
                    <div
                      className={`font-semibold text-xl cursor-pointer select-none flex gap-5 items-center ${
                        isOpen === category.categoryName ? "font-bold" : ""
                      }`}
                      onClick={() => toggleCategoryVisibility(category.categoryName)}>
                      <p className="w-36">{category.categoryName}</p>
                      <span
                        className="flex items-center justify-center w-7 h-7 border border-gray-300 rounded-full hover:text-gray-600"
                        style={{ marginRight: "10px" }}>
                        <FaArrowUp
                          style={{
                            transform: `rotate(${isOpen === category.categoryName ? "0deg" : "180deg"})`,
                            transition: "transform 0.5s ease",
                            cursor: "pointer",
                          }}
                        />
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-slate-600">
                        {category.adGroupStatus === "enabled" ? "● Active" : "○ Paused"}
                      </span>
                      <div>
                        <button
                          onClick={() => handleViewAdClick(category)}
                          className="border mb-1 border-slate-600 bg-slate-700 hover:bg-slate-500 text-white rounded-md px-3 text-xs">
                          View Ad
                        </button>
                      </div>
                      <p className="text-xs">(Mark All)</p>
                      <label className="mt-1">
                        <input
                          type="checkbox"
                          checked={isCategoryChecked[`${category.categoryName}_category`] || false}
                          onChange={(e) => {
                            handleCheckboxChange(category.categoryName, "category", 0, e.target.checked);
                            handleCopyButtonClick();
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <div
                    className={`overflow-hidden transition-all duration-1000 ${
                      isOpen === category.categoryName ? "max-h-full ease-in" : "max-h-0 ease-out"
                    }`}>
                    {isOpen === category.categoryName && (
                      <div className="flex flex-col gap-3 py-2 px-6">
                        <div className="flex items-center gap-2">
                          <h3 className="underline">Headlines:</h3>
                          <label className="mt-1">
                            <input
                              type="checkbox"
                              checked={isCategoryChecked[`${category.categoryName}_headline`] || false}
                              onChange={(e) => handleCheckboxChange(category.categoryName, "headline", -2, e.target.checked)}
                            />
                          </label>
                        </div>

                        <ul className="flex flex-col gap-4">
                          {category.headlineValues?.map((headline, i) => (
                            <li key={i} className="flex items-center gap-2 justify-between">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isCategoryChecked[`${category.categoryName}_headline_${i}`] || false}
                                  onChange={(e) => handleCheckboxChange(category.categoryName, `headline_${i}`, i, e.target.checked)}
                                />
                                <div className="bg-slate-100 border border-slate-400 px-2">{headline.text}</div>
                              </div>
                              <button className="ml-2 text-red-500 hover:text-red-700 text-sm font-bold">
                                ✕
                              </button>
                            </li>
                          ))}
                        </ul>

                        {/* Descriptions section - similar structure to Headlines */}
                        <div className="flex items-center gap-2">
                          <h3 className="underline">Descriptions:</h3>
                          <label className="mt-1">
                            <input
                              type="checkbox"
                              checked={isCategoryChecked[`${category.categoryName}_description`] || false}
                              onChange={(e) => handleCheckboxChange(category.categoryName, "description", -2, e.target.checked)}
                            />
                          </label>
                        </div>
                        <ul className="flex flex-col gap-4">
                          {category.descriptionValues?.map((description, i) => (
                            <li key={i} className="flex items-center gap-2 justify-between">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isCategoryChecked[`${category.categoryName}_description_${i}`] || false}
                                  onChange={(e) => handleCheckboxChange(category.categoryName, `description_${i}`, i, e.target.checked)}
                                />
                                <div className="bg-slate-100 border border-slate-400 px-2">{description.text}</div>
                              </div>
                              <button className="ml-2 text-red-500 hover:text-red-700 text-sm font-bold">
                                ✕
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center mb-4 ml-2">
                  <button
                    onClick={() => {
                      setShowModal(true);
                    }}
                    className="border rounded-full px-2 items-center bg-red-500 hover:bg-red-700 text-white text-xl font-bold">
                    -
                  </button>
                </div>

                <Modal
                  isOpen={showModal}
                  onClose={() => setShowModal(false)}
                  onConfirm={async () => {
                    try {
                      const categoryRef = doc(
                        db,
                        "clients",
                        currentUser.uid,
                        "client",
                        decodedClientName,
                        "adGroups",
                        adGroupId,
                        "adTypes",
                        adTypeId,
                        "categories",
                        category.id
                      );
                      await deleteDoc(categoryRef);
                      onCategoryDeleted();
                    } catch (error) {
                      console.error("Error deleting category:", error);
                    }
                  }}
                  content={"Are you sure you want to delete this category?"}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col mt-7 ml-8">
        {markedCategories.map((category, index) => (
          <li key={index}>{category}</li>
        ))}
        
        {newListHeadlines.length > 0 && (
          <>
            <p className="font-bold underline text-2xl">Marked Headlines:</p>
            <ul className="w-96">
              {newListHeadlines
                .filter(headline => headline.trim() !== "")
                .map((headline, index) => (
                  <li key={index} className="mb-2 border-b rounded-sm py-2 border-b-slate-200 flex items-center justify-between">
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
                .filter(description => description.trim() !== "")
                .map((description, index) => (
                  <li key={index} className="mb-2 border-b rounded-sm py-2 border-b-slate-200 flex items-center justify-between">
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
          <Link
            className="border border-slate-600 bg-slate-700 hover:bg-slate-500 text-white rounded-lg px-3 py-2"
            href={`/client?newListHeadlines=${encodeURIComponent(
              JSON.stringify(newListHeadlines)
            )}&newListDescriptions=${encodeURIComponent(
              JSON.stringify(newListDescriptions)
            )}&clientName=${encodeURIComponent(clientName)}&adGroupId=${encodeURIComponent(adGroupId)}`}>
            Create a new ad
          </Link>
          
          <ImportCopy onImportCopies={handleImportCopies} />
        </div>
      </div>
    </div>
  );
}