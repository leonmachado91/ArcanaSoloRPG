// features/game-room/components/CharacterInScene.tsx
import React from 'react';
import { Character } from '../../../types/character';
import Icon from '../../../components/ui/Icon';
import ConditionPill from '@/features/character-sheet/components/ConditionPill';

/**
 * Componente `CharacterInScene`
 * Exibe um resumo de um personagem no painel "Personagens em Cena".
 * Mostra o avatar, nome e condições ativas. É clicável para abrir a ficha completa.
 * @param character O personagem a ser exibido.
 * @param onClick A função a ser chamada quando o componente é clicado.
 */
const CharacterInScene: React.FC<{ character: Character; onClick: () => void }> = ({ character, onClick }) => {
    return (
        <div 
            onClick={onClick} 
            className="flex items-start gap-3 p-3 bg-zinc-900/50 rounded-lg cursor-pointer hover:bg-zinc-800 transition-all duration-300 ring-2 ring-transparent"
        >
            <div className='w-12 h-12 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0'>
                {character.imageUrl ? (
                    <img src={character.imageUrl} alt={character.name} className="w-full h-full object-cover rounded-full" />
                ) : (
                    <Icon name={character.type === 'player' ? "player" : "companion"} className="w-7 h-7 text-slate-400" />
                )}
            </div>
            <div className="flex-grow">
                <h3 className="font-bold text-base">{character.name}</h3>
                <div className="flex flex-wrap gap-1 mt-1">
                    {(character.states || []).filter(s => s && s.name).length > 0 ? (
                        character.states.filter(s => s && s.name).map(state => (
                            <ConditionPill key={state.name} condition={state} />
                        ))
                    ) : (
                        <p className="text-sm text-slate-500 italic">Normal</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CharacterInScene;