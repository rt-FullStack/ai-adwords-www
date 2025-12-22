"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { FaTrash } from "react-icons/fa";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/components/authContext";

function EditorContent() {
  const searchParams = useSearchParams();
  const { currentUser } = useAuth();
  
  // State for editor functionality
  const [newListHeadlines, setNewListHeadlines] = useState([]);
  const [newListDescriptions, setNewListDescriptions] = useState([]);
  const [selectedHeadlines, setSelectedHeadlines] = useState([]);
  const [selectedDescriptions, setSelectedDescriptions] = useState([]);
  const [savedHeadlines, setSavedHeadlines] = useState([]);
  const [savedDescriptions, setSavedDescriptions] = useState([]);
  const [userLists, setUserLists] = useState([]);
  const [isDiv2Hovered, setIsDiv2Hovered] = useState(false);

  // Initialize from URL params
  useEffect(() => {
    const headlinesData = searchParams.get("newListHeadlines") || "";
    const descriptionData = searchParams.get("newListDescriptions") || "";
    
    if (headlinesData && descriptionData) {
      try {
        const parsedNewListHeadlines = JSON.parse(decodeURIComponent(headlinesData));
        const parsedNewListDescriptions = JSON.parse(decodeURIComponent(descriptionData));
        setNewListHeadlines(parsedNewListHeadlines);
        setNewListDescriptions(parsedNewListDescriptions);
        setSelectedHeadlines(new Array(parsedNewListHeadlines.length).fill(false));
        setSelectedDescriptions(new Array(parsedNewListDescriptions.length).fill(false));
      } catch (error) {
        console.error("Error parsing headlines or descriptions:", error);
      }
    }
  }, [searchParams]);

  // Drag and drop handlers for editor section
  const onHeadlinesDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(newListHeadlines);
    const [reorderedItem] = items.splice(result.source.index, 1);
    const [reorderedSelection] = selectedHeadlines.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    selectedHeadlines.splice(result.destination.index, 0, reorderedSelection);
    setSelectedHeadlines([...selectedHeadlines]);
    setNewListHeadlines(items);
  };

  const onDescriptionsDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(newListDescriptions);
    const [reorderedItem] = items.splice(result.source.index, 1);
    const [reorderedSelection] = selectedDescriptions.splice(result.source.index, 1);

    items.splice(result.destination.index, 0, reorderedItem);
    selectedDescriptions.splice(result.destination.index, 0, reorderedSelection);

    setNewListDescriptions(items);
    setSelectedDescriptions([...selectedDescriptions]);
  };

  const onSavedHeadlinesDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(savedHeadlines);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setSavedHeadlines(items);
  };

  const onSavedDescriptionsDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(savedDescriptions);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setSavedDescriptions(items);
  };

  const handleSelectItem = (type, index) => {
    if (type === "headline") {
      setSelectedHeadlines((prevSelected) => 
        prevSelected.map((selected, idx) => (idx === index ? !selected : selected))
      );
    } else if (type === "description") {
      setSelectedDescriptions((prevSelected) => 
        prevSelected.map((selected, idx) => (idx === index ? !selected : selected))
      );
    }
  };

  const handleDelete = (type, index) => {
    if (type === "headline") {
      setNewListHeadlines((prevHeadlines) => prevHeadlines.filter((_, idx) => idx !== index));
      setSelectedHeadlines((prevSelected) => prevSelected.filter((_, idx) => idx !== index));
    } else if (type === "description") {
      setNewListDescriptions((prevDescriptions) => prevDescriptions.filter((_, idx) => idx !== index));
      setSelectedDescriptions((prevSelected) => prevSelected.filter((_, idx) => idx !== index));
    }
  };

  const handleDeleteSavedItem = (type, index) => {
    if (type === "headline") {
      setSavedHeadlines((prevHeadlines) => prevHeadlines.filter((_, idx) => idx !== index));
    } else if (type === "description") {
      setSavedDescriptions((prevDescriptions) => prevDescriptions.filter((_, idx) => idx !== index));
    }
  };

  const saveMarkedItems = () => {
    const markedHeadlines = newListHeadlines.filter((_, index) => selectedHeadlines[index]);
    const markedDescriptions = newListDescriptions.filter((_, index) => selectedDescriptions[index]);

    setSavedHeadlines((prevSavedHeadlines) => [...prevSavedHeadlines, ...markedHeadlines]);
    setSavedDescriptions((prevSavedDescriptions) => [...prevSavedDescriptions, ...markedDescriptions]);
  };

  const addUserList = () => {
    const markedHeadlines = newListHeadlines.filter((_, index) => selectedHeadlines[index]);
    const markedDescriptions = newListDescriptions.filter((_, index) => selectedDescriptions[index]);

    setUserLists((prevUserLists) => [
      ...prevUserLists,
      {
        headlines: [...markedHeadlines],
        descriptions: [...markedDescriptions],
      },
    ]);
  };

  return (
    <div className="font-nunito p-4">
      <div className="flex gap-4">
        {/* Left side: Client Form */}
        <div className="flex-1">
          <div className="bg-slate-50 p-6 rounded-lg border border-slate-300">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Create/Edit Ad</h2>
              
              {/* Form fields */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                  <input
                    type="text"
                    placeholder="Enter client name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
                  <input
                    type="text"
                    placeholder="Enter campaign name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ad Group</label>
                  <input
                    type="text"
                    placeholder="Enter ad group"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ad Name</label>
                  <input
                    type="text"
                    placeholder="Enter ad name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Headlines Section */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-700">Headlines</h3>
                  <div className="text-sm text-gray-500">
                    Headline Text Format: 
                    <select className="ml-2 border border-gray-300 rounded px-2 py-1">
                      <option value="none">None (original)</option>
                      <option value="capitalizeWords">Sentence Case All Words</option>
                      <option value="toLowerCase">Lowercase all letters</option>
                      <option value="capitalizeAfterDot">Capital after. Dot</option>
                      <option value="toUpperCase">Uppercase all letters</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {Array.from({ length: 15 }).map((_, index) => (
                    <div key={`headline-${index}`} className="flex gap-2 items-center">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          placeholder={`Headline ${index + 1}...`}
                          className="w-full px-3 py-2 border border-green-500 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                        <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
                          0/30
                        </span>
                      </div>
                      <input
                        type="number"
                        max="3"
                        min="1"
                        className="w-12 px-2 py-2 border border-gray-300 rounded-md shadow-sm text-center"
                        placeholder="Pin"
                      />
                    </div>
                  ))}
                </div>

                {/* Extra Headlines Section */}
                <div className="mt-8">
                  <h4 className="text-md font-semibold text-gray-700 mb-4">Extra Headlines</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {Array.from({ length: 10 }).map((_, index) => (
                      <div key={`extra-headline-${index}`} className="flex gap-2 items-center">
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            placeholder={`Headline ${16 + index}...`}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
                            0/30
                          </span>
                        </div>
                        <input
                          type="number"
                          max="3"
                          min="1"
                          className="w-12 px-2 py-2 border border-gray-300 rounded-md shadow-sm text-center"
                          placeholder="Pin"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Path, Final URL, Labels Section */}
              <div className="mb-8">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Path 1..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
                      0/15
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Path 2..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
                      0/15
                    </span>
                  </div>
                </div>

                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Final URL..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="mb-6">
                  <input
                    type="text"
                    placeholder="Label..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Status Section */}
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Client Status</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">
                      <option>Active</option>
                      <option>Paused</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Status</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">
                      <option>Active</option>
                      <option>Paused</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ad Group Status</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">
                      <option>Active</option>
                      <option>Paused</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ad Status</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">
                      <option>Active</option>
                      <option>Paused</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Descriptions Section */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-700">Descriptions</h3>
                  <div className="text-sm text-gray-500">
                    Description Text Format: 
                    <select className="ml-2 border border-gray-300 rounded px-2 py-1">
                      <option value="none">None (original)</option>
                      <option value="capitalizeWords">Sentence Case All Words</option>
                      <option value="toLowerCase">Lowercase all letters</option>
                      <option value="capitalizeAfterDot">Capital after. Dot</option>
                      <option value="toUpperCase">Uppercase all letters</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={`description-${index}`} className="relative">
                      <textarea
                        placeholder={`Description ${index + 1}...`}
                        rows="2"
                        className="w-full px-3 py-2 border border-green-500 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                      />
                      <span className="absolute right-2 top-2 text-xs text-gray-400">
                        0/90
                      </span>
                    </div>
                  ))}
                </div>

                {/* Extra Descriptions */}
                <div className="mt-8">
                  <h4 className="text-md font-semibold text-gray-700 mb-4">Extra Descriptions</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div key={`extra-description-${index}`} className="relative">
                        <textarea
                          placeholder={`Description ${5 + index}...`}
                          rows="2"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        />
                        <span className="absolute right-2 top-2 text-xs text-gray-400">
                          0/90
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-200">
              <button className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                Clear All
              </button>
              <button className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700">
                Save
              </button>
            </div>
          </div>
        </div>

        {/* Right side: Editor Section */}
        <div className={`transition-all ease-in-out ${isDiv2Hovered ? "w-96" : "w-80"}`}
             onMouseOver={() => setIsDiv2Hovered(true)}
             onMouseLeave={() => setIsDiv2Hovered(false)}>
          <div className="bg-slate-200 border rounded-md p-6 h-full">
            {/* Action Button */}
            <div className="flex justify-end mb-6">
              <button
                onClick={saveMarkedItems}
                className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700">
                Save Marked Items
              </button>
            </div>

            {/* Headlines Editor */}
            <div className="mb-8">
              <h3 className="font-bold mb-4 text-gray-800">Headlines:</h3>
              <DragDropContext onDragEnd={onHeadlinesDragEnd}>
                <Droppable droppableId="headlines">
                  {(provided) => (
                    <ul
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-2">
                      {newListHeadlines.map((headline, index) => (
                        typeof headline === "string" && headline.trim() !== "" && (
                          <Draggable
                            key={index}
                            draggableId={`headline-${index}`}
                            index={index}>
                            {(provided) => (
                              <li
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="bg-white p-3 rounded-md shadow-sm border border-gray-200">
                                <div className="flex items-center gap-3">
                                  <input
                                    value={headline}
                                    onChange={(e) => {
                                      const newHeadlines = [...newListHeadlines];
                                      newHeadlines[index] = e.target.value;
                                      setNewListHeadlines(newHeadlines);
                                    }}
                                    className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                  <div className="flex gap-2">
                                    <input
                                      type="checkbox"
                                      checked={selectedHeadlines[index] || false}
                                      onChange={() => handleSelectItem("headline", index)}
                                      className="w-4 h-4"
                                    />
                                    <button 
                                      onClick={() => handleDelete("headline", index)}
                                      className="text-red-500 hover:text-red-700">
                                      <FaTrash className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </li>
                            )}
                          </Draggable>
                        )
                      ))}
                      {provided.placeholder}
                    </ul>
                  )}
                </Droppable>
              </DragDropContext>
            </div>

            {/* Descriptions Editor */}
            <div className="mb-8">
              <h3 className="font-bold mb-4 text-gray-800">Descriptions:</h3>
              <DragDropContext onDragEnd={onDescriptionsDragEnd}>
                <Droppable droppableId="descriptions">
                  {(provided) => (
                    <ul
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-2">
                      {newListDescriptions.map((description, index) => (
                        <Draggable
                          key={index}
                          draggableId={`description-${index}`}
                          index={index}>
                          {(provided) => (
                            <li
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="bg-white p-3 rounded-md shadow-sm border border-gray-200">
                              <div className="flex items-center gap-3">
                                <textarea
                                  value={description}
                                  onChange={(e) => {
                                    const newDescriptions = [...newListDescriptions];
                                    newDescriptions[index] = e.target.value;
                                    setNewListDescriptions(newDescriptions);
                                  }}
                                  rows="2"
                                  className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                                />
                                <div className="flex gap-2">
                                  <input
                                    type="checkbox"
                                    checked={selectedDescriptions[index] || false}
                                    onChange={() => handleSelectItem("description", index)}
                                    className="w-4 h-4"
                                  />
                                  <button 
                                    onClick={() => handleDelete("description", index)}
                                    className="text-red-500 hover:text-red-700">
                                    <FaTrash className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </li>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </ul>
                  )}
                </Droppable>
              </DragDropContext>
            </div>

            {/* Saved Items Section */}
            <div className="mb-8">
              <h3 className="font-bold mb-4 text-gray-800">Saved Headlines:</h3>
              <DragDropContext onDragEnd={onSavedHeadlinesDragEnd}>
                <Droppable droppableId="saved-headlines">
                  {(provided) => (
                    <ul
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-2">
                      {savedHeadlines.map((headline, index) => (
                        <Draggable
                          key={index}
                          draggableId={`saved-headlines-${index}`}
                          index={index}>
                          {(provided) => (
                            <li
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="bg-white p-3 rounded-md shadow-sm border border-gray-200">
                              <div className="flex items-center justify-between">
                                <span className="text-sm">{headline}</span>
                                <button 
                                  onClick={() => handleDeleteSavedItem("headline", index)}
                                  className="text-red-500 hover:text-red-700">
                                  <FaTrash className="w-4 h-4" />
                                </button>
                              </div>
                            </li>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </ul>
                  )}
                </Droppable>
              </DragDropContext>
            </div>

            <div className="mb-8">
              <h3 className="font-bold mb-4 text-gray-800">Saved Descriptions:</h3>
              <DragDropContext onDragEnd={onSavedDescriptionsDragEnd}>
                <Droppable droppableId="saved-descriptions">
                  {(provided) => (
                    <ul
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-2">
                      {savedDescriptions.map((description, index) => (
                        <Draggable
                          key={index}
                          draggableId={`saved-description-${index}`}
                          index={index}>
                          {(provided) => (
                            <li
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              {...provided.dragHandleProps}
                              className="bg-white p-3 rounded-md shadow-sm border border-gray-200">
                              <div className="flex items-center justify-between">
                                <span className="text-sm">{description}</span>
                                <button 
                                  onClick={() => handleDeleteSavedItem("description", index)}
                                  className="text-red-500 hover:text-red-700">
                                  <FaTrash className="w-4 h-4" />
                                </button>
                              </div>
                            </li>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </ul>
                  )}
                </Droppable>
              </DragDropContext>
            </div>

            {/* Add to User List Button */}
            <div className="flex flex-col items-center mb-8">
              <button
                onClick={addUserList}
                className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700">
                Add to User List
              </button>
            </div>

            {/* User Lists Section */}
            {userLists.length > 0 && (
              <div>
                <h3 className="font-bold mb-4 text-gray-800">User Lists:</h3>
                {userLists.map((userList, listIndex) => (
                  <div key={listIndex} className="mb-6 bg-white p-4 rounded-md shadow-sm border border-gray-200">
                    <h4 className="font-semibold mb-3 text-gray-700">User List {listIndex + 1}</h4>
                    
                    {userList.headlines.length > 0 && (
                      <div className="mb-3">
                        <h5 className="text-sm font-medium text-gray-600 mb-2">Headlines:</h5>
                        <ul className="space-y-1">
                          {userList.headlines.map((headline, index) => (
                            <li key={index} className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                              {headline}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {userList.descriptions.length > 0 && (
                      <div className="mb-4">
                        <h5 className="text-sm font-medium text-gray-600 mb-2">Descriptions:</h5>
                        <ul className="space-y-1">
                          {userList.descriptions.map((description, index) => (
                            <li key={index} className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                              {description}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                        Save to Client
                      </button>
                      <button
                        onClick={() => {
                          const url = `/client?savedHeadlines=${encodeURIComponent(JSON.stringify(userList.headlines))}&savedDescriptions=${encodeURIComponent(JSON.stringify(userList.descriptions))}`;
                          window.location.href = url;
                        }}
                        className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700">
                        Go to Client Page
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Editor() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<div className="flex justify-center items-center h-screen">Loading Editor...</div>}>
        <EditorContent />
      </Suspense>
    </ProtectedRoute>
  );
}