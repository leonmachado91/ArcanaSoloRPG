// features/character-sheet/components/CharacterSheetStatus.tsx
import React from 'react';
import { Character } from '@/types/character';
import Section from './Section';
import ConditionPill from './ConditionPill';

interface CharacterSheetStatusProps {
    character: Character;
}

const CharacterSheetStatus: React.FC<CharacterSheetStatusProps> = ({ character }) => {
    const { states, items } = character;
    return (
        <>
            <Section title="Condições Ativas">
                 {(states || []).filter(s => s && s.name).length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {(states || []).filter(s => s && s.name).map(state => <ConditionPill key={state.name} condition={state} />)}
                    </div>
                 ) : (
                    <p className="text-sm text-zinc-500 italic font-body-serif">Nenhuma condição ativa.</p>
                 )}
            </Section>
            
            <Section title="Itens">
                 {(items || []).length > 0 ? (
                    <ul className="list-disc list-inside space-y-1 font-body-serif">
                        {items.map(item => (
                             <li key={item.name} className="relative group">
                                {item.name} {item.quantity > 1 ? <span className="text-zinc-400">(x{item.quantity})</span> : ''}
                                {item.description && (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-zinc-900 border border-zinc-700 text-slate-200 text-sm rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 before:content-[''] before:absolute before:top-full before:left-1/2 before:-translate-x-1/2 before:border-8 before:border-transparent before:border-t-zinc-700">
                                        <p>{item.description}</p>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                 ) : (
                    <p className="text-sm text-zinc-500 italic font-body-serif">Nenhum item.</p>
                 )}
            </Section>
        </>
    );
};

export default CharacterSheetStatus;
