// components/ui/Select.tsx
// Select customizado com suporte a teclado, tokens Arcana e mensagens de erro consistentes.

import React, { useState, useRef, useEffect, useId } from 'react';
import Icon from './Icon';

interface Option {
    value: string;
    label: string;
}

interface SelectProps {
    label: string;
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    helperText?: string;
    error?: string;
}

const Select: React.FC<SelectProps> = ({
    label,
    options,
    value,
    onChange,
    placeholder = 'Selecione...',
    disabled = false,
    helperText,
    error,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(() => options.findIndex((opt) => opt.value === value));
    const wrapperRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const generatedId = useId();
    const selectId = `select-${generatedId}`;
    const listboxId = `${selectId}-listbox`;
    const helperId = helperText || error ? `${selectId}-helper` : undefined;

    const selectedOption = options.find((opt) => opt.value === value);

    useEffect(() => {
        setActiveIndex(options.findIndex((opt) => opt.value === value));
    }, [value, options]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen && listRef.current && activeIndex >= 0) {
            const optionNode = listRef.current.children[activeIndex] as HTMLElement | undefined;
            optionNode?.scrollIntoView({ block: 'nearest' });
        }
    }, [isOpen, activeIndex]);

    const moveActiveIndex = (direction: 1 | -1) => {
        if (!options.length) return;
        setActiveIndex((prev) => {
            const startIndex = prev >= 0 ? prev : options.findIndex((opt) => opt.value === value);
            const nextIndex = startIndex === -1 ? (direction === 1 ? 0 : options.length - 1) : startIndex + direction;
            const wrappedIndex = (nextIndex + options.length) % options.length;
            return wrappedIndex;
        });
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (disabled) return;
        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                if (!isOpen) setIsOpen(true);
                moveActiveIndex(1);
                break;
            case 'ArrowUp':
                event.preventDefault();
                if (!isOpen) setIsOpen(true);
                moveActiveIndex(-1);
                break;
            case 'Enter':
            case ' ':
                event.preventDefault();
                if (isOpen) {
                    const option = options[activeIndex];
                    if (option) {
                        onChange(option.value);
                        setIsOpen(false);
                    }
                } else {
                    setIsOpen(true);
                }
                break;
            case 'Escape':
                if (isOpen) {
                    event.preventDefault();
                    setIsOpen(false);
                }
                break;
            default:
                break;
        }
    };

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    const labelClasses = 'block text-sm font-medium text-arcana-parchment-200 mb-2';
    const buttonClasses = `w-full rounded-2xl border px-4 py-3 text-left flex items-center justify-between transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arcana-aura-400 ${
        error ? 'border-arcana-rose-400' : 'border-arcana-ink-700'
    } ${disabled ? 'opacity-50 cursor-not-allowed bg-arcana-ink-900' : 'bg-arcana-ink-800/90'}`;

    return (
        <div>
            <label className={labelClasses} htmlFor={selectId}>
                {label}
            </label>
            <div className="relative" ref={wrapperRef}>
                <button
                    id={selectId}
                    type="button"
                    className={buttonClasses}
                    onClick={() => !disabled && setIsOpen((prev) => !prev)}
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                    aria-haspopup="listbox"
                    aria-expanded={isOpen}
                    aria-controls={listboxId}
                    aria-invalid={Boolean(error)}
                    aria-describedby={helperId}
                >
                    <span className="text-arcana-parchment-100">
                        {selectedOption?.label || placeholder}
                    </span>
                    <Icon
                        name="next"
                        className={`w-5 h-5 text-arcana-parchment-300 transform transition-transform duration-200 ${
                            isOpen ? '-rotate-90' : 'rotate-90'
                        }`}
                    />
                </button>

                {isOpen && !disabled && (
                    <ul
                        ref={listRef}
                        id={listboxId}
                        className="absolute z-50 mt-2 w-full rounded-2xl border border-arcana-ink-700 bg-arcana-ink-900/95 shadow-arcana-card max-h-60 overflow-auto focus-visible:outline-none"
                        role="listbox"
                        aria-activedescendant={activeIndex >= 0 ? `${selectId}-option-${options[activeIndex].value}` : undefined}
                    >
                        {options.map((option, index) => {
                            const isSelected = option.value === value;
                            const isActive = index === activeIndex;
                            return (
                                <li
                                    key={option.value}
                                    id={`${selectId}-option-${option.value}`}
                                    role="option"
                                    aria-selected={isSelected}
                                    className={`cursor-pointer select-none px-4 py-2.5 text-sm transition-colors ${
                                        isActive ? 'bg-white/10' : ''
                                    } ${isSelected ? 'text-arcana-ember-300 font-semibold' : 'text-arcana-parchment-100'}`}
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() => handleSelect(option.value)}
                                >
                                    <span className="block truncate">{option.label}</span>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
            {(helperText || error) && (
                <p id={helperId} className={`mt-2 text-xs font-medium ${error ? 'text-arcana-rose-400' : 'text-arcana-parchment-300'}`}>
                    {error || helperText}
                </p>
            )}
        </div>
    );
};

export default Select;
