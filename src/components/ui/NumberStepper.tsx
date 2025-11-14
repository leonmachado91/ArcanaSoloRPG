// components/ui/NumberStepper.tsx
// Stepper numérico acessível com tokens Arcana, foco visível e mensagens de erro padrão.

import React, { useId } from 'react';

interface NumberStepperProps {
    label: string;
    value: number;
    onChange: (newValue: number) => void;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    helperText?: string;
    error?: string;
}

const NumberStepper: React.FC<NumberStepperProps> = ({
    label,
    value,
    onChange,
    min = 0,
    max = 5,
    step = 1,
    disabled = false,
    helperText,
    error,
}) => {
    const generatedId = useId();
    const helperId = helperText || error ? `stepper-${generatedId}-helper` : undefined;

    const clamp = (next: number) => Math.min(max, Math.max(min, next));
    const increment = () => onChange(clamp(value + step));
    const decrement = () => onChange(clamp(value - step));

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (disabled) return;
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            increment();
        } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            decrement();
        }
    };

    const controlClasses =
        'w-10 h-10 flex items-center justify-center rounded-2xl border border-arcana-ink-600 bg-arcana-ink-800/80 text-arcana-parchment-100 text-lg transition hover:border-arcana-ember-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arcana-aura-400 disabled:opacity-40 disabled:cursor-not-allowed';

    return (
        <div>
            <label className="block text-sm font-medium text-arcana-parchment-200 mb-2 text-center">{label}</label>
            <div className="flex items-center justify-center gap-4">
                <button
                    type="button"
                    onClick={decrement}
                    disabled={disabled || value <= min}
                    className={controlClasses}
                    aria-label="Diminuir valor"
                >
                    -
                </button>
                <div
                    role="spinbutton"
                    tabIndex={disabled ? -1 : 0}
                    aria-valuenow={value}
                    aria-valuemin={min}
                    aria-valuemax={max}
                    aria-readonly={disabled}
                    aria-describedby={helperId}
                    onKeyDown={handleKeyDown}
                    className={`w-20 text-center text-4xl font-display text-arcana-parchment-50 ${
                        disabled ? 'opacity-60' : ''
                    }`}
                >
                    {value}
                </div>
                <button
                    type="button"
                    onClick={increment}
                    disabled={disabled || value >= max}
                    className={controlClasses}
                    aria-label="Aumentar valor"
                >
                    +
                </button>
            </div>
            {(helperText || error) && (
                <p id={helperId} className={`mt-2 text-xs text-center font-medium ${error ? 'text-arcana-rose-400' : 'text-arcana-parchment-300'}`}>
                    {error || helperText}
                </p>
            )}
        </div>
    );
};

export default NumberStepper;
