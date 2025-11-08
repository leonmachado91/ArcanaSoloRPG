// types/game.ts
// Este arquivo define as estruturas de dados centrais que governam o estado da aplicação,
// as ações que podem modificá-lo (para o `gameReducer`), e um sistema robusto de
// tratamento de erros padronizado.

import { Campaign } from './campaign';
import { Character, Element, TraitDefinition } from './character';
import { Message } from './chat';
import { Scene } from './scene';

/**
 * A interface principal que representa o estado completo e global do jogo em um dado momento.
 * É o objeto gerenciado pelo `GameContext`.
 */
export interface GameState {
    campaign: Campaign;
    playerCharacter: Character;
    npcs: Character[];
    isMasterThinking: boolean;
    isSaving?: boolean;
}

// --- Tipos de Modificação de Estado ---
export type ItemModification = { path: 'items'; action: 'add' | 'remove'; value: { name: string; description?: string; quantity?: number } };
// FIX: Add a 'set' action to StateConditionModification to allow replacing the entire states array.
export type StateConditionModification = 
  | { path: 'states'; action: 'add' | 'remove'; value: { name: string; description: string; type: 'positive' | 'negative'; intensity?: 'Leve' | 'Moderado' | 'Grave'; remaining_turns?: number | null } }
  | { path: 'states'; action: 'set'; value: Character['states'] };
export type TraitModification = { path: 'advantages' | 'disadvantages'; action: 'add' | 'remove'; value: string };
export type ProgressPointsModification = { path: 'progressPoints'; action: 'add' | 'set'; value: number };
export type UnspentElementPointsModification = { path: 'unspentElementPoints'; action: 'add' | 'set'; value: number };
export type ElementModification = { path: 'elements'; action: 'set'; value: { [key in Element]: number } } | { path: 'elements'; action: 'add'; value: { element: Element; amount: number } };

export type StateModificationPayload = 
  | ItemModification 
  | StateConditionModification 
  | TraitModification 
  | ProgressPointsModification 
  | UnspentElementPointsModification 
  | ElementModification;


/**
 * Define todas as ações possíveis que podem ser despachadas para o `gameReducer`.
 * O uso de uma união de tipos (union type) garante que apenas ações válidas
 * com os payloads corretos possam modificar o estado do jogo.
 */
export type GameAction =
  | { type: 'SET_GAME_STATE'; payload: GameState }
  | { type: 'START_NEW_CAMPAIGN' }
  | { type: 'UPDATE_CAMPAIGN'; payload: Partial<Campaign> }
  | { type: 'UPDATE_PLAYER_CHARACTER'; payload: Partial<Character> }
  | { type: 'UPDATE_NPCS'; payload: Character[] }
  | { type: 'ADD_NPC'; payload: Character }
  | { type: 'SET_CHAT_HISTORY'; payload: Message[] }
  | { type: 'ADD_MESSAGES'; payload: Message[] }
  | { type: 'UPDATE_MESSAGE'; payload: { id: string; data: Partial<Message> } }
  | { type: 'REMOVE_MESSAGE'; payload: { messageId: string } }
  | { type: 'SET_IS_THINKING'; payload: boolean }
  | { type: 'SET_IS_SAVING'; payload: boolean }
  /** Populates campaign and character creation forms with data, e.g., from an AI draft. */
  | { type: 'POPULATE_FORM_DATA'; payload: { campaign: Partial<Campaign>, character: Partial<Character> } }
  | { type: 'FINISH_CAMPAIGN_SETUP' }
  | { type: 'UPDATE_CHARACTER_DATA'; payload: { characterId: string; data: Partial<Character> } }
  | { type: 'MODIFY_STATE'; payload: { characterId: string; modifications: StateModificationPayload[]; allAdvantageTraits: TraitDefinition[] } }
  | { type: 'ADD_SCENE'; payload: Scene }
  | { type: 'UPDATE_SCENE'; payload: { sceneId: string; data: Partial<Scene> } }
  | { type: 'UPDATE_SCENE_CHARACTERS'; payload: { sceneId: string; characterIds: string[] } };

// --- Sistema de Tratamento de Erros Padronizado ---

/**
 * Códigos de erro padronizados para identificar a origem de um problema.
 */
export type ErrorCode =
    | "SUPABASE_ERROR"
    | "NETWORK_ERROR"
    | "GEMINI_API_ERROR"
    | "VALIDATION_ERROR"
    | "FILE_OPERATION_ERROR"
    // FIX: Added 'AUTH_ERROR' to the ErrorCode type to allow its use in supabaseService.
    | "AUTH_ERROR"
    | "UNKNOWN_ERROR";

/**
 * Define uma estrutura de erro customizada para a aplicação, garantindo que
 * todos os erros capturados tenham um formato consistente e informativo.
 */
export interface AppError {
    success: false;
    code: ErrorCode;
    message: string;
    details: any; // Detalhes técnicos do erro original (ex: objeto de erro da API).
    context: string; // O nome da função ou processo onde o erro ocorreu.
}

/**
 * Type guard para verificar se um objeto de erro desconhecido é um `AppError`.
 * @param error O erro capturado em um bloco `catch`.
 * @returns `true` se o objeto corresponder à estrutura `AppError`.
 */
export const isAppError = (error: unknown): error is AppError => {
    return (
        typeof error === 'object' &&
        error !== null &&
        'success' in error &&
        (error as AppError).success === false &&
        'code' in error &&
        'message' in error &&
        'context' in error
    );
};

/**
 * Factory function para criar um `AppError` de forma consistente.
 * Também loga o erro no console para fins de depuração.
 * @param code O código do erro.
 * @param message Uma mensagem amigável explicando o erro.
 * @param details O objeto de erro original ou detalhes técnicos.
 * @param context O local onde o erro ocorreu.
 * @returns Um objeto `AppError` formatado.
 */
export const createAppError = (
    code: ErrorCode,
    message: string,
    details: any,
    context: string
): AppError => {
    console.error(`[AppError] Context: ${context} | Code: ${code} | Message: ${message}`, details);
    return { success: false, code, message, details, context };
};

/**
 * Formata um erro (seja `AppError`, `Error` nativo ou outro objeto)
 * em uma string legível e amigável para ser exibida ao usuário em um toast ou alerta.
 * @param error O erro capturado em um bloco `catch`.
 * @param fallbackMessage Uma mensagem genérica para usar se o erro não for informativo.
 * @returns Uma string formatada para exibição na UI.
 */
export const formatErrorForDisplay = (error: unknown, fallbackMessage: string): string => {
    if (isAppError(error)) {
        let finalMessage = error.message;
        const details = error.details;
        
        // Extrai detalhes adicionais do objeto de erro original, se disponíveis.
        if (details && typeof details === 'object' && 'message' in details && typeof details.message === 'string') {
            if (!finalMessage.includes(details.message)) {
                 finalMessage = `${finalMessage} Detalhes: ${details.message}`;
            }
        } else if (details instanceof Error) {
             if (!finalMessage.includes(details.message)) {
                finalMessage = `${finalMessage} Causa: ${details.message}`;
             }
        }
        return finalMessage;
    }

    if (error instanceof Error) {
        return error.message;
    }

    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        return error.message;
    }

    return fallbackMessage;
};
