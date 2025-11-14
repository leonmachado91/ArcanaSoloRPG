// features/game-room/components/Composer.tsx
// Componente que abstrai o textarea do PlayerInputBar, mantendo atalhos e limites sem alterar o visual.
import React, { forwardRef, useRef, useEffect, useImperativeHandle } from 'react';

interface ComposerProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange' | 'onKeyDown'> {
    value: string;
    onValueChange: (value: string) => void;
    maxLength?: number;
    placeholder?: string;
    disabled?: boolean;
    onSubmitShortcut?: () => void;
}

const Composer = forwardRef<HTMLTextAreaElement, ComposerProps>(
    (
        {
            value,
            onValueChange,
            maxLength = 1200,
            placeholder = 'Descreva sua ação...',
            disabled = false,
            onSubmitShortcut,
            className,
            ...rest
        },
        ref
    ) => {
        const textareaRef = useRef<HTMLTextAreaElement>(null);
        const { onKeyDown, ...textareaRest } = rest;

        useImperativeHandle(ref, () => textareaRef.current!, []);

        useEffect(() => {
            const textarea = textareaRef.current;
            if (!textarea) return;
            textarea.style.height = 'auto';
            const maxHeight = 200;
            textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
        }, [value, disabled]);

        const handleComposerKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
            const shouldSubmit = event.key === 'Enter' && !event.shiftKey && !event.isComposing;
            if (shouldSubmit) {
                event.preventDefault();
                if (!disabled) {
                    onSubmitShortcut?.();
                }
            }
            onKeyDown?.(event);
        };

        const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
            const nextValue = event.target.value;
            if (nextValue.length <= maxLength) {
                onValueChange(nextValue);
            }
        };

        return (
            <div className={`flex w-full ${className ?? ''}`}>
                <textarea
                    ref={textareaRef}
                    aria-label="Área de composição"
                    placeholder={placeholder}
                    value={value}
                    disabled={disabled}
                    maxLength={maxLength}
                    rows={1}
                    onChange={handleChange}
                    onKeyDown={handleComposerKeyDown}
                    className="flex-1 max-h-48 bg-transparent text-slate-300 placeholder:text-slate-500 focus:outline-none disabled:opacity-50 resize-none leading-relaxed py-2"
                    {...textareaRest}
                />
            </div>
        );
    }
);

Composer.displayName = 'Composer';

export default Composer;
