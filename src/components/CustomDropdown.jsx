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
    <div className="relative" ref={dropdownRef}>
      {/* Simple HTML Select as fallback */}
      <select
        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white cursor-pointer"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((option, index) => (
          <option key={option.value || index} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      {/* Custom Dropdown (hidden) */}
      <div className="hidden">
        <div
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white cursor-pointer flex items-center justify-between"
          onClick={toggleDropdown}
        >
          <span className="flex-1 text-gray-700">{selectedLabel}</span>
          <ChevronDown className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} size={20} />
        </div>
      </div>
    </div>
  );
}

export default CustomDropdown;
