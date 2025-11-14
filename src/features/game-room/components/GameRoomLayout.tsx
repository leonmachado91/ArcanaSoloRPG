import React from 'react';
import PlayerSummaryPanel from './PlayerSummaryPanel';
import NpcsInScenePanel from './NpcsInScenePanel';
import ChatDisplay from './ChatDisplay';
import PlayerInputBar from './PlayerInputBar';
import { Character } from '@/types/character';
import { Message } from '@/types/chat';

interface PlayerPanelProps {
    playerCharacter: Character;
    isGeneratingImage: boolean;
    onViewMore: (character: Character) => void;
    onGenerateImage: (character: Character) => void;
    onUploadImage: (character: Character, file: File) => void;
}

interface NpcsPanelProps {
    playerCharacter: Character;
    npcsInScene: Character[];
    onCharacterClick: (character: Character) => void;
}

interface ChatSectionProps {
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

interface PlayerInputSectionProps {
    isGameStarted: boolean;
    isInputDisabled: boolean;
    isOff: boolean;
    setIsOff: (isOff: boolean) => void;
    onSendMessage: (text: string, isOff: boolean) => void;
}

interface GameRoomLayoutProps {
    playerPanel: PlayerPanelProps;
    npcsPanel: NpcsPanelProps;
    chat: ChatSectionProps;
    playerInput: PlayerInputSectionProps;
}

/**
 * Layout principal do Game Room.
 * Organiza os painéis laterais, chat e barra de entrada, além de expor
 * drawers móveis para acesso às fichas em viewports menores.
 */
const GameRoomLayout: React.FC<GameRoomLayoutProps> = ({
    playerPanel,
    npcsPanel,
    chat,
    playerInput,
}) => {
    return (
        <div className="flex-grow flex min-h-0 h-full overflow-hidden">
                <PlayerSummaryPanel
                    playerCharacter={playerPanel.playerCharacter}
                    onViewMore={playerPanel.onViewMore}
                    onGenerateImage={playerPanel.onGenerateImage}
                    onUploadImage={playerPanel.onUploadImage}
                    isGeneratingImage={playerPanel.isGeneratingImage}
                />

                <main className="flex-grow flex flex-col min-h-0 overflow-hidden">
                    <ChatDisplay
                        isGameStarted={chat.isGameStarted}
                        playerCharacter={chat.playerCharacter}
                        isInputDisabled={chat.isInputDisabled}
                        handleStartGame={chat.handleStartGame}
                        chatHistory={chat.chatHistory}
                        onGenerateImage={chat.onGenerateImage}
                        onDeleteMessage={chat.onDeleteMessage}
                        onRollDice={chat.onRollDice}
                        allCharacters={chat.allCharacters}
                        isMasterThinking={chat.isMasterThinking}
                    />

                    {playerInput.isGameStarted && (
                    <PlayerInputBar
                        isInputDisabled={playerInput.isInputDisabled}
                        isOff={playerInput.isOff}
                        setIsOff={playerInput.setIsOff}
                        onSendMessage={playerInput.onSendMessage}
                    />
                )}
                </main>

                <NpcsInScenePanel
                    playerCharacter={npcsPanel.playerCharacter}
                    npcsInScene={npcsPanel.npcsInScene}
                    onCharacterClick={npcsPanel.onCharacterClick}
                />
        </div>
    );
};

export default GameRoomLayout;
