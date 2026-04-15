import { useEffect, useRef, useState } from 'react';
import { useDebounce } from '../hooks/useDebounce';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = 'Search by name or email…' }: Props) {
  const [local, setLocal] = useState(value);
  const debounced = useDebounce(local, 250);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (debounced !== value) {
      onChange(debounced);
    }
  }, [debounced, onChange, value]);

  useEffect(() => {
    if (value === '') {
      setLocal('');
    }
  }, [value]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="search-bar">
      <span className="search-icon" aria-hidden="true">⌕</span>
      <input
        ref={inputRef}
        type="text"
        className="search-input"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        aria-label="Search records"
        autoComplete="off"
        spellCheck={false}
      />
      {local && (
        <button
          className="search-clear"
          onClick={() => { setLocal(''); onChange(''); }}
          aria-label="Clear search"
        >
          X
        </button>
      )}
      <kbd className="search-kbd">/</kbd>
    </div>
  );
}
