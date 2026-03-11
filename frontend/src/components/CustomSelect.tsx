import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface Option {
  value: string | number;
  label: string;
  icon?: React.ReactNode;
  isGroup?: boolean;
  disabled?: boolean;
  level?: number;
}

interface CustomSelectProps {
  value: string | number;
  onChange: (value: any) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
}

export default function CustomSelect({ value, onChange, options, placeholder, className = '' }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value && !opt.isGroup);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 flex items-center justify-between"
      >
        <div className="flex items-center gap-2 truncate">
          {selectedOption ? (
            <>
              {selectedOption.icon && <span className="flex-shrink-0 scale-90">{selectedOption.icon}</span>}
              <span className="truncate">{selectedOption.label}</span>
            </>
          ) : (
            <span className="text-gray-400 truncate">{placeholder || 'Select...'}</span>
          )}
        </div>
        <ChevronDown size={16} className="text-gray-400 flex-shrink-0 ml-2" />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {options.map((opt, index) => {
            if (opt.isGroup) {
              return (
                <div key={`group-${index}`} className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 uppercase tracking-wider sticky top-0 z-10 flex items-center gap-2">
                  {opt.icon && <span className="flex-shrink-0 scale-75">{opt.icon}</span>}
                  {opt.label}
                </div>
              );
            }
            return (
              <button
                key={`opt-${opt.value}-${index}`}
                type="button"
                disabled={opt.disabled}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-red-50 transition-colors ${opt.disabled ? 'opacity-50 cursor-not-allowed' : ''} ${value === opt.value ? 'bg-red-50 text-red-600 font-medium' : 'text-gray-700'}`}
                style={opt.level ? { paddingLeft: `${(opt.level + 1) * 0.75}rem` } : undefined}
              >
                {opt.icon && <span className="flex-shrink-0 scale-90">{opt.icon}</span>}
                <span className="truncate">{opt.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
