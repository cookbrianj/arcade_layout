import React, { useEffect, useState } from 'react';

interface NumericInputProps {
  value: number | string;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number | string;
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
}

export const NumericInput: React.FC<NumericInputProps> = ({
  value,
  onChange,
  min = 1,
  max = 10000,
  step = 'any',
  className = '',
  placeholder,
  autoFocus = false,
}) => {
  const [localText, setLocalText] = useState<string>(String(value ?? ''));
  const [isFocused, setIsFocused] = useState<boolean>(false);

  // Sync from props only when not focused
  useEffect(() => {
    if (!isFocused) {
      setLocalText(String(value ?? ''));
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setLocalText(raw);

    if (raw.trim() === '') return;

    const parsed = parseFloat(raw);
    if (!isNaN(parsed) && parsed >= min && parsed <= max) {
      onChange(parsed);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = parseFloat(localText);
    if (isNaN(parsed) || parsed < min) {
      const fallback = Math.max(min, typeof value === 'number' ? value : min);
      setLocalText(String(fallback));
      onChange(fallback);
    } else {
      const clamped = Math.min(max, Math.max(min, parsed));
      setLocalText(String(clamped));
      onChange(clamped);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setLocalText(String(value ?? ''));
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <input
      type="number"
      step={step}
      min={min}
      max={max}
      value={localText}
      autoFocus={autoFocus}
      placeholder={placeholder}
      onChange={handleChange}
      onFocus={(e) => {
        setIsFocused(true);
        e.target.select();
      }}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className={className}
    />
  );
};

