import React, { useState, useEffect, useRef } from "react";

const AutocompleteInput = ({
    value,
    onChange,
    suggestions = [],
    placeholder,
    className = "",
    inputClassName = "",
    required = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        setSearchTerm(value);
    }, [value]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const filteredSuggestions = suggestions
        .filter(suggestion => suggestion && typeof suggestion === 'string') // Filter out null/undefined/non-string values
        .filter(
            (suggestion) =>
                suggestion.toLowerCase().includes(searchTerm.toLowerCase()) &&
                suggestion.toLowerCase() !== searchTerm.toLowerCase()
        )
        .slice(0, 10); // Limit to 10 suggestions for better performance

    const handleInputChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        onChange(value);
        setIsOpen(value.trim().length > 0); // Only open dropdown if there's text
        setHighlightedIndex(-1);
    };

    const handleSuggestionClick = (suggestion) => {
        setSearchTerm(suggestion);
        onChange(suggestion);
        setIsOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.focus();
    };

    const handleKeyDown = (e) => {
        if (!isOpen) {
            if ((e.key === "ArrowDown" || e.key === "ArrowUp") && searchTerm.trim().length > 0) {
                setIsOpen(true);
                return;
            }
        }

        if (filteredSuggestions.length === 0) return;

        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                setHighlightedIndex((prevIndex) =>
                    prevIndex < filteredSuggestions.length - 1 ? prevIndex + 1 : 0
                );
                break;
            case "ArrowUp":
                e.preventDefault();
                setHighlightedIndex((prevIndex) =>
                    prevIndex > 0 ? prevIndex - 1 : filteredSuggestions.length - 1
                );
                break;
            case "Enter":
                e.preventDefault();
                if (highlightedIndex >= 0) {
                    handleSuggestionClick(filteredSuggestions[highlightedIndex]);
                }
                break;
            case "Escape":
                setIsOpen(false);
                setHighlightedIndex(-1);
                break;
            default:
                break;
        }
    };

    return (
        <div ref={wrapperRef} className={`relative ${className}`}>
            <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={handleInputChange}
                onFocus={(e) => setIsOpen(e.target.value.trim().length > 0)} // Only open on focus if there's text
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className={`bg-white w-80 py-1 rounded-sm shadow-md font-bold pl-1.5 ${inputClassName}`}
                required={required}
            />
            {isOpen && searchTerm.trim().length > 0 && filteredSuggestions.length > 0 && (
                <ul className="absolute z-50 w-full bg-white mt-1 rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredSuggestions.map((suggestion, index) => (
                        <li
                            key={index}
                            onClick={() => handleSuggestionClick(suggestion)}
                            onMouseEnter={() => setHighlightedIndex(index)}
                            className={`px-4 py-2 cursor-pointer ${index === highlightedIndex
                                    ? "bg-slate-100 text-slate-900"
                                    : "hover:bg-slate-50"
                                }`}
                        >
                            {suggestion}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default AutocompleteInput; 
