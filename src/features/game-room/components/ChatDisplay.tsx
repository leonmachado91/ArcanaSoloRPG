// features/game-room/components/ChatDisplay.tsx
import React, { useRef, useEffect } from 'react';
import ChatMessage from '@/components/game/ChatMessage';
import SystemMessage from '@/components/game/SystemMessage';
import Spinner from '@/components/ui/Spinner';
import { Character } from '@/types/character';
import { Message } from '@/types/chat';
import { useSettingsStore } from '@/store/settingsStore';
import { useRawChatStore } from '@/store/useRawChatStore';
import RawChatTurn from '@/features/dev-log/components/RawChatTurn';
import Icon from '@/components/ui/Icon';
import InitialObjectiveSetter from './InitialObjectiveSetter';

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
    const chatContainerRef = useRef<HTMLDivElement>(null);
    
    const isRawModeEnabled = useSettingsStore(state => state.isRawModeEnabled);
    const rawChatHistory = useRawChatStore(state => state.history);
    const systemInstruction = useRawChatStore(state => state.systemInstruction);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory, isMasterThinking, rawChatHistory]);

    const renderNormalChat = () => (
        <div className="space-y-6">
            {chatHistory.map(msg => {
                if (msg.type === 'chat') {
                    return <ChatMessage key={msg.id} message={msg} playerId={playerCharacter.id} onGenerateImage={onGenerateImage} onDelete={onDeleteMessage} />;
                }
                return <SystemMessage key={msg.id} message={msg} onRollDice={onRollDice} onDelete={onDeleteMessage} allCharacters={allCharacters} />;
            })}
            {isMasterThinking && (
                <div className="flex items-center justify-center gap-3 my-4 text-slate-400 italic animate-fade-in-sm">
                    <Spinner className="w-5 h-5" />
                    <span>O Mestre está pensando...</span>
                </div>
            )}
        </div>
    );

    const renderRawLogChat = () => (
        <div className="space-y-2 font-mono text-sm">
            {systemInstruction && (
                 <div className="border-l-4 border-purple-700 bg-purple-950/20 p-3 my-2 space-y-2">
                    <div className="flex items-center gap-2 text-purple-300 font-bold">
                        <Icon name="settings" className="w-5 h-5" />
                        <span>System Instruction</span>
                    </div>
                    <p className="text-slate-300 whitespace-pre-wrap">{systemInstruction}</p>
                </div>
            )}
            {rawChatHistory.map((turn, index) => (
                <RawChatTurn key={index} turn={turn} />
            ))}
            {isMasterThinking && (
                <div className="flex items-center justify-center gap-3 my-4 text-slate-400 italic animate-fade-in-sm">
                    <Spinner className="w-5 h-5" />
                    <span>Processando...</span>
                </div>
            )}
        </div>
    );


    return (
        <div ref={chatContainerRef} className="flex-grow min-h-0 p-4 overflow-y-auto">
            {!isGameStarted ? (
                <InitialObjectiveSetter
                    playerCharacter={playerCharacter}
                    isInputDisabled={isInputDisabled}
                    handleStartGame={handleStartGame}
                />
            ) : (
                isRawModeEnabled ? renderRawLogChat() : renderNormalChat()
            )}
        </div>
    );
};

export default ChatDisplay;
