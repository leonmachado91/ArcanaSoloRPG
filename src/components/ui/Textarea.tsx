// components/ui/Textarea.tsx
// Componente de área de texto reutilizável com funcionalidades extras, como
// auto-ajuste de altura e a opção de permitir redimensionamento manual pelo usuário.

import React, { useRef, useEffect, forwardRef, useImperativeHandle, useId } from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    /** O texto a ser exibido no label acima do campo. */
    label?: string;
    /** Classe adicional aplicada ao label, útil para esconder visualmente sem perder acessibilidade. */
    labelClassName?: string;
    /** Se verdadeiro, permite que o usuário redimensione verticalmente o textarea. */
    isResizable?: boolean;
    /** Texto auxiliar exibido abaixo do campo quando não há erros. */
    helperText?: string;
    /** Mensagem de erro com estilo padrão do design system. */
    error?: string;
    /** Quando verdadeiro, oculta o label mantendo acessibilidade. */
    labelHidden?: boolean;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ label, labelClassName, helperText, error, labelHidden = false, className, isResizable = false, ...props }, ref) => {
        const localRef = useRef<HTMLTextAreaElement>(null);
        const generatedId = useId();
        const textareaId = props.id ?? generatedId;

        // Expose the local ref to the parent component via the forwarded ref.
        useImperativeHandle(ref, () => localRef.current!, []);

        // Efeito para ajustar a altura do textarea ao conteúdo digitado.
        useEffect(() => {
            const textarea = localRef.current;
            if (textarea && !props.readOnly && !isResizable) {
                textarea.style.height = 'auto';
                textarea.style.height = `${textarea.scrollHeight}px`;
            }
        }, [props.value, props.readOnly, isResizable]);

        const baseClasses =
            'w-full rounded-2xl border bg-arcana-ink-800/90 px-4 py-3 text-arcana-parchment-100 placeholder:text-arcana-parchment-300/60 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arcana-aura-400 focus-visible:border-arcana-aura-400 disabled:opacity-50 disabled:cursor-not-allowed bg-clip-padding';
        const borderClasses = error ? 'border-arcana-rose-400 focus-visible:ring-arcana-rose-400' : 'border-arcana-ink-700';
        const resizeClass = isResizable ? 'resize-y' : 'resize-none';
        const textareaSpecificClasses = `min-h-[4rem] ${resizeClass} overflow-y-auto read-only:bg-zinc-900 read-only:cursor-not-allowed read-only:opacity-70`;
        const shouldRenderLabel = Boolean(label?.trim());
        const labelClasses = `${
            labelHidden ? 'sr-only' : 'block text-sm font-medium text-arcana-parchment-200 mb-2'
        } ${labelClassName || ''}`.trim();
        const helperClasses = error ? 'text-arcana-rose-400' : 'text-arcana-parchment-300';

        return (
            <div>
                {shouldRenderLabel && (
                    <label className={labelClasses} htmlFor={textareaId}>
                        {label}
                    </label>
                )}
                <textarea
                    ref={localRef}
                    id={textareaId}
                    className={`${baseClasses} ${borderClasses} ${textareaSpecificClasses} ${className || ''}`}
                    aria-invalid={Boolean(error)}
                    aria-describedby={helperText || error ? `${textareaId}-helper` : undefined}
                    {...props}
                />
                {(helperText || error) && (
                    <p id={`${textareaId}-helper`} className={`mt-2 text-xs font-medium ${helperClasses}`}>
                        {error || helperText}
                    </p>
                )}
            </div>
        );
    }
);

Textarea.displayName = 'Textarea';

export default Textarea;
