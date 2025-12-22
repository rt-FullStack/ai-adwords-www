import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useEffect, useState } from "react";
import { TbArrowsMoveVertical } from "react-icons/tb";

const HeadlinesComponent = ({ headlineValues, setHeadlineValues, viewAllHeadlines, setViewAllHeadlines, useViewAllData, onDragEnd }) => {
  const [transformType, setTransformType] = useState("none"); // Track selected transformation type
  const [savedFormValues, setSavedFormValues] = useState([]); // Save the current form values
  const [isDropdownDisabled, setIsDropdownDisabled] = useState(true); // Disable dropdown initially

  // Add function to calculate effective length
  const getEffectiveLength = (text) => {
    if (!text) return 0;
    // If text starts with {Keyword: and ends with }, exclude those from the count
    if (text.startsWith("{Keyword:") && text.endsWith("}")) {
      return text.slice(9, -1).length;
    }
    return text.length;
  };

  const onHeadlinesDragEnd = async (result) => {
    onDragEnd(result, "HEADLINE");
  };

  // Utility functions for text transformations
  const capitalizeWords = (text) => {
    return text
      .split(/\s+/)
      .map((word) => (word.length > 0 ? word[0].toUpperCase() + word.slice(1) : word))
      .join(" ");
  };

  const capitalizeWordsAfterDot = (text) => {
    return text.replace(/(\.\s)([a-zåäö])/giu, (match, punctuation, letter) => {
      return punctuation + letter.toUpperCase();
    });
  };

  const toLowerCase = (text) => text.toLowerCase();
  const toUpperCase = (text) => text.toUpperCase(); // New transformation function

  const handleDropdownChange = (e) => {
    const selectedValue = e.target.value;
    setTransformType(selectedValue);

    if (selectedValue !== "none") {
      // Save the current values only if not empty
      if (savedFormValues.length === 0) setSavedFormValues([...headlineValues]);

      const transformedValues = headlineValues.map((headline) => ({
        ...headline,
        text:
          selectedValue === "capitalizeWords"
            ? capitalizeWords(headline.text)
            : selectedValue === "capitalizeAfterDot"
            ? capitalizeWordsAfterDot(headline.text)
            : selectedValue === "toLowerCase"
            ? toLowerCase(headline.text)
            : selectedValue === "toUpperCase"
            ? toUpperCase(headline.text)
            : headline.text, // Default to original text
      }));
      setHeadlineValues(transformedValues);
    } else {
      // Restore saved form values when "none" is selected
      setHeadlineValues([...savedFormValues]);
      setSavedFormValues([]);
    }
  };

  const handleChangeHeadline = (index, field, value) => {
    const updatedValue =
      transformType === "capitalizeWords"
        ? capitalizeWords(value)
        : transformType === "capitalizeAfterDot"
        ? capitalizeWordsAfterDot(value)
        : transformType === "toLowerCase"
        ? toLowerCase(value)
        : transformType === "toUpperCase"
        ? toUpperCase(value)
        : value; // Default to original text if "none"

    if (!useViewAllData) {
      const updatedHeadlineValues = [...headlineValues];

      // Store the cursor position before updating state
      const cursorPosition = document.activeElement.selectionStart;

      updatedHeadlineValues[index] = {
        ...updatedHeadlineValues[index],
        [field]: updatedValue,
      };
      setHeadlineValues(updatedHeadlineValues);

      // Restore the cursor position after updating state
      setTimeout(() => {
        const activeElement = document.activeElement;
        if (activeElement.tagName === "INPUT" && activeElement.type === "text") {
          activeElement.setSelectionRange(cursorPosition, cursorPosition);
        }
      }, 0);
    } else {
      const updatedViewAllHeadlines = [...viewAllHeadlines];
      updatedViewAllHeadlines[index] = updatedValue;
      setViewAllHeadlines(updatedViewAllHeadlines);
    }
  };

  // Enable or disable the dropdown based on whether there is any text in the form
  useEffect(() => {
    const hasTextInForm = headlineValues.some((headline) => typeof headline.text === "string" && headline.text.trim() !== "");
    setIsDropdownDisabled(!hasTextInForm);
  }, [headlineValues]);

  // Enhanced drop handler to handle drops from the import panel
  const handleDrop = (e, index) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("type");
    const content = e.dataTransfer.getData("text/plain");

    if (type === "headline") {
      const updatedHeadlineValues = [...headlineValues];
      updatedHeadlineValues[index] = {
        ...updatedHeadlineValues[index],
        text: content,
      };
      setHeadlineValues(updatedHeadlineValues);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  // Add this function to check for duplicates
  const isDuplicate = (text, index) => {
    if (!text) return false;
    const normalizedText = text.trim().toLowerCase();
    return headlineValues.some((h, i) => i !== index && h.text?.trim().toLowerCase() === normalizedText);
  };

  return (
    <div>
      <div className="mb-5 translate-x-7">
        <label className="text-center flex font-nunito gap-1">
          Headline Text Format:
          <select
            value={transformType}
            onChange={handleDropdownChange}
            disabled={isDropdownDisabled}
            className={`${isDropdownDisabled ? "cursor-not-allowed opacity-50" : ""}`}>
            <option value="none">None (original)</option>
            <option value="capitalizeWords">Sentence Case All Words</option>
            <option value="toLowerCase">Lowercase all letters</option>
            <option value="capitalizeAfterDot">Capital after. Dot</option>
            <option value="toUpperCase">Uppercase all letters</option>
          </select>
        </label>
      </div>

      <DragDropContext onDragEnd={onHeadlinesDragEnd}>
        <Droppable droppableId="headline-droppable">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}>
              {headlineValues.map((headline, index) => {
                // Lägg till rubrik efter de första 15 rutorna
                const extraHeadlinesTitle =
                  index === 15 ? <div className="mt-6 mb-2 font-semibold text-gray-700 ml-8">Extra Headlines</div> : null;

                return (
                  <div key={headline.id}>
                    {extraHeadlinesTitle}
                    <Draggable
                      key={headline.id}
                      draggableId={headline.id}
                      index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}>
                          <div className="flex gap-1 mr-10">
                            <div className="relative flex flex-col gap-1">
                              <div className="flex gap-1">
                                <TbArrowsMoveVertical
                                  size={25}
                                  className="text-gray-400"
                                />
                                <div className="flex flex-col">
                                  <input
                                    type="text"
                                    value={useViewAllData ? viewAllHeadlines[index] || "" : headlineValues[index].text || ""}
                                    placeholder={`Headline ${index + 1}...`}
                                    onChange={(e) => handleChangeHeadline(index, "text", e.target.value)}
                                    onDrop={(e) => handleDrop(e, index)}
                                    onDragOver={handleDragOver}
                                    className={`input-field focus:outline-none pl-1.5 ${
                                      getEffectiveLength(headline.text || viewAllHeadlines[index]) > 30
                                        ? "!border-2 !border-red-500 py-1 w-80 rounded-sm shadow-md"
                                        : index >= 15
                                        ? "border-2 py-1 w-80 rounded-sm shadow-md"
                                        : "border-2 !border-green-500 py-1 w-80 rounded-sm shadow-md"
                                    }`}
                                  />

                                  {isDuplicate(headline.text, index) && (
                                    <span className="text-red-500 text-xs mt-1">Headline already exists</span>
                                  )}
                                </div>
                                <span
                                  className={`text-xs absolute right-2 ${
                                    getEffectiveLength(headline.text || viewAllHeadlines[index]) > 30
                                      ? "text-red-600 font-bold"
                                      : "text-gray-400"
                                  }`}>
                                  {getEffectiveLength(useViewAllData ? viewAllHeadlines[index] : headline.text || "")}/30
                                </span>
                              </div>
                            </div>
                            <input
                              type="number"
                              value={useViewAllData ? "" : headline.pin || ""}
                              onChange={(e) => {
                                const updatedHeadlineValues = [...headlineValues];
                                updatedHeadlineValues[index] = {
                                  ...updatedHeadlineValues[index],
                                  pin: e.target.value,
                                };
                                setHeadlineValues(updatedHeadlineValues);
                              }}
                              max="3"
                              min="1"
                              className="input-field bg-white mb-5 py-1 text-center rounded-sm shadow-md"
                            />
                          </div>
                        </div>
                      )}
                    </Draggable>
                  </div>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};

export default HeadlinesComponent;
