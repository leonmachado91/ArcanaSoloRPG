// src/orchestrators/gameActionsOrchestrator.ts
// Centraliza a lógica de resolução de rolagens e a persistência dos resultados,
// mantendo os hooks React focados apenas em expor callbacks à UI.

import type { logEvent as devLogEvent } from '@/store/devLogStore';
import { Character } from '@/types/character';
import { DiceRoll, Message } from '@/types/chat';
import { GameAction, GameState, createAppError } from '@/types/game';

type EngineServiceContract = Pick<
    typeof import('@/services/engineService')['engineService'],
    'performContestedCheck' | 'performDifficultyCheck'
>;

type ChatServiceContract = Pick<
    typeof import('@/services/db/chat.service'),
    'updateChatMessage' | 'saveChatMessage'
>;

type GameMasterGateway = Pick<
    typeof import('@/services/gameMasterService')['gameMasterService'],
    'notifyAIOfStateChange'
>;

export interface GameActionsOrchestratorDeps {
    getState: () => GameState;
    dispatch: (action: GameAction) => void;
    chatService: ChatServiceContract;
    engineService: EngineServiceContract;
    gameMasterService: GameMasterGateway;
    logEvent: typeof devLogEvent;
    showError: (message: string) => void;
    formatErrorForDisplay: (error: unknown, fallbackMessage: string) => string;
    generateId: () => string;
}

const COMBAT_CONTEXT = 'gameActionsOrchestrator.handleRollDice';

const markRollAsError = async (
    messageId: string,
    diceRoll: DiceRoll,
    reason: string,
    deps: Pick<GameActionsOrchestratorDeps, 'chatService' | 'dispatch' | 'showError'>
) => {
    const errorUpdate: Partial<Message> = {
        text: reason,
        diceRoll: { ...diceRoll, status: 'rolled' as const },
    };
    await deps.chatService.updateChatMessage(messageId, errorUpdate);
    deps.dispatch({ type: 'UPDATE_MESSAGE', payload: { id: messageId, data: errorUpdate } });
    deps.showError(reason);
};

const buildCombatResolution = (
    diceRoll: DiceRoll,
    attacker: Character,
    defender: Character,
    deps: Pick<GameActionsOrchestratorDeps, 'engineService' | 'logEvent'>
): Partial<Message> => {
    const attackerModifier = (diceRoll.modifiers || []).reduce((sum, mod) => sum + mod.value, 0);
    const defenderModifier = (diceRoll.defenderModifiers || []).reduce((sum, mod) => sum + mod.value, 0);

    const result = deps.engineService.performContestedCheck(
        diceRoll.diceCount,
        defender.elements.earth,
        attackerModifier,
        defenderModifier
    );

    deps.logEvent({
        type: 'system',
        message: 'Ação Contestada (Combate) Resolvida via Chat',
        payload: { attacker: attacker.name, defender: defender.name, attackerModifier, defenderModifier, result },
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
        },
    };

    return {
        diceRoll: updatedDiceRoll,
        text: `Resultado do combate: ${result.outcome}. Severidade: ${result.damageSeverity || 'N/A'}.`,
    };
};

const buildDifficultyResolution = (
    diceRoll: DiceRoll,
    character: Character,
    deps: Pick<GameActionsOrchestratorDeps, 'engineService' | 'logEvent'>
): Partial<Message> => {
    const modifier = (diceRoll.modifiers || []).reduce((sum, mod) => sum + mod.value, 0);
    const result = deps.engineService.performDifficultyCheck(diceRoll.diceCount, diceRoll.difficulty ?? 0, modifier);

    deps.logEvent({
        type: 'system',
        message: `Teste de Dificuldade Resolvido via Chat: ${diceRoll.testName || diceRoll.element}`,
        payload: {
            characterName: character.name,
            element: diceRoll.element,
            diceCount: diceRoll.diceCount,
            difficulty: diceRoll.difficulty,
            modifier,
            result,
        },
    });

    const updatedDiceRoll: DiceRoll = {
        ...diceRoll,
        status: 'rolled',
        result: {
            rolls: result.rollResult.rolls,
            sum: result.rollResult.total,
            total: result.finalTotal,
            success: result.isSuccess,
        },
    };

    return { diceRoll: updatedDiceRoll };
};

const buildNotificationText = (diceRoll: DiceRoll, allCharacters: Character[]): string => {
    if (diceRoll.type === 'difficulty_check' && diceRoll.result) {
        const outcome = diceRoll.result.success ? 'SUCESSO' : 'FALHA';
        return `[MUDANÇA DE ESTADO NO JOGO]: O teste '${diceRoll.description}' foi resolvido. Resultado: ${outcome} (${diceRoll.result.total} vs ${diceRoll.difficulty}).`;
    }

    if (
        diceRoll.type === 'combat_clash' &&
        diceRoll.outcome &&
        diceRoll.result &&
        diceRoll.defenderResult
    ) {
        const attacker = allCharacters.find(c => c.id === diceRoll.characterId);
        const defender = allCharacters.find(c => c.id === diceRoll.vsCharacterId);
        const attackerName = attacker?.name || 'Atacante';
        const defenderName = defender?.name || 'Defensor';

        return `[MUDANÇA DE ESTADO NO JOGO]: O confronto '${diceRoll.description}' entre ${attackerName} e ${defenderName} foi resolvido. Resultado: ${diceRoll.outcome} (${diceRoll.result.total} vs ${diceRoll.defenderResult.total}).`;
    }

    return '';
};

