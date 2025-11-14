// features/game-room/components/ChatDisplay.tsx
import React, { useMemo, useState, useEffect, useRef } from 'react';
import ChatMessage from '@/components/game/ChatMessage';
import SystemMessage from '@/components/game/SystemMessage';
import Spinner from '@/components/ui/Spinner';
import { Character } from '@/types/character';
import { Message } from '@/types/chat';
import InitialObjectiveSetter from './InitialObjectiveSetter';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';

interface ChatDisplayProps {
    isGameStarted: boolean;
    playerCharacter: Character;
    isInputDisabled: boolean;
    handleStartGame: (objective: string) => void;
    chatHistory: Message[];
    onGenerateImage: (message: Message) => void;
    onDeleteMessage: (messageId: string) => void;
    onRollDice: (messageId: string) => void;
    allCharacters: Character[];
    isMasterThinking: boolean;
}

type ChatFilter = 'all' | 'player' | 'master' | 'system';

const ChatDisplay: React.FC<ChatDisplayProps> = ({
    isGameStarted,
    playerCharacter,
    isInputDisabled,
    handleStartGame,
    chatHistory,
    onGenerateImage,
    onDeleteMessage,
    onRollDice,
    allCharacters,
    isMasterThinking,
}) => {
    const virtuosoRef = useRef<VirtuosoHandle>(null);
    const [filter, setFilter] = useState<ChatFilter>('all');

    const filteredMessages = useMemo(() => {
        if (filter === 'player') {
            return chatHistory.filter(msg => msg.authorId === playerCharacter.id);
        }
        if (filter === 'master') {
            return chatHistory.filter(msg => msg.authorId === 'master');
        }
        if (filter === 'system') {
            return chatHistory.filter(msg => msg.authorId === 'system' || msg.type !== 'chat');
        }
        return chatHistory;
    }, [chatHistory, filter, playerCharacter.id]);

    useEffect(() => {
        if (!virtuosoRef.current) return;
        virtuosoRef.current.scrollToIndex({
            index: filteredMessages.length - 1,
            align: 'end',
            behavior: 'smooth',
        });
    }, [filteredMessages.length]);

    const normalChat = (
        <Virtuoso
            ref={virtuosoRef}
            data={filteredMessages}
            style={{ height: '100%' }}
            followOutput="smooth"
            itemContent={(index, msg) => {
                const prev = filteredMessages[index - 1];
                const canGroup =
                    msg.type === 'chat' &&
                    prev &&
                    prev.type === 'chat' &&
                    prev.authorId === msg.authorId &&
                    msg.authorId !== 'master' &&
                    msg.authorId !== 'system';

                if (msg.type === 'chat') {
                    return (
                        <div className="py-3">
                            <ChatMessage
                                message={msg}
                                playerId={playerCharacter.id}
                                onGenerateImage={onGenerateImage}
                                onDelete={onDeleteMessage}
                                hideAuthorMetadata={Boolean(canGroup)}
                            />
                        </div>
                    );
                }
                return (
                    <div className="py-3">
                        <SystemMessage message={msg} onRollDice={onRollDice} onDelete={onDeleteMessage} allCharacters={allCharacters} />
                    </div>
                );
            }}
            components={{
                Footer: () =>
                    isMasterThinking ? (
                        <div className="flex items-center justify-center gap-3 my-4 text-slate-400 italic animate-fade-in-sm">
                            <Spinner className="w-5 h-5" />
                            <span>O Mestre está pensando...</span>
                        </div>
                    ) : null,
            }}
        />
    );

    const filterOptions: { label: string; value: ChatFilter }[] = [
        { label: 'Todos', value: 'all' },
        { label: 'Jogador', value: 'player' },
        { label: 'Mestre', value: 'master' },
        { label: 'Sistema', value: 'system' },
    ];

    const renderFilters = () => (
        <div className="flex flex-wrap gap-2">
            {filterOptions.map(option => {
                const isActive = option.value === filter;
                return (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => setFilter(option.value)}
                        className={`text-xs font-semibold rounded-full border px-3 py-1 transition ${
                            isActive ? 'bg-arcana-ember-500 text-white border-arcana-ember-300' : 'text-arcana-parchment-300 border-arcana-ink-700 hover:border-arcana-ember-400'
                        }`}
                        aria-pressed={isActive}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );

    return (
        <div className="flex-grow min-h-0 p-4 overflow-hidden">
            {!isGameStarted ? (
                <InitialObjectiveSetter
                    playerCharacter={playerCharacter}
                    isInputDisabled={isInputDisabled}
                    handleStartGame={handleStartGame}
                />
            ) : (
                <div className="flex h-full flex-col">
                    {renderFilters()}
                    <div className="mt-4 flex-1 min-h-0">
                        {normalChat}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatDisplay;
