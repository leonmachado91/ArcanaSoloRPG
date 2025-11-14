// components/ui/Button.tsx
// Botão Arcana com variantes alinhadas aos tokens do design system, foco acessível e estados de loading.

import React from 'react';
import Spinner from './Spinner';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    isLoading?: boolean;
    fullWidth?: boolean;
    children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
    primary:
        'bg-arcana-ember-500 text-arcana-parchment-50 shadow-arcana-card hover:bg-arcana-ember-400 focus-visible:ring-arcana-ember-300',
    secondary:
        'bg-arcana-ink-800 text-arcana-parchment-100 border border-arcana-ink-600 hover:border-arcana-ember-400 hover:text-white focus-visible:ring-arcana-aura-400',
    ghost:
        'bg-transparent text-arcana-parchment-100 border border-transparent hover:border-arcana-ink-600 hover:bg-white/5 focus-visible:ring-arcana-aura-400',
};

const sizeClasses: Record<ButtonSize, string> = {
    sm: 'text-sm px-3 py-2 rounded-xl',
    md: 'text-sm px-4 py-2.5 rounded-2xl',
    lg: 'text-base px-6 py-3 rounded-2xl',
    icon: 'p-2 rounded-2xl',
};

const Button: React.FC<ButtonProps> = ({
    variant = 'primary',
    size = 'md',
    isLoading = false,
    fullWidth = false,
    children,
    className,
    ...props
}) => {
    const baseClasses =
        'inline-flex items-center justify-center gap-2 font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-arcana-ink-900 disabled:opacity-50 disabled:cursor-not-allowed';

    return (
        <button
            className={`${baseClasses} ${variantStyles[variant]} ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${
                className || ''
            }`}
            disabled={isLoading || props.disabled}
            aria-busy={isLoading}
            {...props}
        >
            {isLoading ? <Spinner /> : children}
        </button>
    );
};

export default Button;
