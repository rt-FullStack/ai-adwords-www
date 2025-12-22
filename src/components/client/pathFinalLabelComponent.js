import { useEffect, useState } from "react";
import { TbArrowsMoveVertical } from "react-icons/tb";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import AutocompleteInput from "@/components/common/AutocompleteInput";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase/firebase";

const PathFinalLabelComponent = ({
  pathValues,
  finalUrlValues,
  setPathValues,
  setFinalUrlValues,
  viewAllPaths,
  viewAllFinalUrl,
  viewAllLabels,
  setViewAllPaths,
  setViewAllFinalUrl,
  setViewAllLabels,
  labelsValues,
  setLabelsValues,
  selectedOptionValues,
  setSelectedOptionValues,
  clientStatus,
  setClientStatus,
  campaignStatus,
  setCampaignStatus,
  adGroupStatus,
  setAdGroupStatus,
  adStatus,
  setAdStatus,
  useViewAllData,
  currentUser,
  clientName,
}) => {
  const [labelSuggestions, setLabelSuggestions] = useState([]);

  useEffect(() => {
    if (!useViewAllData || viewAllPaths.length === 0) return;

    let nextPathIndex = 0;
    const updatedValues = pathValues.map((input) => {
      if (!input.text && nextPathIndex < viewAllPaths.length) {
        return {
          ...input,
          text: viewAllPaths[nextPathIndex++],
        };
      }
      return input;
    });

    if (JSON.stringify(updatedValues) !== JSON.stringify(pathValues)) {
      setPathValues(updatedValues);
    }
  }, [viewAllPaths, useViewAllData, pathValues]);

  useEffect(() => {
    if (!useViewAllData || viewAllFinalUrl.length === 0) return;

    let nextFinalUrlIndex = 0;
    const updatedValues = finalUrlValues.map((input) => {
      if (!input.text && nextFinalUrlIndex < viewAllFinalUrl.length) {
        return {
          ...input,
          text: viewAllFinalUrl[nextFinalUrlIndex++],
        };
      }
      return input;
    });

    if (JSON.stringify(updatedValues) !== JSON.stringify(finalUrlValues)) {
      setFinalUrlValues(updatedValues);
    }
  }, [viewAllFinalUrl, useViewAllData, finalUrlValues]);

  useEffect(() => {
    if (!useViewAllData || viewAllLabels.length === 0) return;

    let nextLabelIndex = 0;
    const updatedValues = labelsValues.map((input) => {
      if (!input.text && nextLabelIndex < viewAllLabels.length) {
        return {
          ...input,
          text: viewAllLabels[nextLabelIndex++],
        };
      }
      return input;
    });

    if (JSON.stringify(updatedValues) !== JSON.stringify(labelsValues)) {
      setLabelsValues(updatedValues);
    }
  }, [viewAllLabels, useViewAllData, labelsValues]);

  useEffect(() => {
    const fetchLabels = async () => {
      if (!currentUser || !clientName) return;

      try {
        const adGroupsRef = collection(db, "clients", currentUser.uid, "client", decodeURIComponent(clientName), "adGroups");
        const adGroupsSnapshot = await getDocs(adGroupsRef);

        let allLabels = new Set();

        for (const adGroupDoc of adGroupsSnapshot.docs) {
          const adTypesRef = collection(adGroupDoc.ref, "adTypes");
          const adTypesSnapshot = await getDocs(adTypesRef);

          for (const adTypeDoc of adTypesSnapshot.docs) {
            const categoriesRef = collection(adTypeDoc.ref, "categories");
            const categoriesSnapshot = await getDocs(categoriesRef);

            for (const categoryDoc of categoriesSnapshot.docs) {
              const data = categoryDoc.data();
              if (data.labelsValues) {
                data.labelsValues.forEach((label) => {
                  if (label.text) {
                    allLabels.add(label.text);
                  }
                });
              }
            }
          }
        }

        // Convert Set to array of strings
        setLabelSuggestions(Array.from(allLabels));
      } catch (error) {
        console.error("Error fetching labels:", error);
      }
    };

    fetchLabels();
  }, [currentUser, clientName]);

  const handleChangePath = (index, field, value) => {
    if (!useViewAllData) {
      const updatedPathValues = [...pathValues];
      updatedPathValues[index] = {
        ...updatedPathValues[index],
        [field]: value,
      };
      setPathValues(updatedPathValues);
    } else {
      const updatedViewAllPaths = [...viewAllPaths];
      updatedViewAllPaths[index] = value;
      setViewAllPaths(updatedViewAllPaths);
    }
  };

  const handleFinalUrlChange = (index, field, value) => {
    if (!useViewAllData) {
      const updatedFinalUrlValues = [...finalUrlValues];
      updatedFinalUrlValues[index] = {
        ...updatedFinalUrlValues[index],
        [field]: value,
      };
      setFinalUrlValues(updatedFinalUrlValues);
    } else {
      const updatedViewAllFinalUrl = [...viewAllFinalUrl];
      updatedViewAllFinalUrl[index] = value;
      setViewAllFinalUrl(updatedViewAllFinalUrl);
    }
  };
  const handleChangeLabel = (index, field, value) => {
    if (!useViewAllData) {
      const updatedLabelsValues = [...labelsValues];
      updatedLabelsValues[index] = {
        ...updatedLabelsValues[index],
        [field]: value,
      };
      setLabelsValues(updatedLabelsValues);
    } else {
      const updatedViewAllLabels = [...viewAllLabels];
      updatedViewAllLabels[index] = value;
      setViewAllLabels(updatedViewAllLabels);
    }
  };

  return (
    <div className="ml-1">
      <DragDropContext
        onDragEnd={(result) => {
          if (!result.destination) return;
          const items = Array.from(pathValues);
          const [reorderedItem] = items.splice(result.source.index, 1);
          items.splice(result.destination.index, 0, reorderedItem);
          setPathValues(items);
        }}>
        <Droppable droppableId="droppable">
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}>
              {pathValues.map((path, index) => (
                <Draggable
                  key={path.id}
                  draggableId={path.id}
                  index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}>
                      <div
                        key={path.id}
                        className="flex">
                        <div className="relative flex">
                          <TbArrowsMoveVertical
                            size={25}
                            className="text-gray-400"
                          />
                          <input
                            type="text"
                            value={useViewAllData ? viewAllPaths[index] || "" : pathValues[index].text || ""}
                            placeholder={`Path ${index + 1}...`}
                            onChange={(e) => handleChangePath(index, "text", e.target.value)}
                            className={`input-field focus:outline-none pl-1.5 ${
                              (path.text || viewAllPaths[index])?.length > 15 || useViewAllData
                                ? "border-2 border-red-500 w-96 mb-5 py-1 rounded-sm shadow-md"
                                : "bg-white mb-5 w-96 py-1 rounded-sm shadow-md"
                            }`}
                          />

                          <span
                            className={`text-xs absolute right-2 ${
                              viewAllPaths[index]?.length > 15 || useViewAllData ? `text-red-600 font-bold` : `text-gray-400 `
                            } `}>
                            {viewAllPaths[index]?.length > 15 || useViewAllData ? viewAllPaths[index]?.length : path.text?.length || 0}
                            /15
                          </span>
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
      </DragDropContext>

      {/* Input fields for final URL */}
      <div className="flex flex-col gap-1 ml-6">
        {finalUrlValues.map((finalUrl, index) => (
          <div
            key={finalUrl.id}
            className="flex">
            <input
              type="text"
              value={useViewAllData ? viewAllFinalUrl[index] || "" : finalUrlValues[index].text || ""}
              placeholder={`Final URL...`}
              onChange={(e) => handleFinalUrlChange(index, "text", e.target.value)}
              className="input-field w-96 bg-white py-1 rounded-sm shadow-md pl-1.5"
            />
          </div>
        ))}
        <div className="flex flex-col gap-1 mt-5 items-start">
          {labelsValues.map((labels, index) => (
            <div
              key={labels.id}
              className="flex">
              <AutocompleteInput
                value={labels.text || viewAllLabels[index] || ""}
                onChange={(value) => handleChangeLabel(index, "text", value)}
                placeholder="Label..."
                suggestions={labelSuggestions}
              />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-4 mt-5">
          <div>
            <p className="mb-1">Client Status</p>
            <select
              className="rounded-sm w-80 py-1 shadow-md"
              value={clientStatus}
              onChange={(e) => setClientStatus(e.target.value)}>
              <option value="Active">Active</option>
              <option value="Paused">Paused</option>
            </select>
          </div>

          <div>
            <p className="mb-1">Campaign Status</p>
            <select
              className="rounded-sm w-80 py-1 shadow-md"
              value={campaignStatus}
              onChange={(e) => setCampaignStatus(e.target.value)}>
              <option value="Active">Active</option>
              <option value="Paused">Paused</option>
            </select>
          </div>

          <div>
            <p className="mb-1">Ad Group Status</p>
            <select
              className="rounded-sm w-80 py-1 shadow-md"
              value={adGroupStatus}
              onChange={(e) => setAdGroupStatus(e.target.value)}>
              <option value="Active">Active</option>
              <option value="Paused">Paused</option>
            </select>
          </div>

          <div>
            <p className="mb-1">Ad Status</p>
            <select
              className="rounded-sm w-80 py-1 shadow-md"
              value={adStatus}
              onChange={(e) => setAdStatus(e.target.value)}>
              <option value="Active">Active</option>
              <option value="Paused">Paused</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
export default PathFinalLabelComponent;