const persistMessageUpdate = async (
    messageId: string,
    updatedData: Partial<Message>,
    deps: Pick<GameActionsOrchestratorDeps, 'chatService' | 'dispatch'>
) => {
    await deps.chatService.updateChatMessage(messageId, updatedData);
    deps.dispatch({ type: 'UPDATE_MESSAGE', payload: { id: messageId, data: updatedData } });
};

const persistMasterNarration = async (
    narrationText: string,
    deps: Pick<GameActionsOrchestratorDeps, 'chatService' | 'dispatch' | 'generateId' | 'getState'>
) => {
    const { campaign } = deps.getState();
    const activeScene = campaign.scenes?.find(scene => scene.isActive);
    if (!activeScene) {
        console.warn('[gameActionsOrchestrator] Nenhuma cena ativa encontrada para salvar a narração do mestre.');
        return;
    }

    const masterMessage: Message = {
        id: deps.generateId(),
        sceneId: activeScene.id,
        authorId: 'master',
        authorName: 'Mestre',
        type: 'chat',
        text: narrationText,
    };

    await deps.chatService.saveChatMessage(masterMessage, campaign.id);
    deps.dispatch({ type: 'ADD_MESSAGES', payload: [masterMessage] });
};

export const createGameActionsOrchestrator = (deps: GameActionsOrchestratorDeps) => {
    const getMessageById = (messageId: string) => {
        const { campaign } = deps.getState();
        return campaign.chatHistory.find(message => message.id === messageId);
    };

    const handleNotification = async (diceRoll: DiceRoll, allCharacters: Character[]) => {
        const notificationText = buildNotificationText(diceRoll, allCharacters);
        if (!notificationText) return;

        try {
            const narration = await deps.gameMasterService.notifyAIOfStateChange(notificationText);
            if (narration && narration.trim() !== '') {
                await persistMasterNarration(narration, {
                    chatService: deps.chatService,
                    dispatch: deps.dispatch,
                    generateId: deps.generateId,
                    getState: deps.getState,
                });
            }
        } catch (error) {
            const formatted = deps.formatErrorForDisplay(
                error,
                'Falha ao obter narração da IA após a rolagem.'
            );
            deps.showError(formatted);
        }
    };

    const resolveRoll = async (message: Message, allCharacters: Character[]) => {
        const { diceRoll } = message;
        if (!diceRoll) return;

        const character = allCharacters.find(c => c.id === diceRoll.characterId);
        if (!character) {
            await markRollAsError(
                message.id,
                diceRoll,
                'Erro: Personagem não encontrado.',
                {
                    chatService: deps.chatService,
                    dispatch: deps.dispatch,
                    showError: deps.showError,
                }
            );
            return;
        }

        if (diceRoll.type === 'combat_clash' && !diceRoll.vsCharacterId) {
            await markRollAsError(
                message.id,
                diceRoll,
                'Erro: Personagem oponente do confronto não informado.',
                {
                    chatService: deps.chatService,
                    dispatch: deps.dispatch,
                    showError: deps.showError,
                }
            );
            return;
        }

        let updatedData: Partial<Message>;

        if (diceRoll.type === 'combat_clash') {
            const defender = allCharacters.find(c => c.id === diceRoll.vsCharacterId);
            if (!defender) {
                await markRollAsError(
                    message.id,
                    diceRoll,
                    'Erro: Personagem oponente do confronto não encontrado.',
                    {
                        chatService: deps.chatService,
                        dispatch: deps.dispatch,
                        showError: deps.showError,
                    }
                );
                return;
            }
            updatedData = buildCombatResolution(diceRoll, character, defender, {
                engineService: deps.engineService,
                logEvent: deps.logEvent,
            });
        } else {
            updatedData = buildDifficultyResolution(diceRoll, character, {
                engineService: deps.engineService,
                logEvent: deps.logEvent,
            });
        }

        await persistMessageUpdate(message.id, updatedData, {
            chatService: deps.chatService,
            dispatch: deps.dispatch,
        });

        if (updatedData.diceRoll?.status === 'rolled') {
            await handleNotification(updatedData.diceRoll, allCharacters);
        }
    };

    return {
        async handleRollDice(messageId: string, allCharacters: Character[]) {
            const message = getMessageById(messageId);
            if (!message?.diceRoll || message.diceRoll.status !== 'pending') {
                return;
            }

            try {
                await resolveRoll(message, allCharacters);
            } catch (error) {
                const friendly = deps.formatErrorForDisplay(
                    error,
                    'Falha ao salvar o resultado da rolagem.'
                );
                deps.showError(friendly);
                throw createAppError('UNKNOWN_ERROR', friendly, error, COMBAT_CONTEXT);
            }
        },
    };
};
