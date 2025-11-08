// components/ui/Textarea.tsx
// Componente de área de texto reutilizável com funcionalidades extras, como
// auto-ajuste de altura e a opção de permitir redimensionamento manual pelo usuário.

import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    /** O texto a ser exibido no label acima do campo. */
    label: string;
    /** Se verdadeiro, permite que o usuário redimensione verticalmente o textarea. */
    isResizable?: boolean;
}

// FIX: Wrap the Textarea component in `React.forwardRef` to allow it to receive a ref from its parent.
// This is necessary for components like `EditableTextarea` which need direct access to the textarea DOM node.
const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ label, className, isResizable = false, ...props }, ref) => {
    const localRef = useRef<HTMLTextAreaElement>(null);

    // Expose the local ref to the parent component via the forwarded ref.
    useImperativeHandle(ref, () => localRef.current!, []);

    // Efeito para ajustar a altura do textarea ao conteúdo digitado.
    useEffect(() => {
        const textarea = localRef.current;
        // O ajuste automático de altura NÃO deve ser executado se o textarea for redimensionável manualmente,
        // para evitar conflitos de comportamento.
        if (textarea && !props.readOnly && !isResizable) {
            textarea.style.height = 'auto'; // Reseta a altura para recalcular corretamente ao apagar texto.
            textarea.style.height = `${textarea.scrollHeight}px`; // Ajusta a altura para o conteúdo.
        }
    }, [props.value, props.readOnly, isResizable]);

    // Classes de base para um estilo consistente.
    const baseClasses = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-slate-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors disabled:opacity-50 bg-clip-padding';
    
    // Classe condicional para permitir ou não o redimensionamento.
    const resizeClass = isResizable ? 'resize-y' : 'resize-none';
    
    // Classes específicas para o textarea, definindo altura mínima e comportamento de overflow.
    const textareaSpecificClasses = `min-h-[4rem] ${resizeClass} overflow-y-auto read-only:bg-zinc-900 read-only:cursor-not-allowed read-only:opacity-70`;

    return (
        <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
            <textarea
                ref={localRef}
                className={`${baseClasses} ${textareaSpecificClasses} ${className || ''}`}
                {...props}
            />
        </div>
    );
});

Textarea.displayName = 'Textarea';

export default Textarea;
