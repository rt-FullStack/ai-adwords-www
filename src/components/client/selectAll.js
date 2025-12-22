import React from "react";

const SelectAllButton = ({
  onSelectAll,
  selectAllText,
  deselectAllText,
  allSelected,
}) => {
  return (
    <div className="flex items-center mb-2 font-nunito">
      <label className="mr-2 border-b border-black">
        {allSelected ? deselectAllText : selectAllText}
      </label>
      <input
        type="checkbox"
        checked={allSelected}
        onChange={onSelectAll}
        className=""
      />
    </div>
  );
};

export default SelectAllButton;
