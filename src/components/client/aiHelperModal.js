import React, { useState, useEffect, useRef } from "react";
import Button from "@/components/buttons";
import { collection, query, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/firebase/firebase";
import { useAuth } from "@/components/authContext";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { TbArrowsMoveVertical, TbCopy, TbCheck } from "react-icons/tb";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";

function AiHelperModal({ onClose, finalUrl, onSave, clientName }) {
  const { currentUser } = useAuth();
  const [position, setPosition] = useState({ x: window.innerWidth / 2 - 400, y: window.innerHeight / 2 - 300 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showTranslated, setShowTranslated] = useState(true);
  const [headlines, setHeadlines] = useState(
    Array(10)
      .fill("")
      .map((_, i) => ({ text: "", maxLength: 30, selected: false }))
  );
  const [descriptions, setDescriptions] = useState(
    Array(5)
      .fill("")
      .map((_, i) => ({ text: "", maxLength: 90, selected: false }))
  );
  const [translatedHeadlines, setTranslatedHeadlines] = useState(
    Array(10)
      .fill("")
      .map((_, i) => ({ text: `Translated Headline ${i + 1}`, maxLength: 30, selected: false }))
  );
  const [translatedDescriptions, setTranslatedDescriptions] = useState(
    Array(5)
      .fill("")
      .map((_, i) => ({ text: `Translated Description ${i + 1}`, maxLength: 90, selected: false }))
  );
  const [address, setAddress] = useState(finalUrl || "");
  const [tone, setTone] = useState("Creative");
  const [salesIntensity, setSalesIntensity] = useState("Informative");
  const [adsOutputLanguage, setAdsOutputLanguage] = useState("Swedish");
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [urlError, setUrlError] = useState(null);
  const controllerRef = useRef(null);

  const [formData, setFormData] = useState({
    url: finalUrl || "",
    tone: "Creative",
    salesIntensity: "Informative",
    language: "Swedish",
  });

  // Add a new state for translation language
  const [translationLanguage, setTranslationLanguage] = useState("Swedish");

  // Add the state for copied items back
  const [copiedItems, setCopiedItems] = useState(new Map());

  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const response = await fetch("https://restcountries.com/v3.1/all");
        const countries = await response.json();
        const languageSet = new Set();

        // Create a mapping of common language names to their ISO codes
        const commonLanguages = {
          Swedish: "sv",
          English: "en",
          Norwegian: "no",
          Danish: "da",
          Finnish: "fi",
          German: "de",
          French: "fr",
          Spanish: "es",
          Italian: "it",
          Dutch: "nl",
          Portuguese: "pt",
          Russian: "ru",
          Chinese: "zh",
          Japanese: "ja",
          Korean: "ko",
          Arabic: "ar",
          Hindi: "hi",
          Bengali: "bn",
          Polish: "pl",
          Romanian: "ro",
          Hungarian: "hu",
          Czech: "cs",
          Greek: "el",
          Bulgarian: "bg",
          Ukrainian: "uk",
          Hebrew: "he",
          Indonesian: "id",
          Malay: "ms",
          Thai: "th",
          Vietnamese: "vi",
          Turkish: "tr",
          Persian: "fa",
          Afrikaans: "af",
          Albanian: "sq",
          Amharic: "am",
          Armenian: "hy",
          Azerbaijani: "az",
          Basque: "eu",
          Belarusian: "be",
          Bosnian: "bs",
          Catalan: "ca",
          Cebuano: "ceb",
          Chichewa: "ny",
          "Chinese (Simplified)": "zh-CN",
          "Chinese (Traditional)": "zh-TW",
          Corsican: "co",
          Croatian: "hr",
          Esperanto: "eo",
          Estonian: "et",
          Filipino: "fil",
          Frisian: "fy",
          Galician: "gl",
          Georgian: "ka",
          Gujarati: "gu",
          "Haitian Creole": "ht",
          Hausa: "ha",
          Hawaiian: "haw",
          Hmong: "hmn",
          Icelandic: "is",
          Igbo: "ig",
          Irish: "ga",
          Javanese: "jw",
          Kannada: "kn",
          Kazakh: "kk",
          Khmer: "km",
          Kurdish: "ku",
          Kyrgyz: "ky",
          Lao: "lo",
          Latin: "la",
          Latvian: "lv",
          Lithuanian: "lt",
          Luxembourgish: "lb",
          Macedonian: "mk",
          Malagasy: "mg",
          Malayalam: "ml",
          Maltese: "mt",
          Maori: "mi",
          Marathi: "mr",
          Mongolian: "mn",
          Myanmar: "my",
          Nepali: "ne",
          Pashto: "ps",
          Punjabi: "pa",
          Samoan: "sm",
          "Scots Gaelic": "gd",
          Serbian: "sr",
          Sesotho: "st",
          Shona: "sn",
          Sindhi: "sd",
          Sinhala: "si",
          Slovak: "sk",
          Slovenian: "sl",
          Somali: "so",
          Sundanese: "su",
          Swahili: "sw",
          Tajik: "tg",
          Tamil: "ta",
          Telugu: "te",
          Uzbek: "uz",
          Welsh: "cy",
          Xhosa: "xh",
          Yiddish: "yi",
          Yoruba: "yo",
          Zulu: "zu",
        };

        // Add common languages first
        Object.keys(commonLanguages).forEach((lang) => languageSet.add(lang));

        // Then add other languages from the API
        countries.forEach((country) => {
          if (country.languages) {
            Object.values(country.languages).forEach((language) => {
              // Only add the language if it's not already in our common languages
              if (!commonLanguages[language]) {
                languageSet.add(language);
              }
            });
          }
        });
        setLanguages(Array.from(languageSet).sort());
      } catch (error) {
        // Fallback to common languages if API fails
        setLanguages(Object.keys(commonLanguages).sort());
      }
    };

    fetchLanguages();
  }, []);

  // Add this function to get the language code
  const getLanguageCode = (languageName) => {
    const languageCodes = {
      Swedish: "sv",
      English: "en",
      Norwegian: "no",
      Danish: "da",
      Finnish: "fi",
      German: "de",
      French: "fr",
      Spanish: "es",
      Italian: "it",
      Dutch: "nl",
      Portuguese: "pt",
      Russian: "ru",
      Chinese: "zh",
      Japanese: "ja",
      Korean: "ko",
      Arabic: "ar",
      Hindi: "hi",
      Bengali: "bn",
      Polish: "pl",
      Romanian: "ro",
      Hungarian: "hu",
      Czech: "cs",
      Greek: "el",
      Bulgarian: "bg",
      Ukrainian: "uk",
      Hebrew: "he",
      Indonesian: "id",
      Malay: "ms",
      Thai: "th",
      Vietnamese: "vi",
      Turkish: "tr",
      Persian: "fa",
      Afrikaans: "af",
      Albanian: "sq",
      Amharic: "am",
      Armenian: "hy",
      Azerbaijani: "az",
      Basque: "eu",
      Belarusian: "be",
      Bosnian: "bs",
      Catalan: "ca",
      Cebuano: "ceb",
      Chichewa: "ny",
      "Chinese (Simplified)": "zh-CN",
      "Chinese (Traditional)": "zh-TW",
      Corsican: "co",
      Croatian: "hr",
      Esperanto: "eo",
      Estonian: "et",
      Filipino: "fil",
      Frisian: "fy",
      Galician: "gl",
      Georgian: "ka",
      Gujarati: "gu",
      "Haitian Creole": "ht",
      Hausa: "ha",
      Hawaiian: "haw",
      Hmong: "hmn",
      Icelandic: "is",
      Igbo: "ig",
      Irish: "ga",
      Javanese: "jw",
      Kannada: "kn",
      Kazakh: "kk",
      Khmer: "km",
      Kurdish: "ku",
      Kyrgyz: "ky",
      Lao: "lo",
      Latin: "la",
      Latvian: "lv",
      Lithuanian: "lt",
      Luxembourgish: "lb",
      Macedonian: "mk",
      Malagasy: "mg",
      Malayalam: "ml",
      Maltese: "mt",
      Maori: "mi",
      Marathi: "mr",
      Mongolian: "mn",
      Myanmar: "my",
      Nepali: "ne",
      Pashto: "ps",
      Punjabi: "pa",
      Samoan: "sm",
      "Scots Gaelic": "gd",
      Serbian: "sr",
      Sesotho: "st",
      Shona: "sn",
      Sindhi: "sd",
      Sinhala: "si",
      Slovak: "sk",
      Slovenian: "sl",
      Somali: "so",
      Sundanese: "su",
      Swahili: "sw",
      Tajik: "tg",
      Tamil: "ta",
      Telugu: "te",
      Uzbek: "uz",
      Welsh: "cy",
      Xhosa: "xh",
      Yiddish: "yi",
      Yoruba: "yo",
      Zulu: "zu",
    };
    return languageCodes[languageName] || languageName.toLowerCase().substring(0, 2);
  };

  const toggleSelection = (type, index) => {
    switch (type) {
      case "headline":
        setHeadlines((prev) => prev.map((h, i) => (i === index ? { ...h, selected: !h.selected } : h)));
        break;
      case "description":
        setDescriptions((prev) => prev.map((d, i) => (i === index ? { ...d, selected: !d.selected } : d)));
        break;
      default:
        break;
    }
  };

  const toggleSelectAll = (type, selectAll) => {
    switch (type) {
      case "headline":
        setHeadlines((prev) => prev.map((h) => ({ ...h, selected: selectAll })));
        break;
      case "description":
        setDescriptions((prev) => prev.map((d) => ({ ...d, selected: selectAll })));
        break;
      default:
        break;
    }
  };

  const isValidUrl = (url) => {
    const pattern = /^https:\/\/([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/\S*)?$/;
    return pattern.test(url);
  };

  const handleGenerate = async () => {
    let formattedUrl = formData.url.trim();
    controllerRef.current = new AbortController();
    const { signal } = controllerRef.current;
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = "https://" + formattedUrl;
    }
    if (!isValidUrl(formattedUrl)) {
      setUrlError("Please enter a valid URL.");
      return;
    }
    setFormData((prev) => ({ ...prev, url: formattedUrl }));
    setUrlError(null);
    setLoading(true);

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
        return;
      }

      const userData = userDoc.data();
      if (!userData.aiSlots || userData.aiSlots <= 0) {
        toast.error(
          <div className="flex flex-col items-center">
            <div className="text-lg font-semibold mb-2">No AI Slots Available</div>
            <div className="text-sm text-gray-600">Please purchase more slots to continue using the AI content generator.</div>
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

      const response = await fetch("https://ai-adwords-263809614075.europe-north1.run.app/generate_ads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: formData.url.trim(),
          tone: formData.tone.toLowerCase(),
          sales_intensity: formData.salesIntensity.toLowerCase(),
          language: formData.language,
        }),
        mode: "cors",
        credentials: "same-origin",
        signal,
      });

      if (response.ok) {
        const result = await response.json();
        // Populate the headlines and descriptions with the data from the backend
        setHeadlines((prev) =>
          prev.map((h, i) => ({
            ...h,
            text: result.headlines[i] || `Headline ${i + 1}`,
          }))
        );
        setDescriptions((prev) =>
          prev.map((d, i) => ({
            ...d,
            text: result.descriptions[i] || `Description ${i + 1}`,
          }))
        );

        // Deduct one AI slot after successful generation
        await setDoc(
          userRef,
          {
            aiSlots: userData.aiSlots - 1,
          },
          { merge: true }
        );
      } else {
        toast.error("Failed to generate ads. Please try again.", {
          position: "top-center",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
        });
      }
    } catch (error) {
      toast.error("Error generating ads. Please try again.", {
        position: "top-center",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
      });
    } finally {
      setLoading(false);
      controllerRef.current = null;
    }
  };

  const handleAbort = () => {
    if (controllerRef.current) {
      controllerRef.current.abort(); // Abort the fetch request
      setLoading(false); // Stop the loading state
      controllerRef.current = null; // Clear the controller reference
    }
  };

  const handleGoogleTranslate = async (text, targetLanguage) => {
    try {
      const languageCode = getLanguageCode(targetLanguage);
      const response = await fetch("https://ai-adwords-263809614075.europe-north1.run.app/google_translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          target_language: languageCode,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        return result.translated_text;
      }
      throw new Error("Google Translate request failed");
    } catch (error) {
      console.warn("Google Translate fallback failed:", error);
      return null;
    }
  };

  const handleTranslate = async () => {
    const selectedHeadlineIndices = headlines
      .map((h, index) => ({ index, selected: h.selected, text: h.text }))
      .filter((h) => h.selected && h.text && !h.text.startsWith("Headline"));

    const selectedDescriptionIndices = descriptions
      .map((d, index) => ({ index, selected: d.selected, text: d.text }))
      .filter((d) => d.selected && d.text && !d.text.startsWith("Description"));

    if (selectedHeadlineIndices.length === 0 && selectedDescriptionIndices.length === 0) {
      alert("Please select at least one headline or description to translate");
      return;
    }

    setLoading(true);
    try {
      let headlineTranslations = new Map();
      let descriptionTranslations = new Map();

      // Use Google Translate for all translations
      for (const item of selectedHeadlineIndices) {
        const translatedText = await handleGoogleTranslate(item.text, translationLanguage);
        if (translatedText) {
          headlineTranslations.set(item.index, translatedText);
        } else {
          headlineTranslations.set(item.index, item.text);
        }
      }

      for (const item of selectedDescriptionIndices) {
        const translatedText = await handleGoogleTranslate(item.text, translationLanguage);
        if (translatedText) {
          descriptionTranslations.set(item.index, translatedText);
        } else {
          descriptionTranslations.set(item.index, item.text);
        }
      }

      // Update translated headlines
      setTranslatedHeadlines((prev) => {
        const updated = prev.map((item, index) => {
          if (headlineTranslations.has(index)) {
            return {
              ...item,
              text: headlineTranslations.get(index),
              selected: false,
            };
          }
          const keptText = item.text.startsWith("Translated Headline") ? "" : item.text;
          return {
            ...item,
            text: keptText,
            selected: false,
          };
        });
        return updated;
      });

      // Update translated descriptions
      setTranslatedDescriptions((prev) => {
        const updated = prev.map((item, index) => {
          if (descriptionTranslations.has(index)) {
            return {
              ...item,
              text: descriptionTranslations.get(index),
              selected: false,
            };
          }
          const keptText = item.text.startsWith("Translated Description") ? "" : item.text;
          return {
            ...item,
            text: keptText,
            selected: false,
          };
        });
        return updated;
      });
    } catch (error) {
      console.error("Translation error:", error);
      alert("An error occurred while translating. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    const selectedHeadlines = [...headlines.filter((headline) => headline.selected).map((headline) => headline.text)];
    const selectedDescriptions = [...descriptions.filter((description) => description.selected).map((description) => description.text)];
    onSave(selectedHeadlines, selectedDescriptions);
    onClose();
  };

  // Handle dragging functionality
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

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
  }, [isDragging]);

  // Add handleDragStart function
  const handleDragStart = (e, type, content) => {
    e.dataTransfer.setData("text/plain", content);
    e.dataTransfer.setData("type", type);
    e.dataTransfer.effectAllowed = "copy";
  };

  // Add this new function for internal reordering (keep all existing functions)
  const handleInternalDragEnd = (result) => {
    if (!result.destination) return;

    const reorder = (list, startIndex, endIndex) => {
      const result = Array.from(list);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    };

    if (result.type === "HEADLINES") {
      const reorderedHeadlines = reorder(headlines, result.source.index, result.destination.index);
      setHeadlines(reorderedHeadlines);

      // Keep translations in sync
      const reorderedTranslated = reorder(translatedHeadlines, result.source.index, result.destination.index);
      setTranslatedHeadlines(reorderedTranslated);
    } else if (result.type === "DESCRIPTIONS") {
      const reorderedDescriptions = reorder(descriptions, result.source.index, result.destination.index);
      setDescriptions(reorderedDescriptions);

      // Keep translations in sync
      const reorderedTranslated = reorder(translatedDescriptions, result.source.index, result.destination.index);
      setTranslatedDescriptions(reorderedTranslated);
    }
  };

  // Add the handleCopy function back
  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedItems((prev) => new Map(prev).set(id, true));
    setTimeout(() => {
      setCopiedItems((prev) => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
    }, 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50"
      style={{ pointerEvents: "none" }}>
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
          className="bg-gray-100 px-4 py-3 flex justify-between items-center cursor-move"
          onMouseDown={handleMouseDown}
          style={{ backgroundColor: "#f3f4f6" }}>
          <h2 className="text-lg font-semibold">AI Content Generator</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700">
            ×
          </button>
        </div>

        <div
          className="p-6 overflow-y-auto bg-white"
          style={{ maxHeight: "calc(80vh - 48px)" }}>
          {/* URL and Controls Section */}
          <div className="space-y-4 mb-6">
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-700">Website URL</label>
              <input
                type="text"
                value={formData.url}
                onChange={(e) => setFormData((prev) => ({ ...prev, url: e.target.value }))}
                className="border rounded-md p-2"
                placeholder="Enter website URL"
              />
              {urlError && <p className="text-red-500 text-sm">{urlError}</p>}
            </div>

            {/* Generation Controls */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Tone</label>
                <select
                  value={formData.tone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, tone: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                  <option>Creative</option>
                  <option>Professional</option>
                  <option>Casual</option>
                  <option>Formal</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Sales Intensity</label>
                <select
                  value={formData.salesIntensity}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      salesIntensity: e.target.value,
                    }))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                  <option>Informative</option>
                  <option>Moderate</option>
                  <option>Aggressive</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Generate Language</label>
                <select
                  value={formData.language}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      language: e.target.value,
                    }))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                  {languages.map((lang) => (
                    <option
                      key={lang}
                      value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">&nbsp;</label>
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className={`mt-1 w-full shadow-xl rounded-lg ${
                    loading ? "bg-gray-400 cursor-not-allowed" : "bg-gray-700 hover:bg-gray-500"
                  } text-slate-200 text-base px-5 py-2`}>
                  {loading ? (
                    <span>
                      Generating
                      <span className="loading-dots">
                        <span className="dot dot1">.</span>
                        <span className="dot dot2">.</span>
                        <span className="dot dot3">.</span>
                      </span>
                      <style jsx>{`
                        .loading-dots {
                          display: inline-block;
                        }
                        .dot {
                          opacity: 0;
                          animation: showDot 1.5s infinite;
                        }
                        .dot2 {
                          animation-delay: 0.5s;
                        }
                        .dot3 {
                          animation-delay: 1s;
                        }
                        @keyframes showDot {
                          0%,
                          100% {
                            opacity: 0;
                          }
                          50% {
                            opacity: 1;
                          }
                        }
                      `}</style>
                    </span>
                  ) : (
                    "Generate"
                  )}
                </button>
              </div>
            </div>

            {/* Translation Controls */}
            <div className="flex justify-end items-center space-x-4 mt-4">
              <select
                value={translationLanguage}
                onChange={(e) => setTranslationLanguage(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                {languages.map((lang) => (
                  <option
                    key={lang}
                    value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
              <button
                onClick={handleTranslate}
                disabled={loading}
                className="shadow-xl rounded-lg bg-gray-700 hover:bg-gray-500 text-slate-200 text-base px-5 py-2">
                Translate
              </button>
              <button
                onClick={() => setShowTranslated(!showTranslated)}
                className="text-blue-600 hover:text-blue-800 whitespace-nowrap">
                {showTranslated ? "Hide Translations" : "Show Translations"}
              </button>
            </div>
          </div>

          {/* Content Sections */}
          <div className="space-y-6">
            {/* Headlines and Translations Section */}
            <DragDropContext onDragEnd={handleInternalDragEnd}>
              <div className="flex gap-6">
                {/* Generated Headlines */}
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Headlines</h3>
                  <div className="flex items-center space-x-2 mb-2">
                    <input
                      type="checkbox"
                      onChange={(e) => toggleSelectAll("headline", e.target.checked)}
                      className="w-4 h-4"
                    />
                    <label className="text-sm font-medium text-gray-700">Select All</label>
                  </div>
                  <Droppable
                    droppableId="headlines"
                    type="HEADLINES">
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-2">
                        {headlines.map((headline, index) => (
                          <Draggable
                            key={`headline-${index}`}
                            draggableId={`headline-${index}`}
                            index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className="flex items-center space-x-2">
                                <div
                                  {...provided.dragHandleProps}
                                  className="cursor-move">
                                  <TbArrowsMoveVertical
                                    size={20}
                                    className="text-gray-400"
                                  />
                                </div>
                                <input
                                  type="checkbox"
                                  checked={headline.selected}
                                  onChange={() => toggleSelection("headline", index)}
                                  className="w-4 h-4"
                                />
                                <div
                                  className="flex-1"
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, "headline", headline.text)}>
                                  <div className="relative">
                                    <input
                                      type="text"
                                      value={headline.text}
                                      onChange={(e) => {
                                        const newText = e.target.value;
                                        setHeadlines((prev) => prev.map((h, i) => (i === index ? { ...h, text: newText } : h)));
                                      }}
                                      placeholder={`Headline ${index + 1}`}
                                      maxLength={headline.maxLength}
                                      className="w-full p-2 pr-10 bg-gray-50 rounded border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-move hover:bg-gray-100 transition-colors"
                                    />
                                    <button
                                      onClick={() => handleCopy(headline.text, `headline-${index}`)}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-all">
                                      <div
                                        className={`transform transition-all duration-200 ${
                                          copiedItems.get(`headline-${index}`) ? "scale-110" : ""
                                        }`}>
                                        {copiedItems.get(`headline-${index}`) ? (
                                          <TbCheck
                                            size={16}
                                            className="text-green-500"
                                          />
                                        ) : (
                                          <TbCopy size={16} />
                                        )}
                                      </div>
                                    </button>
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1 text-right">
                                    {headline.text.length}/{headline.maxLength}
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>

                {/* Translated Headlines (if shown) */}
                {showTranslated && (
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">Translated Headlines</h3>
                    <div className="space-y-2 mt-5">
                      {translatedHeadlines.map((headline, index) => (
                        <div
                          key={index}
                          draggable
                          onDragStart={(e) => handleDragStart(e, "headline", headline.text)}
                          className={`p-2 rounded min-h-[62px] flex items-center cursor-move transition-colors ${
                            headline.text.startsWith("⚠️")
                              ? "bg-yellow-50 hover:bg-yellow-100 border-l-4 border-yellow-400"
                              : "bg-green-50 hover:bg-green-100"
                          }`}>
                          {headline.text.startsWith("⚠️") ? (
                            <div className="flex items-center gap-2">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 text-yellow-500"
                                viewBox="0 0 20 20"
                                fill="currentColor">
                                <path
                                  fillRule="evenodd"
                                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              <span>{headline.text.substring(2)}</span>
                            </div>
                          ) : (
                            headline.text
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </DragDropContext>

            {/* Descriptions and Translations Section */}
            <DragDropContext onDragEnd={handleInternalDragEnd}>
              <div className="flex gap-6">
                {/* Generated Descriptions */}
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Descriptions</h3>
                  <div className="flex items-center space-x-2 mb-2">
                    <input
                      type="checkbox"
                      onChange={(e) => toggleSelectAll("description", e.target.checked)}
                      className="w-4 h-4"
                    />
                    <label className="text-sm font-medium text-gray-700">Select All</label>
                  </div>
                  <Droppable
                    droppableId="descriptions"
                    type="DESCRIPTIONS">
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-2">
                        {descriptions.map((description, index) => (
                          <Draggable
                            key={`description-${index}`}
                            draggableId={`description-${index}`}
                            index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className="flex items-center space-x-2">
                                <div
                                  {...provided.dragHandleProps}
                                  className="cursor-move">
                                  <TbArrowsMoveVertical
                                    size={20}
                                    className="text-gray-400"
                                  />
                                </div>
                                <input
                                  type="checkbox"
                                  checked={description.selected}
                                  onChange={() => toggleSelection("description", index)}
                                  className="w-4 h-4"
                                />
                                <div
                                  className="flex-1"
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, "description", description.text)}>
                                  <div className="relative">
                                    <textarea
                                      value={description.text}
                                      onChange={(e) => {
                                        const newText = e.target.value;
                                        setDescriptions((prev) => prev.map((d, i) => (i === index ? { ...d, text: newText } : d)));
                                      }}
                                      placeholder={`Description ${index + 1}`}
                                      maxLength={description.maxLength}
                                      rows={3}
                                      className="w-full p-2 pr-10 bg-gray-50 rounded border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none cursor-move hover:bg-gray-100 transition-colors"
                                    />
                                    <button
                                      onClick={() => handleCopy(description.text, `description-${index}`)}
                                      className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 transition-all">
                                      <div
                                        className={`transform transition-all duration-200 ${
                                          copiedItems.get(`description-${index}`) ? "scale-110" : ""
                                        }`}>
                                        {copiedItems.get(`description-${index}`) ? (
                                          <TbCheck
                                            size={16}
                                            className="text-green-500"
                                          />
                                        ) : (
                                          <TbCopy size={16} />
                                        )}
                                      </div>
                                    </button>
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1 text-right">
                                    {description.text.length}/{description.maxLength}
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>

                {/* Translated Descriptions (if shown) */}
                {showTranslated && (
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">Translated Descriptions</h3>
                    <div className="space-y-2 mt-9">
                      {translatedDescriptions.map((description, index) => (
                        <div
                          key={index}
                          draggable
                          onDragStart={(e) => handleDragStart(e, "description", description.text)}
                          className={`p-2 rounded min-h-[90px] cursor-move transition-colors !mb-[34px] ${
                            description.text.startsWith("⚠️")
                              ? "bg-yellow-50 hover:bg-yellow-100 border-l-4 border-yellow-400"
                              : "bg-green-50 hover:bg-green-100"
                          }`}>
                          {description.text.startsWith("⚠️") ? (
                            <div className="flex items-center gap-2">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 text-yellow-500"
                                viewBox="0 0 20 20"
                                fill="currentColor">
                                <path
                                  fillRule="evenodd"
                                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              <span>{description.text.substring(2)}</span>
                            </div>
                          ) : (
                            description.text
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </DragDropContext>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex justify-end space-x-4">
            <button
              onClick={onClose}
              className="shadow-xl rounded-lg bg-slate-300 hover:bg-slate-50 text-gray-800 text-base px-5 py-2">
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="shadow-xl rounded-lg bg-gray-700 hover:bg-gray-500 text-slate-200 text-base px-5 py-2">
              Save Selected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AiHelperModal;
