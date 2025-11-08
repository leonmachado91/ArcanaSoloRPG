// components/ui/Button.tsx
// Componente de botão reutilizável que suporta diferentes estilos visuais (variantes),
// um estado de carregamento e acessibilidade.

import React from 'react';
import Spinner from './Spinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    /** Define o estilo visual do botão. */
    variant?: 'primary' | 'secondary' | 'ghost';
    /** O conteúdo a ser exibido dentro do botão (texto, ícones, etc.). */
    children: React.ReactNode;
    /** Se verdadeiro, exibe um spinner em vez do conteúdo e desabilita o botão. */
    isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({ variant = 'primary', children, className, isLoading = false, ...props }) => {
    // Classes base aplicadas a todos os botões para consistência.
    const baseClasses = 'font-bold rounded-lg transform transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed';
    
    // Mapeamento de variantes para classes de estilo específicas.
    const variantStyles = {
        primary: 'shadow-lg bg-amber-600 text-white border-b-4 border-amber-800 hover:bg-amber-500 hover:border-amber-700 focus:ring-amber-400 focus:ring-opacity-50 active:translate-y-0.5 active:border-b-2',
        secondary: 'shadow-lg bg-zinc-800 text-slate-200 border-b-4 border-zinc-900 hover:bg-zinc-700 focus:ring-zinc-600 focus:ring-opacity-50 active:translate-y-0.5 active:border-b-2',
        ghost: 'bg-transparent text-slate-300 hover:bg-zinc-800 hover:text-white shadow-none active:translate-y-0',
    };

    // Botões `ghost` não precisam de padding, pois são geralmente usados para ícones.
    const paddingClass = (variant === 'primary' || variant === 'secondary') ? 'px-6 py-3' : '';

    return (
        <button 
            className={`${baseClasses} ${variantStyles[variant]} ${paddingClass} ${className || ''}`} 
            disabled={isLoading || props.disabled} 
            {...props}
        >
            {/* Renderização condicional: mostra Spinner se `isLoading` for verdadeiro. */}
            {isLoading ? <Spinner /> : children}
        </button>
    );
};

export default Button;
