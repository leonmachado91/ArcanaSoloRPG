// features/game-room/GameRoomScreen.tsx
// Este é o componente mais complexo da aplicação, representando a interface principal do jogo.
// Ele é responsável por renderizar o histórico de chat, a entrada do jogador, e os painéis laterais
// com informações dos personagens. A maior parte de sua lógica de negócio é abstraída
// para o hook `useGameRoom` para manter o componente focado na renderização.

import React, { useMemo } from 'react';
import Icon from '../../components/ui/Icon';
import Button from '../../components/ui/Button';
import { useGameRoom } from '../../hooks/useGameRoom';
import SaveStatusIndicator from './components/SaveStatusIndicator';
import GameRoomOverlays from './components/GameRoomOverlays';
import PlayerSummaryPanel from './components/PlayerSummaryPanel';
import NpcsInScenePanel from './components/NpcsInScenePanel';
import ChatDisplay from './components/ChatDisplay';
import PlayerInputBar from './components/PlayerInputBar';

/**
 * Componente `GameRoomScreen`
 * A tela principal da interface de jogo.
 */
const GameRoomScreen: React.FC = () => {
    // `useGameRoom` abstrai toda a lógica complexa, retornando apenas o estado e as
    // funções necessárias para a renderização e manipulação de eventos.
    const {
        playerCharacter, npcs, campaign, chatHistory,
        isInputDisabled, isGameStarted, isSaving, isMasterThinking,
        isMenuOpen, setMenuOpen,
        selectedCharacter, openCharacterSheet, closeCharacterSheet,
        isExitModalOpen, setIsExitModalOpen,
        isOff, setIsOff,
        isSettingsOpen, setIsSettingsOpen,
        isDevLogOpen, setIsDevLogOpen,
        sendPlayerAction, handleRollDice, handleStartGame,
        handleGenerateImage,
        handleGenerateCharacterImage,
        handleUploadCharacterImage,
        generatingImageFor,
        handleExit,
        handleDeleteMessage,
    } = useGameRoom();
    
    // `useMemo` é usado para calcular valores derivados do estado de forma otimizada.
    // Eles só são recalculados se as dependências (ex: `campaign.scenes`) mudarem.
    const currentScene = useMemo(() => campaign.scenes?.find(s => s.isActive), [campaign.scenes]);
    const currentLocation = useMemo(() => {
        if (!currentScene?.locationId || !campaign.locations) return null;
        return campaign.locations.find(l => l.id === currentScene.locationId);
    }, [currentScene, campaign.locations]);

    // Combina jogador e NPCs em uma única lista para facilitar a busca.
    const allCharacters = useMemo(() => [playerCharacter, ...npcs], [playerCharacter, npcs]);

    // Determina quais NPCs estão na cena atual para exibição no painel lateral.
    const npcsInScene = useMemo(() => {
        const activeScene = campaign.scenes?.find(s => s.isActive);
        if (!activeScene?.characterIds) {
            return [];
        }
        const sceneCharacterIds = new Set(activeScene.characterIds);
        return npcs.filter(npc => sceneCharacterIds.has(npc.id));
    }, [campaign.scenes, npcs]);

    return (
        <div className="fixed inset-0 flex flex-col bg-[#121212]">
            {/* Cabeçalho da Sala de Jogo */}
            <header className="flex-shrink-0 bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-800/50 flex items-center justify-between px-4 py-2 z-10">
                <div className="flex items-center gap-4">
                    <h1 className="text-lg font-display text-white uppercase tracking-widest">{campaign.title}</h1>
                    {currentLocation && (
                        <div className="flex items-center gap-2 text-sm text-amber-300/80">
                            <div className="w-px h-4 bg-zinc-700"></div>
                            <span>{currentLocation.name}</span>
                        </div>
                    )}
                    <SaveStatusIndicator isSaving={isSaving} />
                </div>
                {/* Botões de Ação Global da Sala */}
                <div className="flex items-center gap-1">
                    <Button variant="ghost" className="p-2 text-slate-400 hover:text-red-400" onClick={() => setIsExitModalOpen(true)} title="Sair para o Menu">
                        <Icon name="exit" className="w-6 h-6"/>
                    </Button>
                    <div className="w-px h-6 bg-zinc-700 mx-1"></div>
                     <Button variant="ghost" className="p-2" onClick={() => setMenuOpen(true)} title="Painel da Campanha">
                        <Icon name="list-alt" className="w-6 h-6"/>
                    </Button>
                    <Button variant="ghost" className="p-2" onClick={() => setIsSettingsOpen(true)} title="Opções">
                        <Icon name="settings" className="w-6 h-6"/>
                    </Button>
                    <Button variant="ghost" className="p-2" onClick={() => setIsDevLogOpen(true)} title="Log do Desenvolvedor">
                        <Icon name="code" className="w-6 h-6"/>
                    </Button>
                </div>
            </header>

            <div className="flex-grow flex overflow-hidden">
                <PlayerSummaryPanel
                    playerCharacter={playerCharacter}
                    onViewMore={openCharacterSheet}
                    onGenerateImage={handleGenerateCharacterImage}
                    onUploadImage={handleUploadCharacterImage}
                    generatingImageFor={generatingImageFor}
                />

                {/* Área Principal: Chat do Jogo */}
                <main className="flex-grow flex flex-col overflow-hidden">
                    <ChatDisplay
                        isGameStarted={isGameStarted}
                        playerCharacter={playerCharacter}
                        isInputDisabled={isInputDisabled}
                        handleStartGame={handleStartGame}
                        chatHistory={chatHistory}
                        onGenerateImage={handleGenerateImage}
                        onDeleteMessage={handleDeleteMessage}
                        onRollDice={handleRollDice}
                        allCharacters={allCharacters}
                        isMasterThinking={isMasterThinking}
                    />

                    {isGameStarted && (
                        <PlayerInputBar
                            isInputDisabled={isInputDisabled}
                            isOff={isOff}
                            setIsOff={setIsOff}
                            onSendMessage={sendPlayerAction}
                        />
                    )}
                </main>

                <NpcsInScenePanel
                    playerCharacter={playerCharacter}
                    npcsInScene={npcsInScene}
                    onCharacterClick={openCharacterSheet}
                />
            </div>
            
            <GameRoomOverlays
                isMenuOpen={isMenuOpen}
                setMenuOpen={setMenuOpen}
                campaign={campaign}
                selectedCharacter={selectedCharacter}
                closeCharacterSheet={closeCharacterSheet}
                handleGenerateCharacterImage={handleGenerateCharacterImage}
                handleUploadCharacterImage={handleUploadCharacterImage}
                generatingImageFor={generatingImageFor}
                isExitModalOpen={isExitModalOpen}
                setIsExitModalOpen={setIsExitModalOpen}
                handleExit={handleExit}
                isSettingsOpen={isSettingsOpen}
                setIsSettingsOpen={setIsSettingsOpen}
                isDevLogOpen={isDevLogOpen}
                setIsDevLogOpen={setIsDevLogOpen}
                onReplayAction={sendPlayerAction}
            />
        </div>
    );
};

export default GameRoomScreen;