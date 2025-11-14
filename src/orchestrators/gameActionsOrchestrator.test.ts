import { describe, expect, it, vi } from 'vitest';
import { createGameActionsOrchestrator } from './gameActionsOrchestrator';
import { Character } from '@/types/character';
import { GameState } from '@/types/game';
import { Message } from '@/types/chat';

const buildBaseCharacter = (overrides: Partial<Character> = {}): Character => ({
    id: 'player-1',
    type: 'player',
    name: 'Jax',
    age: 25,
    description: '',
    personalityTraits: [],
    history: '',
    secret: '',
    objective: '',
    imageUrl: '',
    elements: { fire: 2, water: 1, air: 1, earth: 1 },
    advantages: [],
    disadvantages: [],
    progressPoints: 0,
    unspentElementPoints: 0,
    states: [],
    items: [],
    ...overrides,
});

const buildState = (chatHistory: Message[]): GameState => ({
    campaign: {
        id: 'campaign-1',
        title: 'Test',
        genre: '',
        worldAdjective: '',
        location: '',
        era: '',
        declarations: [],
        companionCount: 0,
        chatHistory,
        scenes: [{
            id: 'scene-1',
            campaignId: 'campaign-1',
            sceneNumber: 1,
            title: 'Cena',
            description: '',
            isActive: true,
            turnCount: 0,
            characterIds: ['player-1'],
        }],
        plotDetails: {
            centralConflict: '',
            narrativeStructure: '',
            mainMystery: '',
            finalObjective: '',
        },
        missions: [],
    },
    playerCharacter: buildBaseCharacter(),
    npcs: [],
    isMasterThinking: false,
    isSaving: false,
});

describe('createGameActionsOrchestrator', () => {
    it('resolve difficulty rolls, persist before dispatch and notify AI', async () => {
        const message: Message = {
            id: 'message-1',
            sceneId: 'scene-1',
            authorId: 'system',
            authorName: 'Motor',
            type: 'dice_roll',
            text: '',
            diceRoll: {
                type: 'difficulty_check',
                description: 'Teste',
                characterId: 'player-1',
                diceCount: 2,
                modifiers: [],
                status: 'pending',
                difficulty: 10,
            },
        };

        const state = buildState([message]);
        let persisted = false;

        const showError = vi.fn();
        const orchestrator = createGameActionsOrchestrator({
            getState: () => state,
            dispatch: vi.fn(action => {
                if (action.type === 'UPDATE_MESSAGE') {
                    expect(persisted).toBe(true);
                }
            }),
            chatService: {
                updateChatMessage: vi.fn(async (_messageId, updatedData) => {
                    expect(updatedData.diceRoll?.status).toBe('rolled');
                    persisted = true;
                }),
                saveChatMessage: vi.fn(async (masterMessage, campaignId) => {
                    expect(campaignId).toBe('campaign-1');
                    expect(masterMessage.text).toBe('Narration');
                }),
            },
            engineService: {
                performContestedCheck: vi.fn(),
                performDifficultyCheck: vi.fn(() => ({
                    rollResult: { rolls: [3, 4], total: 7 },
                    finalTotal: 9,
                    isSuccess: false,
                })),
            },
            gameMasterService: {
                notifyAIOfStateChange: vi.fn(async (notification) => {
                    expect(notification).toContain('Teste');
                    return 'Narration';
                }),
            },
            logEvent: vi.fn(),
            showError,
            formatErrorForDisplay: () => 'formatted',
            generateId: () => 'master-1',
        });

        await orchestrator.handleRollDice('message-1', [state.playerCharacter]);

        expect(persisted).toBe(true);
        expect(showError).not.toHaveBeenCalled();
    });

    it('marca erros quando o personagem não é encontrado', async () => {
        const message: Message = {
            id: 'message-2',
            sceneId: 'scene-1',
            authorId: 'system',
            authorName: 'Motor',
            type: 'dice_roll',
            text: '',
            diceRoll: {
                type: 'difficulty_check',
                description: 'Teste',
                characterId: 'unknown',
                diceCount: 2,
                modifiers: [],
                status: 'pending',
                difficulty: 10,
            },
        };

        const state = buildState([message]);
        const showError = vi.fn();

        const orchestrator = createGameActionsOrchestrator({
            getState: () => state,
            dispatch: vi.fn(action => {
                expect(action.type).toBe('UPDATE_MESSAGE');
            }),
            chatService: {
                updateChatMessage: vi.fn(async (_messageId, updatedData) => {
                    expect(updatedData.text).toContain('Erro');
                }),
                saveChatMessage: vi.fn(),
            },
            engineService: {
                performContestedCheck: vi.fn(),
                performDifficultyCheck: vi.fn(),
            },
            gameMasterService: {
                notifyAIOfStateChange: vi.fn(),
            },
            logEvent: vi.fn(),
            showError,
            formatErrorForDisplay: () => 'formatted',
            generateId: () => 'master-1',
        });

        await orchestrator.handleRollDice('message-2', []);
        expect(showError).toHaveBeenCalledWith('Erro: Personagem não encontrado.');
    });
});
