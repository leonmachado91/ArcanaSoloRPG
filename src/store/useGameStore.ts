// store/useGameStore.ts
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { GameState, GameAction, StateModificationPayload } from '@/types/game';
import { Character, Element } from '@/types/character';
import { calculateElements } from '@/utils/characterUtils';
import { logEvent } from '@/store/devLogStore';

// =================================================================================
// ESTADO INICIAL
// =================================================================================
// FIX: Export initialGameState to be used in test files.
export const initialGameState: GameState = {
    campaign: {
        id: '',
        title: '',
        genre: '',
        worldAdjective: '',
        location: '',
        era: '',
        declarations: [''],
        companionCount: 3,
        chatHistory: [],
        longTermMemorySummary: '',
        scenes: [],
        gameMode: 'narrative',
        plotDetails: {
            centralConflict: '',
            narrativeStructure: '',
            mainMystery: '',
            finalObjective: '',
        },
        missions: [],
    },
    playerCharacter: {
        id: 'player',
        type: 'player',
        name: '',
        age: 0,
        description: '',
        personalityTraits: [],
        history: '',
        secret: '',
        objective: '',
        imageUrl: '',
        elements: { fire: 1, water: 1, air: 1, earth: 1 },
        advantages: [],
        disadvantages: [],
        progressPoints: 0,
        unspentElementPoints: 0,
        states: [],
        items: [],
    },
    npcs: [],
    isMasterThinking: false,
    isSaving: false,
};

// =================================================================================
// FUNÇÕES UTILITÁRIAS DO REDUCER
// =================================================================================
const findCharacterInState = (state: GameState, characterId: string): Character | undefined => {
    if (!characterId) return undefined;
    const normalizedId = characterId.toLowerCase();
    
    if ((state.playerCharacter.id && state.playerCharacter.id.toLowerCase() === normalizedId) || 
        (state.playerCharacter.name && state.playerCharacter.name.toLowerCase() === normalizedId)) {
        return state.playerCharacter;
    }

    const npc = state.npcs.find(c => 
        (c.id && c.id.toLowerCase() === normalizedId) || 
        (c.name && c.name.toLowerCase() === normalizedId)
    );
    
    return npc;
};

