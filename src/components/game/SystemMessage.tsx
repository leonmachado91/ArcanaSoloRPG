// components/game/SystemMessage.tsx
// Este componente é um "roteador" de renderização para mensagens que não são de chat.
// Ele analisa o tipo de `Message` e renderiza o componente apropriado, como um
// display de cartas do arcana, uma solicitação de rolagem de dados ou um evento de turno.

import React from 'react';
import { Message } from '../../types/chat';
import { Character } from '../../types/character';
import ArcanaCardDisplay from './ArcanaCardDisplay';
import DiceRollDisplay from './DiceRollDisplay';
import CombatClashDisplay from './CombatClashDisplay'; // Importa o novo componente
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import Spinner from '../ui/Spinner';
import { useAudioStore } from '@/store/audioStore';

interface SystemMessageProps {
    /** O objeto da mensagem de sistema a ser renderizado. */
    message: Message;
    /** Callback opcional para quando o jogador rola os dados. */
    onRollDice?: (messageId: string) => void;
    /** Função de callback para apagar a mensagem. */
    onDelete: (messageId: string) => void;
    /** Lista opcional de todos os personagens para buscar dados de combate. */
    allCharacters?: Character[];
}

const SystemMessage: React.FC<SystemMessageProps> = ({ message, onRollDice, onDelete, allCharacters }) => {
    // Hook para controle de áudio, usado para narrar o início de um novo turno.
    const { playAudio, stopAudio, isLoading, isPlaying, currentMessageId } = useAudioStore();
    const isThisMessageLoading = isLoading && currentMessageId === message.id;
    const isThisMessagePlaying = isPlaying && currentMessageId === message.id;

    /**
     * Manipula o clique no botão de áudio para tocar ou parar a narração.
     */
    const handleAudioClick = () => {
        if (isThisMessagePlaying) {
            stopAudio();
        } else {
            playAudio(message);
        }
    };

    // Botão de apagar redesenhado para aparecer no canto superior direito do contêiner.
    const deleteButton = (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button 
                variant="ghost" 
                className="p-1.5 h-auto bg-zinc-800/50 hover:bg-zinc-700/80 rounded-md" 
                onClick={() => onDelete(message.id)} 
                title="Apagar Mensagem"
            >
                <Icon name="trash" className="w-4 h-4 text-red-400/80 hover:text-red-400" />
            </Button>
        </div>
    );


    // Renderiza um divisor de turno.
    if (message.type === 'event') {
        const turnMatch = message.text.match(/---\s*(Turno\s*\d+)\s*---/);
        if (turnMatch) {
            return (
                <div className="relative group flex items-center my-6" aria-label={turnMatch[1]}>
                    <div className="flex-grow border-t border-zinc-700/50"></div>
                    <span className="flex-shrink-0 mx-4 text-sm font-bold text-amber-400 uppercase tracking-widest">{turnMatch[1]}</span>
                    <Button variant="ghost" onClick={handleAudioClick} className="p-2 -ml-2" title="Ouvir narração do turno">
                         {isThisMessageLoading ? <Spinner className="w-5 h-5" /> : <Icon name={isThisMessagePlaying ? "close" : "audio"} className="w-5 h-5"/>}
                    </Button>
                    <div className="flex-grow border-t border-zinc-700/50"></div>
                    {/* O botão para eventos de turno precisa de um posicionamento diferente. */}
                    <div className="absolute top-1/2 -translate-y-1/2 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Button variant="ghost" className="p-1.5 h-auto bg-zinc-800/50 hover:bg-zinc-700/80 rounded-md" onClick={() => onDelete(message.id)} title="Apagar Mensagem">
                            <Icon name="trash" className="w-4 h-4 text-red-400/80" />
                        </Button>
                    </div>
                </div>
            );
        }
        // Renderiza um evento genérico do sistema.
        return (
            <div className="relative group text-center my-4">
                <span className="text-sm italic text-slate-500 px-4">{message.text}</span>
                 <div className="absolute top-1/2 -translate-y-1/2 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" className="p-1.5 h-auto bg-zinc-800/50 hover:bg-zinc-700/80 rounded-md" onClick={() => onDelete(message.id)} title="Apagar Mensagem">
                        <Icon name="trash" className="w-4 h-4 text-red-400/80" />
                    </Button>
                </div>
            </div>
        );
    }
    
    // Renderiza a exibição das cartas do Arcana para uma mudança de cena ou sorteio de cartas.
    if ((message.type === 'card_draw' || message.type === 'scene_change') && message.cardDraw) {
        const { verb, theme, adjective, emotion } = message.cardDraw;
        return (
            <div className="relative group max-w-2xl mx-auto my-8 p-6 bg-zinc-900/50 border-2 border-amber-500/20 rounded-lg shadow-lg shadow-amber-500/10">
                {message.type === 'scene_change' && (
                     <h2 className="text-center font-display text-amber-400 text-2xl mb-6">--- {message.text} ---</h2>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <ArcanaCardDisplay label="Verbo" word={verb} />
                    <ArcanaCardDisplay label="Tema" word={theme} />
                    <ArcanaCardDisplay label="Adjetivo" word={adjective} />
                    <ArcanaCardDisplay label="Emoção" word={emotion} />
                </div>
                {deleteButton}
            </div>
        );
    }

    // Roteia para o componente de rolagem de dados apropriado.
    if (message.type === 'dice_roll' && message.diceRoll) {
        // Se for um confronto de combate, usa o novo display.
        if (message.diceRoll.type === 'combat_clash' && allCharacters) {
            const attacker = allCharacters.find(c => c.id === message.diceRoll.characterId);
            const defender = allCharacters.find(c => c.id === message.diceRoll.vsCharacterId);

            if (attacker && defender) {
                return (
                    <div className="relative group">
                        <CombatClashDisplay 
                            diceRoll={message.diceRoll}
                            attacker={attacker}
                            defender={defender}
                            onRoll={onRollDice ? () => onRollDice(message.id) : undefined} 
                        />
                        {deleteButton}
                    </div>
                );
            }
        }
        
        // [BUG FIX] Determina se a rolagem é do jogador para passar ao componente de display.
        // A verificação é feita pelo `type` do personagem, que é mais robusto que o `id`.
        const rollCharacter = allCharacters?.find(c => c.id === message.diceRoll!.characterId);
        const isPlayerRoll = rollCharacter?.type === 'player';

        // Para todos os outros tipos de rolagem, usa o display padrão.
        return (
            <div className="relative group">
                <DiceRollDisplay 
                    diceRoll={message.diceRoll} 
                    onRoll={onRollDice ? () => onRollDice(message.id) : undefined} 
                    isPlayerRoll={isPlayerRoll}
                />
                {deleteButton}
            </div>
        );
    }


    // Se o tipo de mensagem não for reconhecido, não renderiza nada.
    return null;
};

export default React.memo(SystemMessage);