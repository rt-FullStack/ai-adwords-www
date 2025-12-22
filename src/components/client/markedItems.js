"use client";
import React from "react";
import { useState, useEffect } from "react";
import Button from "../buttons";
import { FaTrash } from "react-icons/fa";
import "tailwind-scrollbar";
import SelectAllButton from "./selectAll";

const MarkedItems = ({
  newListHeadlines,
  newListDescriptions,
  setNewListDescriptions,
  setNewListHeadlines,
  headlineValues,
  descriptionValues,
  setselectedHeadlines,
  setselectedDescriptions,
  setHeadlineValues,
  setDescriptionValues,
  toggleMarkedItems,
}) => {
  const [selectAllHeadlines, setSelectAllHeadlines] = useState(false);
  const [selectAllDescriptions, setSelectAllDescriptions] = useState(false);
  const [checkedHeadlines, setCheckedHeadlines] = useState([]);
  const [checkedDescriptions, setCheckedDescriptions] = useState([]);
  const [markedHeadlines, setMarkedHeadlines] = useState([]);
  const [markedDescriptions, setMarkedDescriptions] = useState([]);
  const [newListHeadlinesOrder, setNewListHeadlinesOrder] = useState([...Array(newListHeadlines.length).keys()]);
  const [newListDescriptionsOrder, setNewListDescriptionsOrder] = useState([...Array(newListDescriptions.length).keys()]);
  useEffect(() => {
    const markedHeadlines = newListHeadlines.filter((_, index) => checkedHeadlines[index]);
    const markedDescriptions = newListDescriptions.filter((_, index) => checkedDescriptions[index]);
    setMarkedHeadlines(markedHeadlines);
    setMarkedDescriptions(markedDescriptions);
    toggleMarkedItems(markedHeadlines.length > 0 || markedDescriptions.length > 0);
  }, [newListHeadlines, newListDescriptions]);
  const markAndSave = () => {
    const markedHeadlines = newListHeadlines.filter((_, index) => checkedHeadlines[index]);
    const markedDescriptions = newListDescriptions.filter((_, index) => checkedDescriptions[index]);

    const filteredHeadlines = markedHeadlines.filter((item) => !headlineValues.some((input) => input.text === item));

    const filteredDescriptions = markedDescriptions.filter((item) => !descriptionValues.some((input) => input.text === item));

    let nextHeadlineIndex = 0;
    setHeadlineValues((prevValues) =>
      prevValues.map((input) => {
        if (!input.text && nextHeadlineIndex < filteredHeadlines.length) {
          input = { ...input, text: filteredHeadlines[nextHeadlineIndex++] };
        }
        return input;
      })
    );

    let nextDescriptionIndex = 0;
    setDescriptionValues((prevValues) =>
      prevValues.map((input) => {
        if (!input.text && nextDescriptionIndex < filteredDescriptions.length) {
          input = {
            ...input,
            text: filteredDescriptions[nextDescriptionIndex++],
          };
        }
        return input;
      })
    );

    setMarkedHeadlines(filteredHeadlines);
    setMarkedDescriptions(filteredDescriptions);
  };

  const removeItem = (index, type) => {
    if (type === "headline") {
      setNewListHeadlines((prevList) => prevList.filter((_, i) => i !== index));
    } else if (type === "description") {
      setNewListDescriptions((prevList) => prevList.filter((_, i) => i !== index));
    }
  };

  const handleItemClick = (index, type) => {
    if (type === "headline") {
      setCheckedHeadlines((prev) => {
        const newChecked = [...prev];
        newChecked[index] = !newChecked[index];
        return newChecked;
      });
    } else if (type === "description") {
      setCheckedDescriptions((prev) => {
        const newChecked = [...prev];
        newChecked[index] = !newChecked[index];
        return newChecked;
      });
    }
  };

  const handleRemoveItemClick = (index, type) => {
    removeItem(index, type);
  };

  const toggleSelectAllHeadlines = () => {
    if (selectAllHeadlines) {
      setCheckedHeadlines(new Array(newListHeadlines.length).fill(false));
    } else {
      setCheckedHeadlines(new Array(newListHeadlines.length).fill(true));
    }
    setSelectAllHeadlines(!selectAllHeadlines);
  };

  const toggleSelectAllDescriptions = () => {
    if (selectAllDescriptions) {
      setCheckedDescriptions(new Array(newListDescriptions.length).fill(false));
    } else {
      setCheckedDescriptions(new Array(newListDescriptions.length).fill(true));
    }
    setSelectAllDescriptions(!selectAllDescriptions);
  };
  return (
    <div className=" flex flex-col gap-4">
      <div
        className={`overflow-y-auto ${
          newListHeadlines.length > 5 ? "h-80" : ""
        } px-4 scrollbar-thin scrollbar-thumb-rounded scrollbar-track-rounded scrollbar-thumb-slate-700 scrollbar-track-slate-300 scrollbar-track-rounded `}>
        {newListHeadlines.length > 0 && (
          <div>
            <h1 className="font-bold">Marked Headlines</h1>
            <SelectAllButton
              onSelectAll={toggleSelectAllHeadlines}
              selectAllText={"Select All Headlines"}
              deselectAllText="Select All Headlines"
              allSelected={selectAllHeadlines}
            />

            {newListHeadlines
              .filter((headline) => typeof headline === "string" && headline.trim() !== "")
              .map((headline, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2">
                  <div
                    className={`${
                      !checkedHeadlines[index]
                        ? "bg-slate-300 w-60 p-1 rounded-sm shadow-md mb-5 cursor-pointer"
                        : "bg-slate-100 w-60 mb-5 p-1 rounded-sm shadow-md cursor-pointer"
                    }`}
                    onClick={() => handleItemClick(index, "headline")}>
                    <div className="flex items-center justify-between">
                      <label>{headline}</label>
                      {checkedHeadlines[index] && <span>✓</span>}
                    </div>
                  </div>
                  <button onClick={() => handleRemoveItemClick(index, "headline")}>
                    <FaTrash className="text-xl mb-5 cursor-pointer" />
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>

      {newListDescriptions.length > 0 && (
        <div
          className={`overflow-y-auto ${
            newListDescriptions.length > 4 ? " h-80" : " h-96"
          } px-4  scrollbar-thin scrollbar-thumb-rounded scrollbar-track-rounded scrollbar-thumb-slate-700 scrollbar-track-slate-300 scrollbar-track-rounded `}>
          <h1 className="font-bold">Marked Descriptions</h1>
          <SelectAllButton
            onSelectAll={toggleSelectAllDescriptions}
            selectAllText="Select All Descriptions"
            deselectAllText="Select All Descriptions"
            allSelected={selectAllDescriptions}
          />

          {newListDescriptions
            .filter((description) => typeof description === "string" && description.trim() !== "")
            .map((description, index) => (
              <div
                key={index}
                className="flex items-center gap-2">
                <div
                  className={`${
                    !checkedDescriptions[index]
                      ? "bg-slate-300 w-60 p-1 rounded-sm shadow-md mb-5 cursor-pointer"
                      : "bg-slate-100 w-60 mb-5 p-1 rounded-sm shadow-md cursor-pointer"
                  }`}
                  onClick={() => handleItemClick(index, "description")}>
                  <div className="flex items-center justify-between">
                    <label>{description}</label>
                    {checkedDescriptions[index] && <span>✓</span>}
                  </div>
                </div>
                <button onClick={() => handleRemoveItemClick(index, "description")}>
                  <FaTrash className="text-xl mb-5" />
                </button>
              </div>
            ))}
        </div>
      )}
      {(newListHeadlines.length > 0 || newListDescriptions.length > 0) && (
        <div className="px-4">
          <Button
            onClick={markAndSave}
            title="Save marked items"
            size="medium"
            color="dark"
            className="border border-slate-600 bg-slate-700 hover:bg-slate-500 text-white rounded-md"
          />
        </div>
      )}
    </div>
  );
};

export default MarkedItems;
