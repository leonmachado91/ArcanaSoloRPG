// features/character-sheet/CharacterSheet.tsx
// Este componente é responsável por renderizar a ficha de um personagem.
// Ele possui duas variantes: 'summary' para uma visão rápida nos painéis laterais
// e 'full' para uma visão detalhada em um drawer.

import React from 'react';
import { Character } from '@/types/character';
import Icon from '@/components/ui/Icon';
import ElementDisplay from '@/components/character/ElementDisplay';
import ProgressTrack from '@/components/character/ProgressTrack';
import Button from '@/components/ui/Button';
import Section from './components/Section';
import ConditionPill from './components/ConditionPill';
import CharacterImageActions from './components/CharacterImageActions';
import CharacterSheetHeader from './components/CharacterSheetHeader';
import CharacterSheetAttributes from './components/CharacterSheetAttributes';
import CharacterSheetStatus from './components/CharacterSheetStatus';


interface CharacterSheetProps {
    /** O objeto do personagem a ser exibido. */
    character: Character;
    /** A variante de exibição: resumida ou completa. */
    variant: 'summary' | 'full';
    /** Callback para abrir a visão completa (usado na variante 'summary'). */
    onViewMore?: () => void;
    /** Callback para iniciar a geração de uma imagem para o personagem. */
    onGenerateImage?: (character: Character) => void;
    /** Callback para lidar com o upload de uma imagem do computador. */
    onUploadImage?: (character: Character, file: File) => void;
    /** Se verdadeiro, exibe um spinner no lugar dos botões de imagem. */
    isGeneratingImage?: boolean;
}


const CharacterSheet: React.FC<CharacterSheetProps> = ({ character, variant, onViewMore, onGenerateImage, onUploadImage, isGeneratingImage }) => {
    const { name, age, description, imageUrl, elements, advantages, disadvantages, progressPoints, secret, objective, history, states, items, personalityTraits } = character;

    // =================================================================================
    // VARIANTE 'SUMMARY' (RESUMO)
    // =================================================================================
    const summaryView = (
        <div className="p-6 flex flex-col h-full">
            <header className="text-center mb-6">
                 <div className="relative w-24 h-24 mx-auto rounded-full border-4 border-amber-500/50 bg-zinc-800 flex items-center justify-center flex-shrink-0">
                    {imageUrl ? (
                        <img src={imageUrl} alt={name} className="w-full h-full object-cover rounded-full" />
                    ) : (
                        <Icon 
                            name={character.type === 'player' ? "player" : "companion"} 
                            className={`w-12 h-12 ${character.type === 'player' ? 'text-amber-400' : 'text-slate-400'}`}
                        />
                    )}
                    {/* Botões de ação de imagem só aparecem se não houver imagem e se as funções forem fornecidas. */}
                    {(onGenerateImage || onUploadImage) && !imageUrl && (
                        <div className="absolute -bottom-1 -right-1">
                             <CharacterImageActions 
                                character={character}
                                onGenerateImage={onGenerateImage}
                                onUploadImage={onUploadImage}
                                isGeneratingImage={isGeneratingImage}
                                buttonSizeClass="w-8 h-8"
                                iconSizeClass="w-4 h-4"
                             />
                        </div>
                    )}
                </div>
                <h2 className="text-2xl font-display text-white mt-4">{name}</h2>
                <p className="text-sm text-slate-400 mb-4 font-body-serif">{age} anos</p>
                 <div className="flex flex-wrap items-center justify-center gap-2">
                    {(personalityTraits || []).map(trait => (
                        <span key={trait} className="bg-zinc-700 text-slate-300 text-xs font-semibold px-3 py-1 rounded-full">
                            {trait}
                        </span>
                    ))}
                </div>
            </header>
            <div className="flex justify-around mb-6">
                <ElementDisplay name="fire" value={elements.fire} />
                <ElementDisplay name="water" value={elements.water} />
                <ElementDisplay name="air" value={elements.air} />
                <ElementDisplay name="earth" value={elements.earth} />
            </div>
            
            <ProgressTrack progressPoints={progressPoints} />

            <div className="mt-6">
                 <h4 className="font-bold text-xs text-slate-400 tracking-wider uppercase mb-2">Condições Ativas</h4>
                 {(states || []).filter(s => s && s.name).length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {(states || []).filter(s => s && s.name).map(state => (
                           <ConditionPill key={state.name} condition={state} />
                        ))}
                    </div>
                 ) : (
                    <p className="text-sm text-zinc-500 italic font-body-serif">Nenhuma condição ativa.</p>
                 )}
            </div>

            <div className="mt-6">
                 <h4 className="font-bold text-xs text-slate-400 tracking-wider uppercase mb-2">Inventário</h4>
                 {(items || []).length > 0 ? (
                    <ul className="list-disc list-inside space-y-1 font-body-serif text-sm text-slate-300">
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
            </div>
            
            {/* Div flexível para empurrar o botão "Ver Ficha Completa" para o final do contêiner. */}
            <div className="flex-grow"></div>
            {onViewMore && (
                 <Button variant="secondary" onClick={onViewMore} className="w-full mt-8">
                    Ver Ficha Completa
                </Button>
            )}
        </div>
    );

    // =================================================================================
    // VARIANTE 'FULL' (COMPLETA)
    // =================================================================================
    const fullView = (
         <div className="text-slate-200 space-y-8">
            <CharacterSheetHeader 
                character={character}
                onGenerateImage={onGenerateImage}
                onUploadImage={onUploadImage}
                isGeneratingImage={isGeneratingImage}
            />

            <ProgressTrack progressPoints={progressPoints} />

            {character.type === 'player' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-zinc-900/50 p-4 rounded-lg border border-yellow-500/20">
                         <h3 className="font-display text-lg text-yellow-300 mb-2">Segredo</h3>
                         <p className="text-yellow-200/80 italic font-body-serif">"{secret || 'Nenhum segredo revelado.'}"</p>
                    </div>
                     <div className="bg-zinc-900/50 p-4 rounded-lg border border-cyan-500/20">
                         <h3 className="font-display text-lg text-cyan-300 mb-2">Objetivo</h3>
                         <p className="text-cyan-200/80 font-body-serif">"{objective || 'Nenhum objetivo definido.'}"</p>
                    </div>
                </div>
            )}
            
            <CharacterSheetAttributes character={character} />
            
            <CharacterSheetStatus character={character} />

            <Section title="História">
                <p className="whitespace-pre-wrap text-slate-300 font-body-serif">{history || 'Nenhuma história definida.'}</p>
            </Section>
        </div>
    );
    
    // Retorna a variante apropriada com base na prop.
    return variant === 'summary' ? summaryView : fullView;
};

export default CharacterSheet;