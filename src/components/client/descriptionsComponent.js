import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useEffect, useState } from "react";
import { TbArrowsMoveVertical } from "react-icons/tb";

const DescriptionsComponent = ({
  descriptionValues,
  setDescriptionValues,
  viewAllDescriptions,
  setViewAllDescriptions,
  useViewAllData,
  onDragEnd,
}) => {
  const [transformType, setTransformType] = useState("none"); // Track selected transformation type
  const [savedFormValues, setSavedFormValues] = useState([]); // Save the current form values
  const [isDropdownDisabled, setIsDropdownDisabled] = useState(true); // Manage dropdown state

  const onDescriptionDragEnd = async (result) => {
    onDragEnd(result, "DESCRIPTION");
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

  const toUpperCase = (text) => text.toUpperCase(); // New uppercase transformation

  const handleDropdownChange = (e) => {
    const selectedValue = e.target.value;
    setTransformType(selectedValue);

    if (selectedValue !== "none") {
      // Save current values before transforming
      if (savedFormValues.length === 0) setSavedFormValues([...descriptionValues]);

      const transformedValues = descriptionValues.map((description) => ({
        ...description,
        text:
          selectedValue === "capitalizeWords"
            ? capitalizeWords(description.text)
            : selectedValue === "capitalizeAfterDot"
            ? capitalizeWordsAfterDot(description.text)
            : selectedValue === "toLowerCase"
            ? toLowerCase(description.text)
            : toUpperCase(description.text), // Apply uppercase transformation
      }));
      setDescriptionValues(transformedValues);
    } else {
      // Restore saved form values when "none" is selected
      setDescriptionValues([...savedFormValues]);
      setSavedFormValues([]);
    }
  };

  const handleChangeDescription = (index, field, value) => {
    let updatedValue = value;

    // Apply transformations based on selected dropdown option
    if (transformType === "capitalizeWords") {
      updatedValue = capitalizeWords(value);
    } else if (transformType === "capitalizeAfterDot") {
      updatedValue = capitalizeWordsAfterDot(value);
    } else if (transformType === "toLowerCase") {
      updatedValue = toLowerCase(value);
    } else if (transformType === "toUpperCase") {
      updatedValue = toUpperCase(value); // Apply uppercase transformation
    }

    if (!useViewAllData) {
      const updatedDescriptionValues = [...descriptionValues];

      // Find the cursor position and store it before setting state
      const cursorPosition = document.activeElement.selectionStart;

      updatedDescriptionValues[index] = {
        ...updatedDescriptionValues[index],
        [field]: updatedValue,
      };
      setDescriptionValues(updatedDescriptionValues);

      // Restore the cursor position after the state update
      setTimeout(() => {
        if (
          document.activeElement.tagName === "TEXTAREA" ||
          (document.activeElement.tagName === "INPUT" && document.activeElement.type === "text")
        ) {
          document.activeElement.selectionStart = cursorPosition;
          document.activeElement.selectionEnd = cursorPosition;
        }
      }, 0);
    } else {
      const updatedViewAllDescriptions = [...viewAllDescriptions];
      updatedViewAllDescriptions[index] = updatedValue;
      setViewAllDescriptions(updatedViewAllDescriptions);
    }
  };

  // Enable or disable the dropdown based on whether there is any text in the form
  useEffect(() => {
    const hasTextInForm = descriptionValues.some((description) => typeof description.text === "string" && description.text.trim() !== "");
    setIsDropdownDisabled(!hasTextInForm);
  }, [descriptionValues]);

  // Enhanced drop handler to handle drops from the import panel
  const handleDrop = (e, index) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("type");
    const content = e.dataTransfer.getData("text/plain");

    if (type === "description") {
      const updatedDescriptionValues = [...descriptionValues];
      updatedDescriptionValues[index] = {
        ...updatedDescriptionValues[index],
        text: content,
      };
      setDescriptionValues(updatedDescriptionValues);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  // Move isDuplicate function outside of handleDragOver
  const isDuplicate = (text, index) => {
    if (!text) return false;
    const normalizedText = text.trim().toLowerCase();
    return descriptionValues.some((d, i) => i !== index && d.text?.trim().toLowerCase() === normalizedText);
  };

  return (
    <div>
      <div className="mb-5 translate-x-7">
        <label className="text-center flex font-nunito gap-1">
          Description Text Format:
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

      <DragDropContext onDragEnd={onDescriptionDragEnd}>
        <Droppable droppableId="description-droppable">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}>
              {descriptionValues.map((description, index) => {
                const extraDescriptionsTitle =
                  index === 4 ? <div className="mt-6 mb-2 font-semibold text-gray-700 ml-8">Extra Descriptions</div> : null;

                return (
                  <div key={description.id}>
                    {extraDescriptionsTitle}
                    <Draggable
                      key={description.id}
                      draggableId={description.id}
                      index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}>
                          <div className="flex gap-1 mr-10">
                            <div className="relative flex gap-1">
                              <TbArrowsMoveVertical
                                size={25}
                                className="text-gray-400"
                              />
                              <div className="flex flex-col mb-5 relative">
                                <textarea
                                  value={useViewAllData ? viewAllDescriptions[index] : descriptionValues[index].text || ""}
                                  placeholder={`Description ${index + 1}...`}
                                  onChange={(e) => handleChangeDescription(index, "text", e.target.value)}
                                  onDrop={(e) => handleDrop(e, index)}
                                  onDragOver={handleDragOver}
                                  className={`input-field focus:outline-none pl-1.5 ${
                                    (description.text || viewAllDescriptions[index])?.length > 90
                                      ? "border-2 !border-red-500 py-1 w-96 rounded-sm shadow-md"
                                      : index >= 4
                                      ? "border-2 py-1 w-96 rounded-sm shadow-md"
                                      : "border-2 !border-green-500 py-1 w-96 rounded-sm shadow-md"
                                  }`}
                                />
                                {isDuplicate(description.text, index) && (
                                  <span className="text-red-500 text-xs absolute bottom-0 translate-y-4">Description already exists</span>
                                )}
                              </div>
                              <span
                                className={`text-xs absolute right-2 ${
                                  (description.text || viewAllDescriptions[index])?.length > 90 ? "text-red-600 font-bold" : "text-gray-400"
                                }`}>
                                {(useViewAllData ? viewAllDescriptions[index] : description.text || "").length}/90
                              </span>
                            </div>
                            <div>
                              <input
                                type="number"
                                value={useViewAllData ? "" : description.pin || ""}
                                onChange={(e) => {
                                  const updatedDescriptionValues = [...descriptionValues];
                                  updatedDescriptionValues[index] = {
                                    ...updatedDescriptionValues[index],
                                    pin: e.target.value,
                                  };
                                  setDescriptionValues(updatedDescriptionValues);
                                }}
                                max="2"
                                min="1"
                                className="input-field bg-white mb-5 py-1 text-center rounded-sm shadow-md"
                              />
                            </div>
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

export default DescriptionsComponent;
