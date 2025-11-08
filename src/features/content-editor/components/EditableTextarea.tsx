// features/content-editor/components/EditableTextarea.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PROMPT_PLACEHOLDERS } from '../data/promptConfig';

// Extend the props from the base Textarea component
interface EditableTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
    label?: string; // Make label optional for more flexible composition
    isResizable?: boolean;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    className?: string;
    onUndo?: () => void;
    onRedo?: () => void;
}

// Helper to copy textarea styles to the hidden div for accurate measurement
const copyStyles = (from: HTMLElement, to: HTMLElement) => {
    const computed = window.getComputedStyle(from);
    const styles = ['font-size', 'font-family', 'font-weight', 'line-height', 'padding', 'border-width', 'letter-spacing', 'text-transform', 'white-space', 'word-wrap', 'word-break', 'box-sizing'];
    styles.forEach(prop => {
        to.style.setProperty(prop, computed.getPropertyValue(prop));
    });
    to.style.width = from.clientWidth + 'px'; // Ensure width matches for wrapping
};


const EditableTextarea: React.FC<EditableTextareaProps> = (props) => {
    const { value, onChange, label, className, isResizable = false, onUndo, onRedo, ...rest } = props;
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const hiddenDivRef = useRef<HTMLDivElement>(null);

    const [suggestions, setSuggestions] = useState<{ placeholder: string; description: string; }[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestionPosition, setSuggestionPosition] = useState({ top: 0, left: 0 });
    const [activeIndex, setActiveIndex] = useState(0);
    const [triggerIndex, setTriggerIndex] = useState(-1);

    const closeSuggestions = useCallback(() => {
        setShowSuggestions(false);
        setSuggestions([]);
        setActiveIndex(0);
        setTriggerIndex(-1);
    }, []);

    const handleSuggestionClick = (suggestion: string) => {
        if (!textareaRef.current || triggerIndex === -1) return;
        
        const currentValue = textareaRef.current.value;
        const query = currentValue.substring(triggerIndex, textareaRef.current.selectionStart);
        const newValue = 
            currentValue.substring(0, triggerIndex) + 
            suggestion + 
            currentValue.substring(triggerIndex + query.length);

        const syntheticEvent = { target: { ...textareaRef.current, value: newValue } } as React.ChangeEvent<HTMLTextAreaElement>;
        onChange?.(syntheticEvent);
        closeSuggestions();

        setTimeout(() => {
            textareaRef.current?.focus();
            const newCursorPos = triggerIndex + suggestion.length;
            textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange?.(e);

        const cursorPosition = e.target.selectionStart;
        const text = e.target.value;
        const lastOpenBrace = text.lastIndexOf('{', cursorPosition - 1);
        const hasSpaceAfterBrace = text.substring(lastOpenBrace + 1, cursorPosition).includes(' ');
        const hasCloseBrace = text.substring(lastOpenBrace + 1, cursorPosition).includes('}');

        if (lastOpenBrace !== -1 && !hasSpaceAfterBrace && !hasCloseBrace) {
            const query = text.substring(lastOpenBrace, cursorPosition).toLowerCase();
            const filtered = PROMPT_PLACEHOLDERS.filter(p => p.placeholder.toLowerCase().startsWith(query));

            if (filtered.length > 0 && hiddenDivRef.current && textareaRef.current) {
                setSuggestions(filtered);
                setShowSuggestions(true);
                setTriggerIndex(lastOpenBrace);
                setActiveIndex(0);

                copyStyles(textareaRef.current, hiddenDivRef.current);
                const textForPositioning = text.substring(0, lastOpenBrace);
                hiddenDivRef.current.innerHTML = textForPositioning
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/\n/g, '<br />') + '<span>&nbsp;</span>';
                
                const span = hiddenDivRef.current.querySelector('span')!;
                let lineHeight = parseFloat(window.getComputedStyle(textareaRef.current).lineHeight);
                if (isNaN(lineHeight)) {
                    const fontSize = parseFloat(window.getComputedStyle(textareaRef.current).fontSize);
                    lineHeight = isNaN(fontSize) ? 20 : fontSize * 1.4;
                }
                
                const top = span.offsetTop - textareaRef.current.scrollTop + lineHeight;
                const left = span.offsetLeft - textareaRef.current.scrollLeft;
                
                setSuggestionPosition({ top, left });

            } else {
                closeSuggestions();
            }
        } else {
            closeSuggestions();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (showSuggestions) {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(prev => (prev + 1) % suggestions.length); } 
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(prev => (prev - 1 + suggestions.length) % suggestions.length); } 
            else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); if (suggestions[activeIndex]) handleSuggestionClick(suggestions[activeIndex].placeholder); } 
            else if (e.key === 'Escape') { e.preventDefault(); closeSuggestions(); }
        }

        // Undo/Redo logic
        if (e.ctrlKey) {
            if (e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    onRedo?.();
                } else {
                    onUndo?.();
                }
            } else if (e.key.toLowerCase() === 'y') {
                e.preventDefault();
                onRedo?.();
            }
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (textareaRef.current && !textareaRef.current.contains(event.target as Node)) closeSuggestions();
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [closeSuggestions]);

    const baseClasses = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-slate-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors disabled:opacity-50 bg-clip-padding';
    const resizeClass = isResizable ? 'resize-y' : 'resize-none';
    const textareaSpecificClasses = `${resizeClass} overflow-y-auto read-only:bg-zinc-900 read-only:cursor-not-allowed read-only:opacity-70`;

    return (
        <div className={`relative w-full h-full flex flex-col ${className || ''}`}>
            {label && <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>}
             <textarea
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                className={`${baseClasses} ${textareaSpecificClasses} flex-grow`}
                {...rest}
            />
            
            <div 
                ref={hiddenDivRef} 
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    visibility: 'hidden',
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                    overflow: 'hidden'
                }}
            ></div>
            
            {showSuggestions && (
                <div
                    className="absolute z-10 w-80 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl max-h-60 overflow-y-auto"
                    style={{ 
                        top: `${suggestionPosition.top}px`, 
                        left: `${suggestionPosition.left}px` 
                    }}
                >
                    <ul className="py-1">
                        {suggestions.map((s, index) => (
                            <li
                                key={s.placeholder}
                                className={`px-3 py-2 cursor-pointer ${index === activeIndex ? 'bg-amber-600/20' : 'hover:bg-zinc-700'}`}
                                onMouseDown={(e) => { e.preventDefault(); handleSuggestionClick(s.placeholder); }}
                            >
                                <p className="font-bold text-amber-300 text-sm">{s.placeholder}</p>
                                <p className="text-xs text-slate-400 font-body-serif">{s.description}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default EditableTextarea;