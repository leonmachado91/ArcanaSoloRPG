// components/character/TraitButton.tsx
// Um componente de botão especializado para Vantagens e Desvantagens.
// Ele exibe o nome do trait e, ao passar o mouse, mostra um tooltip
// com a descrição detalhada e o elemento associado.

import React from 'react';
import { TraitDefinition, Element } from '../../types/character';
import Icon from '../ui/Icon';

interface TraitButtonProps {
    /** O objeto de definição do trait a ser exibido. */
    trait: TraitDefinition;
    /** Se o trait está atualmente selecionado. */
    isSelected: boolean;
    /** Função chamada quando o botão é clicado. */
    onClick: () => void;
    /** O tipo do trait, para aplicar a estilização correta (verde para vantagem, vermelho para desvantagem). */
    type: 'advantage' | 'disadvantage';
    /** Se o botão deve estar desabilitado. */
    disabled?: boolean;
}

// Mapeamento de cores para os botões selecionados, baseado no elemento.
const elementButtonColors: Record<Element, string> = {
    fire: 'bg-orange-600 border-orange-500 text-white',
    water: 'bg-cyan-500 border-cyan-400 text-white',
    air: 'bg-slate-500 border-slate-400 text-white',
    earth: 'bg-green-600 border-green-500 text-white',
};

const TraitButton: React.FC<TraitButtonProps> = ({ trait, isSelected, onClick, type, disabled = false }) => {
    
    // Define as classes de cor com base no tipo e no estado de seleção.
    const advantageColor = elementButtonColors[trait.element];
    const disadvantageColor = 'bg-red-600 border-red-500 text-white';
    const normalColor = 'bg-zinc-700 border-zinc-600 hover:bg-zinc-600';
    
    const selectedClass = type === 'advantage' ? advantageColor : disadvantageColor;

    // Mapeamento de cores para os ícones de elemento dentro do tooltip.
    const elementIconColors: Record<Element, string> = {
        fire: 'text-orange-300',
        water: 'text-cyan-300',
        air: 'text-slate-200',
        earth: 'text-green-300'
    };


    return (
        // O `div` com `group` permite que o tooltip (`div` interno) se torne visível
        // quando o mouse passa sobre qualquer parte do wrapper.
        <div className="relative group">
            <button
                onClick={onClick}
                disabled={disabled}
                className={`w-full text-left px-3 py-1 text-sm rounded-full border transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed ${
                    isSelected 
                    ? selectedClass
                    : normalColor
                }`}
            >
                {trait.name}
            </button>
            {/* Tooltip de descrição, visível apenas no hover (`group-hover:opacity-100`). */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-zinc-900 border border-zinc-700 text-slate-200 text-sm rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 before:content-[''] before:absolute before:top-full before:left-1/2 before:-translate-x-1/2 before:border-8 before:border-transparent before:border-t-zinc-700">
                <div className="flex items-center gap-2 mb-1">
                    <Icon name={trait.element} className={`w-4 h-4 ${elementIconColors[trait.element]}`} />
                    <h4 className="font-bold">{trait.name}</h4>
                </div>
                <p className="font-body-serif">{trait.description}</p>
            </div>
        </div>
    );
};

export default TraitButton;
