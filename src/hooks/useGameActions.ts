// hooks/useGameActions.ts
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useGameStore } from '@/store/useGameStore';
import { useErrorStore } from '@/store/errorStore';
import { logEvent } from '@/store/devLogStore';
import { gameMasterService } from '@/services/gameMasterService';
import * as chatService from '@/services/db/chat.service';
import { formatErrorForDisplay } from '@/types/game';
import { Character } from '@/types/character';
import { getConfig } from '@/services/configService';
import { useNavigationStore } from '@/store/navigationStore';
// FIX: Added import for characterService to resolve 'Cannot find name' error.
import * as characterService from '@/services/db/character.service';
import { createGameActionsOrchestrator } from '@/orchestrators/gameActionsOrchestrator';
import { engineService } from '@/services/engineService';

/**
 * Hook `useGameActions`
 * Centraliza todas as funções de ação do jogador que interagem com os serviços
 * ou despacham atualizações complexas para o `gameStore`.
 * @param allCharacters Uma lista memoizada de todos os personagens (jogador e NPCs).
 * @returns Um objeto contendo as funções de ação para serem usadas na UI.
 */
export const useGameActions = (allCharacters: Character[]) => {
    const dispatch = useGameStore(state => state.dispatch);
    const chatHistory = useGameStore(state => state.campaign.chatHistory);
    const { navigate } = useNavigationStore();
    const { showError } = useErrorStore();
    const isInitialMount = useRef(true);
    const orchestrator = useMemo(() => createGameActionsOrchestrator({
        getState: useGameStore.getState,
        dispatch,
        chatService: {
            updateChatMessage: chatService.updateChatMessage,
            saveChatMessage: chatService.saveChatMessage,
        },
        engineService: {
            performContestedCheck: engineService.performContestedCheck,
            performDifficultyCheck: engineService.performDifficultyCheck,
        },
        gameMasterService: {
            notifyAIOfStateChange: gameMasterService.notifyAIOfStateChange,
        },
        logEvent,
        showError,
        formatErrorForDisplay,
        generateId: uuidv4,
    }), [dispatch, showError, formatErrorForDisplay]);

    /**
     * Processa a ação do jogador, delegando a lógica para o `gameMasterService`.
     */
    const sendPlayerAction = useCallback(async (text: string, isOffTopic: boolean) => {
        try {
            const currentState = useGameStore.getState(); // Acesso não-reativo ao estado
            await gameMasterService.processPlayerAction(text, isOffTopic, currentState, dispatch);
        } catch (error) {
            const errorMessage = formatErrorForDisplay(error, "Ocorreu um erro ao processar sua ação.");
            showError(errorMessage);
        }
    }, [dispatch, showError]);


    /**
     * Resolve uma rolagem de dados pendente no chat através do orquestrador.
     */
    const handleRollDice = useCallback(async (messageId: string) => {
        try {
            await orchestrator.handleRollDice(messageId, allCharacters);
        } catch {
            // O orquestrador já exibiu o erro apropriado; evitamos propagar para a UI.
        }
    }, [allCharacters, orchestrator]);

    /**
     * Efeito para rolar os dados de um NPC automaticamente.
     * [MOVIMENTAÇÃO]: Movido de `useGameRoom` para cá para co-localizar com `handleRollDice`.
     */
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        const lastMessage = chatHistory[chatHistory.length - 1];
        if (!lastMessage || lastMessage.type !== 'dice_roll' || lastMessage.diceRoll?.status !== 'pending') {
            return;
        }
        
        const rollCharacter = allCharacters.find(c => c.id === lastMessage.diceRoll?.characterId);
        const isNpcRoll = rollCharacter && rollCharacter.type !== 'player';

        if (isNpcRoll) {
            const timer = setTimeout(() => handleRollDice(lastMessage.id), getConfig().ui.npcRollDelayMs);
            return () => clearTimeout(timer);
        }
    }, [chatHistory, handleRollDice, allCharacters]);

    /**
     * Inicia a saga, salvando o objetivo final do jogador e gerando a primeira cena.
     */
    const handleStartGame = useCallback(async (finalObjective: string) => {
        logEvent({ type: 'player_action', actionText: '[SISTEMA]: Início da Campanha (UI)' });

        const currentState = useGameStore.getState();
        const currentPlayerId = currentState.playerCharacter.id;

        try {
            // Persiste a mudança no banco de dados PRIMEIRO.
            await characterService.updateCharacterData(currentPlayerId, { objective: finalObjective });
            
            // Atualiza o estado local DEPOIS.
            dispatch({ type: 'UPDATE_PLAYER_CHARACTER', payload: { objective: finalObjective } });
            
            const updatedStateForService = {
                ...currentState,
                playerCharacter: {
                    ...currentState.playerCharacter,
                    objective: finalObjective
                }
            };
            
            await gameMasterService.startNewGameScene(updatedStateForService, dispatch);
            
        } catch (error) {
            const errorMessage = formatErrorForDisplay(error, "Ocorreu um erro ao iniciar a primeira cena.");
            showError(errorMessage);
        }
    }, [dispatch, showError]);

    /**
     * Navega de volta para a tela inicial.
     */
    const handleExit = useCallback(() => {
        navigate('home');
    }, [navigate]);

    /**
     * Apaga uma mensagem do histórico de chat.
     */
    const handleDeleteMessage = useCallback(async (messageId: string) => {
        try {
            await chatService.deleteChatMessage(messageId);
            dispatch({ type: 'REMOVE_MESSAGE', payload: { messageId } });
        } catch (error) {
            const errorMessage = formatErrorForDisplay(error, "Não foi possível apagar a mensagem.");
            showError(errorMessage);
        }
    }, [dispatch, showError]);

    return {
        sendPlayerAction,
        handleRollDice,
        handleStartGame,
        handleExit,
        handleDeleteMessage,
    };
};
