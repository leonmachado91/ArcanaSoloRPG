// components/ui/Input.tsx
// Um componente de input de texto estilizado e reutilizável, que inclui um label associado
// para melhor acessibilidade e consistência visual.

import React, { useId } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    /** O texto a ser exibido no label acima do campo de input. */
    label?: string;
    /** Texto auxiliar exibido abaixo do campo quando nǜo hǭ erros. */
    helperText?: string;
    /** Mensagem de erro que tambǸm ativa o estado visual de alerta. */
    error?: string;
    /** Quando verdadeiro, oculta visualmente o label mantendo acessibilidade. */
    labelHidden?: boolean;
}

const Input: React.FC<InputProps> = ({ label, helperText, error, labelHidden = false, className, ...props }) => {
    const generatedId = useId();
    const inputId = props.id ?? generatedId;
    const baseClasses =
        'w-full rounded-2xl border bg-arcana-ink-800/90 px-4 py-3 text-arcana-parchment-100 placeholder:text-arcana-parchment-300/60 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arcana-aura-400 focus-visible:border-arcana-aura-400 disabled:opacity-50 disabled:cursor-not-allowed';
    const borderClasses = error ? 'border-arcana-rose-400 focus-visible:ring-arcana-rose-400' : 'border-arcana-ink-700';
    const labelClasses = labelHidden ? 'sr-only' : 'block text-sm font-medium text-arcana-parchment-200 mb-2';
    const helperClasses = error ? 'text-arcana-rose-400' : 'text-arcana-parchment-300';

    const inputElement = (
        <input
            id={inputId}
            className={`${baseClasses} ${borderClasses} ${className || ''}`}
            aria-invalid={Boolean(error)}
            aria-describedby={helperText || error ? `${inputId}-helper` : undefined}
            {...props}
        />
    );

    return (
        <div>
            {label && (
                <label className={labelClasses} htmlFor={inputId}>
                    {label}
                </label>
            )}
            {inputElement}
            {(helperText || error) && (
                <p id={`${inputId}-helper`} className={`mt-2 text-xs font-medium ${helperClasses}`}>
                    {error || helperText}
                </p>
            )}
        </div>
    );
};

export default Input;
