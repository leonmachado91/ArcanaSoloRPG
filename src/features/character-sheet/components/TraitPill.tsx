// features/character-sheet/components/TraitPill.tsx
import React from 'react';
import { useCatalogStore } from '@/store/catalogStore';
import { Element } from '@/types/character';
import Icon from '@/components/ui/Icon';

/**
 * TraitPill
 * Exibe uma Vantagem ou Desvantagem com um tooltip informativo.
 * [Refatoração]: Movido e atualizado para usar o `useCatalogStore`.
 */
const TraitPill: React.FC<{ 
    traitName: string; 
    tooltipAlign?: 'left' | 'right' | 'center';
}> = ({ traitName, tooltipAlign = 'center' }) => {
    // Usa o store unificado para buscar os dados do trait.
    const traits = useCatalogStore(state => state.traits);
    const traitData = traits.find(t => t.name === traitName);

    const type = traitData?.type || 'advantage';
    const colorClass = type === 'advantage' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300';
    const description = traitData ? traitData.description : 'Informação não encontrada.';

    const elementIconColors: Record<Element, string> = {
        fire: 'text-orange-400',
        water: 'text-cyan-400',
        air: 'text-slate-300',
        earth: 'text-green-400'
    };

    const tooltipPositionClasses = {
        left: 'left-0',
        right: 'right-0',
        center: 'left-1/2 -translate-x-1/2',
    };

    return (
        <div className="relative group">
            <div className={`text-xs px-2.5 py-1 rounded-full ${colorClass} flex items-center gap-1.5`}>
                {traitData && <Icon name={traitData.element} className={`w-3.5 h-3.5 ${elementIconColors[traitData.element]}`} />}
                {traitName}
            </div>
            <div className={`absolute bottom-full mb-2 w-64 p-3 bg-zinc-900 border border-zinc-700 text-slate-200 text-sm rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 
                before:content-[''] before:absolute before:top-full before:border-8 before:border-transparent before:border-t-zinc-700
                ${tooltipPositionClasses[tooltipAlign]}
                ${tooltipAlign === 'center' ? 'before:left-1/2 before:-translate-x-1/2' : ''}
                ${tooltipAlign === 'left' ? 'before:left-4' : ''}
                ${tooltipAlign === 'right' ? 'before:right-4' : ''}
            `}>
                {traitData && (
                    <div className="flex items-center gap-2 mb-1">
                        <Icon name={traitData.element} className={`w-4 h-4 ${elementIconColors[traitData.element]}`} />
                        <h4 className="font-bold">{traitData.name}</h4>
                    </div>
                )}
                <p className="font-body-serif">{description}</p>
            </div>
        </div>
    );
};

export default TraitPill;