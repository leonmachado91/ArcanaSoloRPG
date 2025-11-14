// features/game-room/GameRoomScreen.tsx
// Este é o componente mais complexo da aplicação, representando a interface principal do jogo.
// Ele é responsável por renderizar o histórico de chat, a entrada do jogador, e os painéis laterais
// com informações dos personagens. A maior parte de sua lógica de negócio é abstraída
// para o hook `useGameRoom` para manter o componente focado na renderização.

import React, { useEffect, useMemo } from 'react';
import { useGameRoom } from '../../hooks/useGameRoom';
import GameRoomOverlays from './components/GameRoomOverlays';
import { useAppChrome } from '@/components/layout/AppChromeContext';
import GameRoomHeader from './components/GameRoomHeader';
import GameRoomLayout from './components/GameRoomLayout';

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
        isOff, setIsOff,
        sendPlayerAction, handleRollDice, handleStartGame,
        handleGenerateImage,
        handleGenerateCharacterImage,
        handleUploadCharacterImage,
        isCharacterBusy,
        handleExit,
        handleDeleteMessage,
    } = useGameRoom();
    const { setDevLogReplayHandler, registerBackAction } = useAppChrome();

    useEffect(() => {
        setDevLogReplayHandler(() => sendPlayerAction);
        return () => setDevLogReplayHandler(null);
    }, [sendPlayerAction, setDevLogReplayHandler]);
    
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

    useEffect(() => {
        registerBackAction({
            icon: 'back',
            ariaLabel: 'Sair da campanha',
            onAction: handleExit,
            variant: 'ghost',
        });
        return () => registerBackAction(null);
    }, [handleExit, registerBackAction]);

    const isPlayerImageGenerating = isCharacterBusy(playerCharacter.id);

    return (
        <div className="flex flex-1 flex-col bg-[#121212] min-h-0 h-full overflow-hidden">
            <GameRoomHeader
                campaignTitle={campaign.title}
                currentLocationName={currentLocation?.name}
                isSaving={isSaving}
                onOpenCampaignPanel={() => setMenuOpen(true)}
            />

            <GameRoomLayout
                playerPanel={{
                    playerCharacter,
                    isGeneratingImage: isPlayerImageGenerating,
                    onViewMore: openCharacterSheet,
                    onGenerateImage: handleGenerateCharacterImage,
                    onUploadImage: handleUploadCharacterImage,
                }}
                npcsPanel={{
                    playerCharacter,
                    npcsInScene,
                    onCharacterClick: openCharacterSheet,
                }}
                chat={{
                    isGameStarted,
                    playerCharacter,
                    isInputDisabled,
                    handleStartGame,
                    chatHistory,
                    onGenerateImage: handleGenerateImage,
                    onDeleteMessage: handleDeleteMessage,
                    onRollDice: handleRollDice,
                    allCharacters,
                    isMasterThinking,
                }}
                playerInput={{
                    isGameStarted,
                    isInputDisabled,
                    isOff,
                    setIsOff,
                    onSendMessage: sendPlayerAction,
                }}
            />

            <GameRoomOverlays
                isMenuOpen={isMenuOpen}
                setMenuOpen={setMenuOpen}
                campaign={campaign}
                selectedCharacter={selectedCharacter}
                closeCharacterSheet={closeCharacterSheet}
                handleGenerateCharacterImage={handleGenerateCharacterImage}
                handleUploadCharacterImage={handleUploadCharacterImage}
                isCharacterBusy={isCharacterBusy}
                playerCharacter={playerCharacter}
                openCharacterSheet={openCharacterSheet}
                npcsInScene={npcsInScene}
            />
        </div>
    );
};

export default GameRoomScreen;