// =================================================================================
// O REDUCER PRINCIPAL
// =================================================================================
// FIX: Export gameReducer to be used in test files.
export function gameReducer(state: GameState, action: GameAction): GameState {
    switch (action.type) {
        case 'SET_GAME_STATE':
            return {
                ...state,
                ...action.payload,
            };
        case 'START_NEW_CAMPAIGN':
            return JSON.parse(JSON.stringify(initialGameState));
        case 'UPDATE_CAMPAIGN': {
            const newState = {
                ...state,
                campaign: { ...state.campaign, ...action.payload },
            };
            logEvent({
                type: 'state_change',
                message: `Campanha atualizada: ${Object.keys(action.payload).join(', ')}`,
                stateBefore: state.campaign,
                stateAfter: newState.campaign,
            });
            return newState;
        }
        case 'UPDATE_PLAYER_CHARACTER': {
            const newState = {
                ...state,
                playerCharacter: { ...state.playerCharacter, ...action.payload },
            };
            logEvent({
                type: 'state_change',
                message: `Ficha do Jogador atualizada: ${Object.keys(action.payload).join(', ')}`,
                stateBefore: state.playerCharacter,
                stateAfter: newState.playerCharacter,
            });
            return newState;
        }
        case 'UPDATE_CHARACTER_DATA': {
            const { characterId, data } = action.payload;
            if (characterId === state.playerCharacter.id) {
                const newState = {
                    ...state,
                    playerCharacter: { ...state.playerCharacter, ...data },
                };
                 logEvent({
                    type: 'state_change',
                    message: `Ficha do Jogador atualizada: ${Object.keys(data).join(', ')}`,
                    stateBefore: state.playerCharacter,
                    stateAfter: newState.playerCharacter,
                });
                return newState;
            }
            const oldNpc = state.npcs.find(c => c.id === characterId);
            const newState = {
                ...state,
                npcs: state.npcs.map(c =>
                    c.id === characterId ? { ...c, ...data } : c
                ),
            };
             if (oldNpc) {
                logEvent({
                    type: 'state_change',
                    message: `Ficha do NPC (${oldNpc.name}) atualizada: ${Object.keys(data).join(', ')}`,
                    stateBefore: oldNpc,
                    stateAfter: newState.npcs.find(c => c.id === characterId),
                });
            }
            return newState;
        }
        case 'ADD_SCENE': {
            const updatedScenes = (state.campaign.scenes || []).map(s => ({ ...s, isActive: false }));
            updatedScenes.push(action.payload);
            return {
                ...state,
                campaign: {
                    ...state.campaign,
                    scenes: updatedScenes,
                },
            };
        }
        case 'UPDATE_SCENE': {
            const { sceneId, data } = action.payload;
            return {
                ...state,
                campaign: {
                    ...state.campaign,
                    scenes: (state.campaign.scenes || []).map(scene =>
                        scene.id === sceneId ? { ...scene, ...data } : scene
                    ),
                },
            };
        }
        case 'UPDATE_SCENE_CHARACTERS': {
            const { sceneId, characterIds } = action.payload;
            return {
                ...state,
                campaign: {
                    ...state.campaign,
                    scenes: (state.campaign.scenes || []).map(scene => 
                        scene.id === sceneId
                        ? { ...scene, characterIds: characterIds }
                        : scene
                    ),
                },
            };
        }
        case 'UPDATE_NPCS':
            return {
                ...state,
                npcs: action.payload,
            };
        case 'ADD_NPC':
            return {
                ...state,
                npcs: [...state.npcs, action.payload],
            };
        // Populates form data for both campaign and character creation from a single source,
        // typically used for AI-driven draft generation.
        case 'POPULATE_FORM_DATA':
            return {
                ...state,
                campaign: { ...state.campaign, ...action.payload.campaign },
                playerCharacter: { ...state.playerCharacter, ...action.payload.character },
            };
        case 'SET_CHAT_HISTORY':
            return {
                ...state,
                campaign: { ...state.campaign, chatHistory: action.payload },
            };
        case 'ADD_MESSAGES': {
            const newState = {
                ...state,
                campaign: { ...state.campaign, chatHistory: [...state.campaign.chatHistory, ...action.payload] },
            };
            logEvent({
                type: 'state_change',
                message: `Adicionada(s) ${action.payload.length} mensagem(ns) ao chat`,
                stateBefore: { chatHistoryCount: state.campaign.chatHistory.length },
                stateAfter: { chatHistoryCount: newState.campaign.chatHistory.length }
            });
            return newState;
        }
        case 'UPDATE_MESSAGE': {
            const history = state.campaign.chatHistory.map(msg =>
                msg.id === action.payload.id ? { ...msg, ...action.payload.data } : msg
            );
            return {
                ...state,
                campaign: { ...state.campaign, chatHistory: history },
            };
        }
        case 'REMOVE_MESSAGE': {
            const { messageId } = action.payload;
            return {
                ...state,
                campaign: {
                    ...state.campaign,
                    chatHistory: state.campaign.chatHistory.filter(msg => msg.id !== messageId),
                },
            };
        }
        case 'SET_IS_THINKING':
            return {
                ...state,
                isMasterThinking: action.payload,
            };
        case 'SET_IS_SAVING':
            return {
                ...state,
                isSaving: action.payload,
            };
        case 'FINISH_CAMPAIGN_SETUP': {
            const campaignId = uuidv4();
            const playerCharacterId = uuidv4();

            const newState = {
                ...state,
                campaign: {
                    ...state.campaign,
                    id: campaignId,
                },
                playerCharacter: {
                    ...state.playerCharacter,
                    id: playerCharacterId,
                }
            };

            logEvent({
                type: 'system',
                message: 'Configuração da campanha finalizada (UUIDs gerados)',
                payload: {
                    campaignId: newState.campaign.id,
                    playerCharacterId: newState.playerCharacter.id
                }
            });

            return newState;
        }
        case 'MODIFY_STATE': {
            const { characterId, modifications, allAdvantageTraits } = action.payload;
            const providedAdvantageTraits = Array.isArray(allAdvantageTraits) ? allAdvantageTraits : [];
            const filteredAdvantageTraits = providedAdvantageTraits.filter(trait => trait?.type === 'advantage');
            let missingAdvantageTraitsWarningIssued = false;

            const characterToModify = findCharacterInState(state, characterId);
            if (!characterToModify) {
                console.warn(`[gameReducer] Personagem com ID/Nome "${characterId}" n�o encontrado para MODIFY_STATE.`);
                return state;
            }

            const applyModifications = (char: Character): Character => {
                let updatedChar = JSON.parse(JSON.stringify(char));

                modifications.forEach((mod: StateModificationPayload) => {
                    switch (mod.path) {
                        case 'items': {
                            const itemName = mod.value.name;
                            const itemIndex = updatedChar.items.findIndex((i: any) => i.name === itemName);
                            if (mod.action === 'add') {
                                if (itemIndex > -1) {
                                    updatedChar.items[itemIndex].quantity += (mod.value.quantity || 1);
                                } else {
                                    updatedChar.items.push({ name: itemName, quantity: mod.value.quantity || 1, description: mod.value.description || '' });
                                }
                            } else if (mod.action === 'remove') {
                                if (itemIndex > -1) {
                                    const newQuantity = updatedChar.items[itemIndex].quantity - (mod.value.quantity || 1);
                                    if (newQuantity <= 0) {
                                        updatedChar.items.splice(itemIndex, 1);
                                    } else {
                                        updatedChar.items[itemIndex].quantity = newQuantity;
                                    }
                                }
                            }
                            break;
                        }
                        case 'states': {
                            if (mod.action === 'add') {
                                if (!updatedChar.states.some((s: any) => s.name === mod.value.name)) {
                                    updatedChar.states.push(mod.value);
                                }
                            } else if (mod.action === 'remove') {
                                const stateIndex = updatedChar.states.findIndex((s: any) => s.name === mod.value.name);
                                if (stateIndex > -1) {
                                    updatedChar.states.splice(stateIndex, 1);
                                }
                            } else if (mod.action === 'set') {
                                updatedChar.states = mod.value;
                            }
                            break;
                        }
                        case 'advantages':
                        case 'disadvantages': {
                            const list = updatedChar[mod.path];
                            const itemExists = list.includes(mod.value);
                            if (mod.action === 'add' && !itemExists) {
                                list.push(mod.value);
                            } else if (mod.action === 'remove' && itemExists) {
                                updatedChar[mod.path] = list.filter((item: string) => item !== mod.value);
                            }
                            if (filteredAdvantageTraits.length === 0 && !missingAdvantageTraitsWarningIssued) {
                                console.warn('[gameReducer] Lista de vantagens do cat�logo n�o fornecida na action MODIFY_STATE. Elementos recalculados assumindo valores base.');
                                missingAdvantageTraitsWarningIssued = true;
                            }
                            updatedChar.elements = calculateElements(updatedChar.advantages, filteredAdvantageTraits);
                            break;
                        }
                        case 'elements': {
                            if (mod.action === 'set') {
                                updatedChar.elements = mod.value as Record<Element, number>;
                            } else if (mod.action === 'add' && 'element' in mod.value) {
                                const { element, amount } = mod.value;
                                if (updatedChar.elements[element] !== undefined) {
                                    updatedChar.elements[element] += amount;
                                }
                            }
                            break;
                        }
                        case 'progressPoints': {
                            if (mod.action === 'set') {
                                updatedChar.progressPoints = mod.value;
                            } else if (mod.action === 'add') {
                                updatedChar.progressPoints = (updatedChar.progressPoints || 0) + mod.value;
                            }
                            break;
                        }
                        case 'unspentElementPoints': {
                             if (mod.action === 'set') {
                                updatedChar.unspentElementPoints = mod.value;
                            } else if (mod.action === 'add') {
                                updatedChar.unspentElementPoints = (updatedChar.unspentElementPoints || 0) + mod.value;
                            }
                            break;
                        }
                    }
                });
                return updatedChar;
            };

            const isPlayer = characterToModify.id === state.playerCharacter.id;

            let newState: GameState;
            if (isPlayer) {
                newState = { ...state, playerCharacter: applyModifications(state.playerCharacter) };
            } else {
                newState = {
                    ...state,
                    npcs: state.npcs.map(c => c.id === characterToModify.id ? applyModifications(c) : c)
                };
            }

            const finalModifiedChar = isPlayer ? newState.playerCharacter : newState.npcs.find(c => c.id === characterToModify.id);

            logEvent({
                type: 'state_change',
                message: `Estado modificado para: ${characterToModify.name || characterId}`,
                stateBefore: characterToModify,
                stateAfter: finalModifiedChar,
            });

            return newState;
        }
        default:
            return state;
    }
}

// =================================================================================
// CRIAÇÃO DO STORE ZUSTAND
// =================================================================================
interface GameStore extends GameState {
    dispatch: (action: GameAction) => void;
}

export const useGameStore = create<GameStore>((set) => ({
    ...initialGameState,
    dispatch: (action: GameAction) => {
        set(state => gameReducer(state, action));
    },
}));
