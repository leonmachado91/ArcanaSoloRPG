// components/ui/Input.tsx
// Um componente de input de texto estilizado e reutilizável, que inclui um label associado
// para melhor acessibilidade e consistência visual.

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    /** O texto a ser exibido no label acima do campo de input. */
    label?: string;
}

const Input: React.FC<InputProps> = ({ label, className, ...props }) => {
    const baseClasses = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-slate-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors disabled:opacity-50';
    
    const inputElement = (
        <input 
            className={`${baseClasses} ${className || ''}`} 
            {...props} 
        />
    );

    if (!label) {
        return inputElement;
    }
    
    return (
        <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
            {inputElement}
        </div>
    );
};

export default Input;