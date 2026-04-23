import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

function CustomDropdown({ options, value, onChange, placeholder = "Select..." }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const selectedOption = options.find(opt => opt.value === value);
    setSelectedLabel(selectedOption ? selectedOption.label : placeholder);
  }, [value, options, placeholder]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (option) => {
    onChange(option.value);
    setIsOpen(false);
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Custom Dropdown Trigger */}
      <button
        type="button"
        className={`w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl flex items-center justify-between text-sm font-medium text-gray-700 hover:border-primary-300 hover:bg-gray-50 transition-all duration-200 ${isOpen ? 'ring-2 ring-primary-100 border-primary-400' : ''}`}
        onClick={toggleDropdown}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-card border border-gray-200 py-2 z-[100] animate-slide-up">
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {options.map((option, index) => (
              <button
                key={option.value || index}
                type="button"
                className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center justify-between ${
                  value === option.value 
                    ? 'bg-primary-50 text-primary-700 font-semibold' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => handleSelect(option)}
              >
                {option.label}
                {value === option.value && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomDropdown;
