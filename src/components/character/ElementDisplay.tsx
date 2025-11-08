// components/character/ElementDisplay.tsx
// Um componente de UI que exibe o valor de um único Elemento (Fogo, Água, Ar, Terra)
// com seu ícone e cor correspondentes.

import React from 'react';
import Icon from '../ui/Icon';
import { Element } from '../../types/character';

interface ElementDisplayProps {
    /** O nome do elemento a ser exibido. */
    name: Element;
    /** O valor numérico do elemento. */
    value: number;
}

const ElementDisplay: React.FC<ElementDisplayProps> = ({ name, value }) => {
    // Mapeamento de elementos para suas classes de cor no Tailwind CSS.
    // Isso centraliza a estilização e facilita a manutenção.
    const colors: Record<Element, string> = {
        fire: 'text-orange-400 border-orange-400/50',
        water: 'text-cyan-400 border-cyan-400/50',
        air: 'text-slate-300 border-slate-400/50',
        earth: 'text-green-400 border-green-400/50'
    };

    return (
        <div className="flex flex-col items-center gap-2">
            <div className={`w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center border-2 ${colors[name]}`}>
                 <Icon name={name} className={`${colors[name].split(' ')[0]} w-8 h-8`} />
            </div>
            <span className={`font-display text-slate-200 text-3xl`}>{value}</span>
        </div>
    );
};

export default ElementDisplay;
