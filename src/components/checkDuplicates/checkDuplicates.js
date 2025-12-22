import React from "react";
import Button from "@/components/buttons";

function DuplicateChecker({
  adType,
  headlineValues,
  descriptionValues,
  pathValues,
  finalUrlValues,
  setIsCopying,
  setDuplicateModalOpen,
  setModalContent,
  copyFieldValues,
  selectedOptionValues,
  clientStatus,
  campaignStatus,
  adGroupStatus,
  adStatus,
}) {
  function getNonEmptyTexts(values) {
    if (!Array.isArray(values)) {
      return [];
    }
    // Return both text and pin values
    return values.map((item) => ({
      text: item.text || "",
      pin: item.pin || "", // Include pin value
    }));
  }

  // Duplicate checking function
  const checkForDuplicates = () => {
    const allTextValues = [
      // Don't include adType in duplicate check since it's a string
      ...getNonEmptyTexts(headlineValues),
      ...getNonEmptyTexts(descriptionValues),
      ...getNonEmptyTexts(pathValues),
      ...getNonEmptyTexts(finalUrlValues),
    ].map((item) => item.text); // Only check text values for duplicates

    // Only check non-empty values for duplicates
    const nonEmptyValues = allTextValues.filter((text) => text && typeof text === "string" && text.trim() !== "");

    // Check for duplicates
    const duplicates = new Set();

    nonEmptyValues.forEach((textValue, index) => {
      if (nonEmptyValues.indexOf(textValue) !== index) {
        duplicates.add(textValue);
      }
    });

    if (duplicates.size > 0) {
      setIsCopying(true);
      setDuplicateModalOpen(true);
      const duplicateTexts = Array.from(duplicates).join(", ");
      setModalContent(
        <div className="font-nunito text-md">
          <h1 className="mb-5 font-bold">Warning: Duplicate values found</h1>
          <div>
            Text: <span className="text-red-600">{duplicateTexts}</span>
            <div className="mt-8">
              <Button
                size="medium"
                color="dark"
                onClick={() => setDuplicateModalOpen(false)}
                title="Close"
              />
            </div>
          </div>
        </div>
      );
    } else {
      // No duplicates, continue with copying
      // Ensure all status fields are included in the copy
      const copyData = {
        ...copyFieldValues(),
        status: selectedOptionValues || "Enabled",
        clientStatus: clientStatus || "Active",
        campaignStatus: campaignStatus || "Active",
        adGroupStatus: adGroupStatus || "Active",
        adStatus: adStatus || "Active",
      };
      copyFieldValues(copyData);
    }
  };

  return (
    <div>
      <Button
        size="medium"
        color="dark"
        title="Copy ad"
        onClick={checkForDuplicates}
      />
    </div>
  );
}

export default DuplicateChecker;
