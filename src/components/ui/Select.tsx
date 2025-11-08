// components/ui/Select.tsx
// Um componente de seleção (dropdown) customizado, construído para se integrar
// ao design do aplicativo. Ele substitui o elemento `<select>` nativo do HTML
// para permitir maior controle sobre a estilização.

import React, { useState, useRef, useEffect } from 'react';
import Icon from './Icon';

interface Option {
    value: string;
    label: string;
}

interface SelectProps {
    /** O texto do label a ser exibido acima do seletor. */
    label: string;
    /** Uma lista de objetos de opção, cada um com `value` e `label`. */
    options: Option[];
    /** O valor da opção atualmente selecionada. */
    value: string;
    /** Função chamada quando uma nova opção é selecionada. */
    onChange: (value: string) => void;
    /** Se verdadeiro, desabilita o seletor. */
    disabled?: boolean;
}

const Select: React.FC<SelectProps> = ({ label, options, value, onChange, disabled = false }) => {
    // Estado para controlar se a lista de opções está aberta ou fechada.
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    
    const selectedOption = options.find(opt => opt.value === value);

    // Efeito para fechar a lista de opções quando o usuário clica fora do componente.
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);

    /**
     * Manipulador para quando o usuário seleciona uma opção na lista.
     * @param optionValue O valor da opção selecionada.
     */
    const handleSelect = (optionValue: string) => {
        if (!disabled) {
            onChange(optionValue);
            setIsOpen(false);
        }
    };

    return (
        <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
            <div className="relative" ref={wrapperRef}>
                {/* O botão que exibe a opção selecionada e abre/fecha a lista. */}
                <button
                    type="button"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-slate-200 text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    disabled={disabled}
                    aria-haspopup="listbox"
                    aria-expanded={isOpen}
                >
                    <span>{selectedOption?.label || (options.length > 0 ? options[0].label : '...')}</span>
                    <Icon name="next" className={`w-5 h-5 text-zinc-400 transform transition-transform duration-200 ${isOpen ? '-rotate-90' : 'rotate-90'}`} />
                </button>

                {/* A lista de opções, renderizada condicionalmente. */}
                {isOpen && !disabled && (
                    <ul
                        className="absolute z-50 mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl max-h-60 overflow-auto focus:outline-none animate-fade-in-sm"
                        role="listbox"
                    >
                        {options.map((option) => (
                            <li
                                key={option.value}
                                className={`text-slate-200 cursor-pointer select-none relative py-2.5 px-4 hover:bg-amber-600/20 transition-colors ${value === option.value ? 'font-semibold text-amber-300' : 'font-normal'}`}
                                role="option"
                                aria-selected={value === option.value}
                                onClick={() => handleSelect(option.value)}
                            >
                                <span className="block truncate">{option.label}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default Select;
