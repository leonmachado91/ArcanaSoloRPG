// components/ui/Toggle.tsx
// Interruptor acessível com tokens Arcana, helper/error text e estados de foco claros.

import React, { useId } from 'react';

interface ToggleProps {
    labelLeft?: string;
    labelRight: string;
    checked?: boolean;
    onChange?: (checked: boolean) => void;
    disabled?: boolean;
    helperText?: string;
    error?: string;
    className?: string;
}

const Toggle: React.FC<ToggleProps> = ({
    labelLeft,
    labelRight,
    checked = false,
    onChange,
    disabled = false,
    helperText,
    error,
    className,
}) => {
    const generatedId = useId();
    const inputId = `toggle-${generatedId}`;
    const helperId = helperText || error ? `${inputId}-helper` : undefined;

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (disabled) return;
        onChange?.(event.target.checked);
    };

    return (
        <div className={className}>
            <label htmlFor={inputId} className="flex items-center gap-3 cursor-pointer w-fit">
                {labelLeft && (
                    <span className={`text-sm font-semibold transition-colors ${!checked ? 'text-arcana-parchment-200' : 'text-arcana-ink-600'}`}>
                        {labelLeft}
                    </span>
                )}
                <span className="relative inline-flex items-center">
                    <input
                        id={inputId}
                        type="checkbox"
                        className="peer sr-only"
                        checked={checked}
                        disabled={disabled}
                        onChange={handleChange}
                        role="switch"
                        aria-checked={checked}
                        aria-disabled={disabled}
                        aria-describedby={helperId}
                    />
                    <span
                        className={`relative flex h-7 w-12 items-center rounded-full border transition-colors duration-300 focus-within:ring-2 focus-within:ring-arcana-aura-400 focus-within:ring-offset-2 focus-within:ring-offset-arcana-ink-900 ${
                            disabled ? 'opacity-60 cursor-not-allowed' : ''
                        } ${checked ? 'bg-arcana-ember-500 border-arcana-ember-400' : 'bg-arcana-ink-700 border-arcana-ink-600'} ${
                            error ? 'ring-1 ring-arcana-rose-400' : ''
                        }`}
                    >
                        <span
                            className={`absolute left-1 top-1 inline-block h-5 w-5 transform rounded-full bg-arcana-parchment-50 shadow transition-transform duration-300 ${
                                checked ? 'translate-x-5' : ''
                            } ${disabled ? 'opacity-70' : ''}`}
                        ></span>
                    </span>
                </span>
                <span className={`text-sm font-semibold transition-colors ${checked ? 'text-arcana-parchment-100' : 'text-arcana-ink-600'}`}>
                    {labelRight}
                </span>
            </label>
            {(helperText || error) && (
                <p id={helperId} className={`mt-2 text-xs font-medium ${error ? 'text-arcana-rose-400' : 'text-arcana-parchment-300'}`}>
                    {error || helperText}
                </p>
            )}
        </div>
    );
};

export default Toggle;
