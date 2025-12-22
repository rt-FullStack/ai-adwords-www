"use client";
import { useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function KeywordCombiner() {
  const [matchType, setMatchType] = useState("broad");
  const [column1, setColumn1] = useState("");
  const [column2, setColumn2] = useState("");
  const [column3, setColumn3] = useState("");
  const [combinationType, setCombinationType] = useState("2-3");
  const [results, setResults] = useState([]);
  const [options, setOptions] = useState({
    noShuffle: false,
    useComma: false,
    allowDuplicates: false,
    noSpaceBetween: false,
    onlyNoSpace: false,
  });
  const [sortOption, setSortOption] = useState("default");
  const [matchTypes, setMatchTypes] = useState({
    broad: true, // Default selected
    phrase: false,
    exact: false,
  });
  const [showCopied, setShowCopied] = useState(false);

  // First, add a helper function to normalize spaces
  const normalizeSpaces = (text) => {
    return text.replace(/\s+/g, " ").trim();
  };

  const combineKeywords = () => {
    const words1 = column1.split("\n").filter((word) => word.trim());
    const words2 = column2.split("\n").filter((word) => word.trim());
    const words3 = column3.split("\n").filter((word) => word.trim());
    let combinations = [];

    switch (combinationType) {
      case "1-2":
        // Individual words
        combinations.push(...words1, ...words2);

        // Combinations of two words
        words1.forEach((word1) => {
          words2.forEach((word2) => {
            if (!options.noSpaceBetween) {
              combinations.push(`${word1} ${word2}`);
              if (!options.noShuffle) {
                combinations.push(`${word2} ${word1}`);
              }
            }
            if (options.onlyNoSpace || options.noSpaceBetween) {
              combinations.push(`${word1}${word2}`);
              if (!options.noShuffle) {
                combinations.push(`${word2}${word1}`);
              }
            }
          });
        });
        break;

      case "only-2":
        // Only combinations of two words
        words1.forEach((word1) => {
          words2.forEach((word2) => {
            if (!options.noSpaceBetween) {
              combinations.push(`${word1} ${word2}`);
              if (!options.noShuffle) {
                combinations.push(`${word2} ${word1}`);
              }
            }
            if (options.onlyNoSpace || options.noSpaceBetween) {
              combinations.push(`${word1}${word2}`);
              if (!options.noShuffle) {
                combinations.push(`${word2}${word1}`);
              }
            }
          });
        });
        break;

      case "2-3":
        // Combinations of two words (all possible pairs)
        words1.forEach((word1) => {
          words2.forEach((word2) => {
            if (!options.noSpaceBetween) {
              combinations.push(`${word1} ${word2}`);
              if (!options.noShuffle) {
                combinations.push(`${word2} ${word1}`);
              }
            }
            if (options.onlyNoSpace || options.noSpaceBetween) {
              combinations.push(`${word1}${word2}`);
              if (!options.noShuffle) {
                combinations.push(`${word2}${word1}`);
              }
            }
          });
        });

        // Additional pairs with column 3
        words1.forEach((word1) => {
          words3.forEach((word3) => {
            if (!options.noSpaceBetween) {
              combinations.push(`${word1} ${word3}`);
              if (!options.noShuffle) {
                combinations.push(`${word3} ${word1}`);
              }
            }
            if (options.onlyNoSpace || options.noSpaceBetween) {
              combinations.push(`${word1}${word3}`);
              if (!options.noShuffle) {
                combinations.push(`${word3}${word1}`);
              }
            }
          });
        });

        words2.forEach((word2) => {
          words3.forEach((word3) => {
            if (!options.noSpaceBetween) {
              combinations.push(`${word2} ${word3}`);
              if (!options.noShuffle) {
                combinations.push(`${word3} ${word2}`);
              }
            }
            if (options.onlyNoSpace || options.noSpaceBetween) {
              combinations.push(`${word2}${word3}`);
              if (!options.noShuffle) {
                combinations.push(`${word3}${word2}`);
              }
            }
          });
        });

        // Combinations of three words
        words1.forEach((word1) => {
          words2.forEach((word2) => {
            words3.forEach((word3) => {
              if (!options.noSpaceBetween) {
                combinations.push(`${word1} ${word2} ${word3}`);
                if (!options.noShuffle) {
                  combinations.push(`${word3} ${word2} ${word1}`);
                  combinations.push(`${word2} ${word3} ${word1}`);
                  combinations.push(`${word1} ${word3} ${word2}`);
                  combinations.push(`${word2} ${word1} ${word3}`);
                  combinations.push(`${word3} ${word1} ${word2}`);
                }
              }
              if (options.onlyNoSpace || options.noSpaceBetween) {
                combinations.push(`${word1}${word2}${word3}`);
                if (!options.noShuffle) {
                  combinations.push(`${word3}${word2}${word1}`);
                  combinations.push(`${word2}${word3}${word1}`);
                  combinations.push(`${word1}${word3}${word2}`);
                  combinations.push(`${word2}${word1}${word3}`);
                  combinations.push(`${word3}${word1}${word2}`);
                }
              }
            });
          });
        });
        break;

      case "1-2-3":
        // Individual words
        combinations.push(...words1, ...words2, ...words3);

        // Combinations of two words (all possible pairs)
        words1.forEach((word1) => {
          words2.forEach((word2) => {
            if (!options.noSpaceBetween) {
              combinations.push(`${word1} ${word2}`);
              if (!options.noShuffle) {
                combinations.push(`${word2} ${word1}`);
              }
            }
            if (options.onlyNoSpace || options.noSpaceBetween) {
              combinations.push(`${word1}${word2}`);
              if (!options.noShuffle) {
                combinations.push(`${word2}${word1}`);
              }
            }
          });
        });

        // Additional pairs with column 3
        words1.forEach((word1) => {
          words3.forEach((word3) => {
            if (!options.noSpaceBetween) {
              combinations.push(`${word1} ${word3}`);
              if (!options.noShuffle) {
                combinations.push(`${word3} ${word1}`);
              }
            }
            if (options.onlyNoSpace || options.noSpaceBetween) {
              combinations.push(`${word1}${word3}`);
              if (!options.noShuffle) {
                combinations.push(`${word3}${word1}`);
              }
            }
          });
        });

        words2.forEach((word2) => {
          words3.forEach((word3) => {
            if (!options.noSpaceBetween) {
              combinations.push(`${word2} ${word3}`);
              if (!options.noShuffle) {
                combinations.push(`${word3} ${word2}`);
              }
            }
            if (options.onlyNoSpace || options.noSpaceBetween) {
              combinations.push(`${word2}${word3}`);
              if (!options.noShuffle) {
                combinations.push(`${word3}${word2}`);
              }
            }
          });
        });

        // Combinations of three words (all permutations)
        words1.forEach((word1) => {
          words2.forEach((word2) => {
            words3.forEach((word3) => {
              if (!options.noSpaceBetween) {
                combinations.push(`${word1} ${word2} ${word3}`);
                if (!options.noShuffle) {
                  combinations.push(`${word3} ${word2} ${word1}`);
                  combinations.push(`${word2} ${word3} ${word1}`);
                  combinations.push(`${word1} ${word3} ${word2}`);
                  combinations.push(`${word2} ${word1} ${word3}`);
                  combinations.push(`${word3} ${word1} ${word2}`);
                }
              }
              if (options.onlyNoSpace || options.noSpaceBetween) {
                combinations.push(`${word1}${word2}${word3}`);
                if (!options.noShuffle) {
                  combinations.push(`${word3}${word2}${word1}`);
                  combinations.push(`${word2}${word3}${word1}`);
                  combinations.push(`${word1}${word3}${word2}`);
                  combinations.push(`${word2}${word1}${word3}`);
                  combinations.push(`${word3}${word1}${word2}`);
                }
              }
            });
          });
        });
        break;

      case "only-3":
        // Only combinations using all three columns
        words1.forEach((word1) => {
          words2.forEach((word2) => {
            words3.forEach((word3) => {
              if (!options.noSpaceBetween) {
                combinations.push(`${word1} ${word2} ${word3}`);
                if (!options.noShuffle) {
                  combinations.push(`${word3} ${word2} ${word1}`);
                  combinations.push(`${word2} ${word3} ${word1}`);
                  combinations.push(`${word1} ${word3} ${word2}`);
                  combinations.push(`${word2} ${word1} ${word3}`);
                  combinations.push(`${word3} ${word1} ${word2}`);
                }
              }
              if (options.onlyNoSpace || options.noSpaceBetween) {
                combinations.push(`${word1}${word2}${word3}`);
                if (!options.noShuffle) {
                  combinations.push(`${word3}${word2}${word1}`);
                  combinations.push(`${word2}${word3}${word1}`);
                  combinations.push(`${word1}${word3}${word2}`);
                  combinations.push(`${word2}${word1}${word3}`);
                  combinations.push(`${word3}${word1}${word2}`);
                }
              }
            });
          });
        });
        break;
    }

    // Remove duplicates if not allowed
    if (!options.allowDuplicates) {
      combinations = [...new Set(combinations)];
    }

    // Apply selected match types and add commas if enabled
    let broadMatches = [];
    let phraseMatches = [];
    let exactMatches = [];

    combinations.forEach((keyword) => {
      // Normalize spaces before adding match type syntax
      const normalizedKeyword = normalizeSpaces(keyword);

      // Sort into different match type arrays
      if (matchTypes.broad) {
        broadMatches.push(normalizedKeyword);
      }
      if (matchTypes.phrase) {
        phraseMatches.push(`"${normalizedKeyword}"`);
      }
      if (matchTypes.exact) {
        exactMatches.push(`[${normalizedKeyword}]`);
      }
    });

    // Add commas if enabled
    if (options.useComma) {
      broadMatches = broadMatches.map((keyword) => `${keyword},`);
      phraseMatches = phraseMatches.map((keyword) => `${keyword},`);
      exactMatches = exactMatches.map((keyword) => `${keyword},`);
    }

    // Combine all matches in the desired order
    const formattedCombinations = [...broadMatches, ...phraseMatches, ...exactMatches];

    setResults(formattedCombinations);
  };

  const getSortedResults = () => {
    switch (sortOption) {
      case "asc":
        return [...results].sort((a, b) => a.localeCompare(b));
      case "desc":
        return [...results].sort((a, b) => b.localeCompare(a));
      case "length-asc":
        return [...results].sort((a, b) => a.length - b.length);
      case "length-desc":
        return [...results].sort((a, b) => b.length - a.length);
      default:
        return results;
    }
  };

  // Add a function to determine which columns are active
  const getActiveColumns = (type) => {
    switch (type) {
      case "1-2":
        return { col1: true, col2: true, col3: false };
      case "only-2":
        return { col1: true, col2: true, col3: false };
      case "2-3":
        return { col1: true, col2: true, col3: true };
      case "1-2-3":
        return { col1: true, col2: true, col3: true };
      case "only-3":
        return { col1: true, col2: true, col3: true };
      default:
        return { col1: false, col2: false, col3: false };
    }
  };

  const handleCopy = async () => {
    const textToCopy = getSortedResults().join("\n");
    try {
      await navigator.clipboard.writeText(textToCopy);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000); // Hide after 2 seconds
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col items-center py-10 px-4">
        <h1 className="text-3xl font-bold mb-6">Keyword Combination Tool</h1>
        <div className="bg-white p-6 w-full max-w-[60rem] rounded-lg shadow-md">
          <div className="grid grid-cols-3 gap-6">
            <div>
              <label className={`font-bold ${getActiveColumns(combinationType).col1 ? "text-blue-600" : ""}`}>Column 1:</label>
              <textarea
                className={`mt-2 w-full p-2 border rounded resize-none overflow-hidden
                  ${
                    getActiveColumns(combinationType).col1 ? "border-blue-500 bg-blue-50 focus:ring-2 focus:ring-blue-500" : "border-gray-300"
                  }`}
                value={column1}
                onChange={(e) => setColumn1(e.target.value)}
                style={{ minHeight: "6.5rem" }}
                ref={(textarea) => {
                  if (textarea) {
                    textarea.style.height = Math.max(88, textarea.scrollHeight) + "px";
                  }
                }}
              />
            </div>
            <div>
              <label className={`font-bold ${getActiveColumns(combinationType).col2 ? "text-blue-600" : ""}`}>Column 2:</label>
              <textarea
                className={`mt-2 w-full p-2 border rounded resize-none overflow-hidden
                  ${
                    getActiveColumns(combinationType).col2 ? "border-blue-500 bg-blue-50 focus:ring-2 focus:ring-blue-500" : "border-gray-300"
                  }`}
                value={column2}
                onChange={(e) => setColumn2(e.target.value)}
                style={{ minHeight: "6.5rem" }}
                ref={(textarea) => {
                  if (textarea) {
                    textarea.style.height = Math.max(88, textarea.scrollHeight) + "px";
                  }
                }}
              />
            </div>
            <div>
              <label className={`font-bold ${getActiveColumns(combinationType).col3 ? "text-blue-600" : ""}`}>Column 3 (optional):</label>
              <textarea
                className={`mt-2 w-full p-2 border rounded resize-none overflow-hidden
                  ${
                    getActiveColumns(combinationType).col3 ? "border-blue-500 bg-blue-50 focus:ring-2 focus:ring-blue-500" : "border-gray-300"
                  }`}
                value={column3}
                onChange={(e) => setColumn3(e.target.value)}
                style={{ minHeight: "6.5rem" }}
                ref={(textarea) => {
                  if (textarea) {
                    textarea.style.height = Math.max(88, textarea.scrollHeight) + "px";
                  }
                }}
              />
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {[
              ["noShuffle", "No shuffle keywords"],
              ["useComma", "Comma Separator"],
              ["allowDuplicates", "Allow Duplicate Words"],
              ["noSpaceBetween", "No Space Between Words"],
              ["onlyNoSpace", "Only No Space Between Words"],
            ].map(([key, label]) => (
              <div
                key={key}
                className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={options[key]}
                  onChange={() => setOptions((prev) => ({ ...prev, [key]: !prev[key] }))}
                  className="w-4 h-4"
                />
                <label>{label}</label>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-2">
            {["1-2", "only-2", "2-3", "1-2-3", "only-3"].map((type) => (
              <div
                key={type}
                className="flex items-center gap-2">
                <input
                  type="radio"
                  name="combination"
                  value={type}
                  checked={combinationType === type}
                  onChange={(e) => setCombinationType(e.target.value)}
                  className="w-4 h-4"
                />
                <label>
                  {type.startsWith("only")
                    ? `Combination with ${type.replace("only-", "")} columns only`
                    : `Combination with ${type.replace(/-/g, " and ")} columns`}
                </label>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <label className="font-bold">Match types:</label>
            <div className="mt-2 space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={matchTypes.broad}
                  onChange={(e) => setMatchTypes((prev) => ({ ...prev, broad: e.target.checked }))}
                  className="rounded"
                />
                <span>Broad match (keyword)</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={matchTypes.phrase}
                  onChange={(e) => setMatchTypes((prev) => ({ ...prev, phrase: e.target.checked }))}
                  className="rounded"
                />
                <span>Phrase match ("keyword")</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={matchTypes.exact}
                  onChange={(e) => setMatchTypes((prev) => ({ ...prev, exact: e.target.checked }))}
                  className="rounded"
                />
                <span>Exact match ([keyword])</span>
              </label>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <button
              onClick={combineKeywords}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md">
              Combine
            </button>
          </div>

          {results.length > 0 && (
            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h2 className="font-bold">Results:</h2>
                  <span className="text-gray-400 text-sm">{results.length} Combinations</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="relative p-2 text-gray-600 hover:text-blue-600 transition-colors"
                    title="Copy to clipboard">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    {showCopied && (
                      <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded">
                        Copied!
                      </span>
                    )}
                  </button>
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    className="p-1 border rounded text-sm">
                    <option value="default">Default order</option>
                    <option value="asc">Alphabetical (A-Z)</option>
                    <option value="desc">Alphabetical (Z-A)</option>
                    <option value="length-asc">Length (Shortest first)</option>
                    <option value="length-desc">Length (Longest first)</option>
                  </select>
                </div>
              </div>
              <textarea
                className="w-full p-2 border rounded resize-none overflow-hidden"
                value={getSortedResults().join("\n")}
                readOnly
                style={{ height: "auto", minHeight: "100px" }}
                ref={(textarea) => {
                  if (textarea) {
                    textarea.style.height = "auto";
                    textarea.style.height = textarea.scrollHeight + "px";
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
