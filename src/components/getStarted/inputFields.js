import React, { useState } from "react";
import { TbArrowsMoveVertical } from "react-icons/tb";

export default function InputFields({ value, number, placeholder, onChange, type, onChangeNumber, id }) {
  return (
    <div className="flex mb-3 mr-10 ">
      <div>
        {type === "DESCRIPTION" ? (
          <div className="relative flex items-center">
            <TbArrowsMoveVertical
              size={25}
              className="text-gray-400"
            />
            <textarea
              className={`bg-slate-100 border border-slate-400 lowercase rounded-sm w-96 py-3 px-1 ${
                value.length > (type === "DESCRIPTION" ? 90 : 30) ? "border-red-400 border-2" : ""
              }`}
              value={value}
              placeholder={placeholder}
              onChange={(e) => onChange(id, e.target.value)}
              spellCheck={true}
            />
            <span className={`absolute right-2 text-xs ${value.length > 90 ? "text-red-400 " : "text-gray-400"}`}>{value.length} / 90</span>
          </div>
        ) : (
          <div className="relative flex ">
            <TbArrowsMoveVertical
              size={25}
              className="text-gray-400"
            />
            <input
              className={`bg-slate-100 rounded-sm border border-slate-400 lowercase w-96 py-1 px-1 ${
                value.length > (type === "HEADLINE" ? 30 : 15) ? "border-2 border-red-500" : "border-grey-400"
              } }`}
              type="text"
              value={value}
              placeholder={placeholder}
              pattern={type === "headline" ? "[a-zA-Z0-9\\s]+" : ""}
              onChange={(e) => onChange(id, e.target.value)}
              spellCheck={true}
            />
            <span
              className={`absolute right-2 text-xs ${value.length > (type === "HEADLINE" ? 30 : 15) ? "text-red-500  " : "text-gray-400"}`}>
              {value.length} / {type === "HEADLINE" ? 30 : 15}
            </span>
          </div>
        )}
      </div>
      {(type === "HEADLINE" || type === "DESCRIPTION") && (
        <div className="ml-1">
          <input
            type="number"
            className="bg-slate-100 border border-slate-400 w-fit"
            value={number}
            onChange={(e) => onChangeNumber(id, e.target.value)}
            max="3"
            min="1"
          />
        </div>
      )}
    </div>
  );
}
