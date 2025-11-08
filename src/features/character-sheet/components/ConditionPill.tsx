// features/character-sheet/components/ConditionPill.tsx
import React from 'react';

interface ConditionPillProps {
    condition: { 
        name: string; 
        description?: string; 
        type: 'positive' | 'negative'; 
        intensity?: 'Leve' | 'Moderado' | 'Grave';
    } 
}

/**
 * ConditionPill
 * Componente para exibir uma Condição (estado) com um tooltip informativo.
 */
const ConditionPill: React.FC<ConditionPillProps> = ({ condition }) => {
    let colorClass = 'bg-cyan-900 text-cyan-300'; // Padrão para positivo
    if (condition.intensity) {
        switch (condition.intensity) {
            case 'Leve':
                colorClass = 'bg-yellow-900 text-yellow-300';
                break;
            case 'Moderado':
                colorClass = 'bg-amber-800 text-amber-200';
                break;
            case 'Grave':
                colorClass = 'bg-red-900 text-red-300';
                break;
        }
    } else {
        colorClass = condition.type === 'positive' ? 'bg-cyan-900 text-cyan-300' : 'bg-yellow-900 text-yellow-300';
    }

    const displayText = condition.intensity 
        ? `${condition.name} (${condition.intensity})` 
        : condition.name;

    return (
        <div className="relative group">
            <div className={`text-xs px-2 py-0.5 rounded-full ${colorClass}`}>
                {displayText}
            </div>
            {condition.description && (
                <div className="absolute bottom-full mb-2 w-64 p-3 bg-zinc-900 border border-zinc-700 text-slate-200 text-sm rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 before:content-[''] before:absolute before:top-full before:left-1/2 before:-translate-x-1/2 before:border-8 before:border-transparent before:border-t-zinc-700">
                    <h4 className="font-bold">{condition.name}</h4>
                    <p className="font-body-serif">{condition.description}</p>
                </div>
            )}
        </div>
    );
};

export default ConditionPill;