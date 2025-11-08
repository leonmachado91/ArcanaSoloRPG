// hooks/useGameActions.ts
import { useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useGameStore } from '@/store/useGameStore';
import { useErrorStore } from '@/store/errorStore';
import { logEvent } from '@/store/devLogStore';
import { gameMasterService } from '@/services/gameMasterService';
import * as chatService from '@/services/db/chat.service';
import { formatErrorForDisplay } from '@/types/game';
import { DiceRoll, Message } from '@/types/chat';
import { Character } from '@/types/character';
import { engineService } from '@/services/engineService';
import { getConfig } from '@/services/configService';
import { useNavigationStore } from '@/store/navigationStore';
// FIX: Added import for characterService to resolve 'Cannot find name' error.
import * as characterService from '@/services/db/character.service';

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


    // Funções auxiliares para `handleRollDice`
    const resolveCombatClash = useCallback((diceRoll: DiceRoll, character: Character): Partial<Message> => {
        const defender = allCharacters.find(c => c.id === diceRoll.vsCharacterId);
        if (!defender) {
            showError("Personagem oponente do confronto não encontrado.");
            return {
                diceRoll: { ...diceRoll, status: 'rolled' },
                text: "Erro: Personagem oponente do confronto não encontrado."
            };
        }

        const attackerModifier = (diceRoll.modifiers || []).reduce((sum, mod) => sum + mod.value, 0);
        const defenderModifier = (diceRoll.defenderModifiers || []).reduce((sum, mod) => sum + mod.value, 0);
        
        // FIX: The `performContestedCheck` function expects dice counts (numbers), not character objects.
        // Based on game rules, the clash uses the attacker's dice count from the roll and the defender's `earth` element value.
        const result = engineService.performContestedCheck(diceRoll.diceCount, defender.elements.earth, attackerModifier, defenderModifier);
        
        logEvent({
            type: 'system',
            message: 'Ação Contestada (Combate) Resolvida via Chat',
            payload: { attacker: character.name, defender: defender.name, attackerModifier, defenderModifier, result }
        });

        const updatedDiceRoll: DiceRoll = {
            ...diceRoll,
            status: 'rolled',
            difficulty: result.defenderFinalTotal,
            outcome: result.outcome,
            damageSeverity: result.damageSeverity,
            result: {
                rolls: result.attackerRoll.rolls,
                sum: result.attackerRoll.total,
                total: result.attackerFinalTotal,
                success: result.outcome === 'attacker_wins',
            },
            defenderResult: {
                rolls: result.defenderRoll.rolls,
                sum: result.defenderRoll.total,
                total: result.defenderFinalTotal,
            }
        };
        return {
            diceRoll: updatedDiceRoll,
            text: `Resultado do combate: ${result.outcome}. Severidade: ${result.damageSeverity || 'N/A'}.`
        };
    }, [allCharacters, showError]);

    const resolveDifficultyCheck = useCallback((diceRoll: DiceRoll, character: Character): Partial<Message> => {
        const modifier = (diceRoll.modifiers || []).reduce((sum, mod) => sum + mod.value, 0);
        const result = engineService.performDifficultyCheck(diceRoll.diceCount, diceRoll.difficulty ?? 0, modifier);
        
        const updatedDiceRoll: DiceRoll = {
            ...diceRoll,
            status: 'rolled',
            result: {
                rolls: result.rollResult.rolls,
                sum: result.rollResult.total,
                total: result.finalTotal,
                success: result.isSuccess,
            }
        };

        logEvent({
            type: 'system',
            message: `Teste de Dificuldade Resolvido via Chat: ${diceRoll.testName || diceRoll.element}`,
            payload: { 
                characterName: character.name, 
                element: diceRoll.element, 
                diceCount: diceRoll.diceCount, 
                difficulty: diceRoll.difficulty, 
                modifier, 
                result 
            }
        });
        
        return { diceRoll: updatedDiceRoll };
    }, []);


    /**
     * Resolve uma rolagem de dados pendente no chat.
     */
    const handleRollDice = useCallback(async (messageId: string) => {
        const message = useGameStore.getState().campaign.chatHistory.find(m => m.id === messageId);
        if (!message?.diceRoll || message.diceRoll.status !== 'pending') return;
    
        const character = allCharacters.find(c => c.id === message.diceRoll.characterId);
        
        if (!character) {
            showError("Personagem da rolagem não encontrado.");
            // FIX: Add 'as const' to ensure TypeScript infers the literal type 'rolled'
            // for the status property, matching the 'RollStatus' type.
            const errorUpdate = { text: "Erro: Personagem não encontrado.", diceRoll: { ...message.diceRoll, status: 'rolled' as const } };
            // Tenta salvar o estado de erro e atualiza a UI se conseguir.
            try {
                await chatService.updateChatMessage(messageId, errorUpdate);
                dispatch({ type: 'UPDATE_MESSAGE', payload: { id: messageId, data: errorUpdate } });
            } catch (dbError) {
                const errorMessage = formatErrorForDisplay(dbError, "Falha ao salvar o estado de erro da rolagem.");
                showError(errorMessage);
            }
            return;
        }

        let updatedMessageData: Partial<Message> = {};

        if (message.diceRoll.type === 'combat_clash') {
            updatedMessageData = resolveCombatClash(message.diceRoll, character);
        } else {
            updatedMessageData = resolveDifficultyCheck(message.diceRoll, character);
        }
        
        // Persiste a atualização no banco de dados PRIMEIRO.
        try {
            await chatService.updateChatMessage(messageId, updatedMessageData);
            // Atualiza o estado local para a UI reagir DEPOIS do sucesso.
            dispatch({ type: 'UPDATE_MESSAGE', payload: { id: messageId, data: updatedMessageData } });

            // Notifica a IA sobre o resultado da rolagem para que ela possa narrar.
            const finalDiceRoll = updatedMessageData.diceRoll;
            if (finalDiceRoll && finalDiceRoll.status === 'rolled') {
                let notificationText = '';
                if (finalDiceRoll.type === 'difficulty_check' && finalDiceRoll.result) {
                    const outcome = finalDiceRoll.result.success ? 'SUCESSO' : 'FALHA';
                    notificationText = `[MUDANÇA DE ESTADO NO JOGO]: O teste '${finalDiceRoll.description}' foi resolvido. Resultado: ${outcome} (${finalDiceRoll.result.total} vs ${finalDiceRoll.difficulty}).`;
                } else if (finalDiceRoll.type === 'combat_clash' && finalDiceRoll.outcome && finalDiceRoll.result && finalDiceRoll.defenderResult) {
                    const attacker = allCharacters.find(c => c.id === finalDiceRoll.characterId);
                    const defender = allCharacters.find(c => c.id === finalDiceRoll.vsCharacterId);
                    notificationText = `[MUDANÇA DE ESTADO NO JOGO]: O confronto '${finalDiceRoll.description}' entre ${attacker?.name} e ${defender?.name} foi resolvido. Resultado: ${finalDiceRoll.outcome} (${finalDiceRoll.result.total} vs ${finalDiceRoll.defenderResult.total}).`;
                }

                if (notificationText) {
                    gameMasterService.notifyAIOfStateChange(notificationText)
                        .then(narration => {
                            if (narration && narration.trim() !== '') {
                                const activeScene = useGameStore.getState().campaign.scenes?.find(s => s.isActive);
                                if (activeScene) {
                                    const masterMessage: Message = {
                                        id: uuidv4(),
                                        sceneId: activeScene.id,
                                        authorId: 'master',
                                        authorName: 'Mestre',
                                        type: 'chat',
                                        text: narration,
                                    };
                                    chatService.saveChatMessage(masterMessage, useGameStore.getState().campaign.id).then(() => {
                                        dispatch({ type: 'ADD_MESSAGES', payload: [masterMessage] });
                                    });
                                }
                            }
                        })
                        .catch(error => {
                            const errorMessage = formatErrorForDisplay(error, "Falha ao obter narração da IA após a rolagem.");
                            showError(errorMessage);
                        });
                }
            }

        } catch (error) {
            const errorMessage = formatErrorForDisplay(error, "Falha ao salvar o resultado da rolagem.");
            showError(errorMessage);
        }
    }, [dispatch, allCharacters, showError, resolveCombatClash, resolveDifficultyCheck]);

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
