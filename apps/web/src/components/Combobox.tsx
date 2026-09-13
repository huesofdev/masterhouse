import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

export interface ComboboxOption {
  value: string;
  label: string;
  // Optional rich data for custom rendering
  data?: any;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  error?: boolean;
  renderOption?: (option: ComboboxOption, isSelected: boolean) => React.ReactNode;
  renderValue?: (option: ComboboxOption | undefined) => React.ReactNode;
  className?: string;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select an option...",
  searchPlaceholder = "Search...",
  disabled = false,
  error = false,
  renderOption,
  renderValue,
  className = ""
}: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Debounced search logic (simple version for local arrays)
  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const lowerSearch = search.toLowerCase();
    return options.filter(opt => {
      // Search in label
      if (opt.label.toLowerCase().includes(lowerSearch)) return true;
      // If rich data is provided, search in some common fields like sku or category
      if (opt.data) {
        if (opt.data.sku && typeof opt.data.sku === 'string' && opt.data.sku.toLowerCase().includes(lowerSearch)) return true;
        // category can be a plain string OR an object {id, name} — handle both
        if (opt.data.category) {
          const cat = opt.data.category;
          if (typeof cat === 'string' && cat.toLowerCase().includes(lowerSearch)) return true;
          if (typeof cat === 'object' && cat.name && cat.name.toLowerCase().includes(lowerSearch)) return true;
        }
        if (opt.data.categoryName && typeof opt.data.categoryName === 'string' && opt.data.categoryName.toLowerCase().includes(lowerSearch)) return true;
      }
      return false;
    });
  }, [options, search]);

  const selectedOption = useMemo(() => options.find(o => o.value === value), [options, value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setSearch('');
      setHighlightedIndex(0);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
        // Scroll into view
        const downNode = listRef.current?.children[highlightedIndex + 1] as HTMLElement;
        if (downNode) downNode.scrollIntoView({ block: 'nearest' });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : prev));
        // Scroll into view
        const upNode = listRef.current?.children[highlightedIndex - 1] as HTMLElement;
        if (upNode) upNode.scrollIntoView({ block: 'nearest' });
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          onChange(filteredOptions[highlightedIndex].value);
          setIsOpen(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  return (
    <div 
      ref={containerRef} 
      className={className} 
      style={{ position: 'relative', width: '100%', fontFamily: 'var(--font-family-base)' }}
      onKeyDown={handleKeyDown}
    >
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '9px 12px',
          background: disabled ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
          border: `1px solid ${error ? 'var(--status-error)' : 'var(--border-color)'}`,
          borderRadius: 'var(--border-radius-sm)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          color: selectedOption ? 'var(--text-primary)' : 'var(--text-secondary)',
          minHeight: '40px',
          fontSize: '13px',
        }}
      >
        <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedOption 
            ? (renderValue ? renderValue(selectedOption) : selectedOption.label)
            : placeholder
          }
        </div>
        <ChevronDown size={14} color="var(--text-secondary)" style={{ marginLeft: '8px', flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </div>

      {isOpen && (
        <div 
          className="glass-panel"
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
            zIndex: 100, padding: '8px',
            maxHeight: '300px', display: 'flex', flexDirection: 'column',
            boxShadow: 'var(--shadow-xl)',
            animation: 'slideInDown 0.15s ease-out'
          }}
        >
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '6px', 
            padding: '6px 8px', background: 'var(--bg-primary)',
            borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)',
            marginBottom: '6px'
          }}>
            <Search size={13} color="var(--text-secondary)" />
            <input 
              ref={inputRef}
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setHighlightedIndex(0);
              }}
              placeholder={searchPlaceholder}
              style={{
                background: 'transparent', border: 'none', color: 'var(--text-primary)',
                width: '100%', outline: 'none', fontSize: '12px'
              }}
            />
          </div>

          <div ref={listRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '10px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
                No results found.
              </div>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = option.value === value;
                const isHighlighted = index === highlightedIndex;

                return (
                  <div
                    key={option.value}
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 'var(--border-radius-sm)',
                      cursor: 'pointer',
                      background: isSelected 
                        ? 'rgba(59, 130, 246, 0.15)' 
                        : isHighlighted 
                          ? 'var(--bg-tertiary)' 
                          : 'transparent',
                      color: isSelected ? 'var(--brand-primary)' : 'var(--text-primary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      transition: 'background 0.1s',
                      fontSize: '13px',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      {renderOption ? renderOption(option, isSelected) : option.label}
                    </div>
                    {isSelected && <Check size={13} color="var(--brand-primary)" style={{ marginLeft: '10px', flexShrink: 0 }} />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideInDown {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
