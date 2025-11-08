// store/devLogStore.ts
import { create } from 'zustand';

// --- DEFINIÇÃO DOS TIPOS DE LOG ---
export interface PlayerActionLogEntry {
    type: 'player_action';
    id: number;
    timestamp: string;
    actionText: string;
    isOffTopic?: boolean;
}
export interface StateChangeLogEntry {
    type: 'state_change';
    id: number;
    timestamp: string;
    message: string;
    stateBefore?: any;
    stateAfter?: any;
}
export interface AiLogEntry {
    type: 'ai';
    id: number;
    timestamp: string;
    requestPrompt: string;
    systemInstruction: string;
    rawResponse: string;
    inputTokens: number;
    outputTokens: number;
    estimatedCost: number;
    modelUsed: string;
    taskType: string;
    responseTimeMs: number;
    toolCalls?: { name: string; args: any; result: any }[];
}
export interface DbLogEntry {
    type: 'db';
    id: number;
    timestamp: string;
    functionName: string;
    params: any;
    response: any;
    responseTimeMs: number;
}
export interface SystemLogEntry {
    type: 'system';
    id: number;
    timestamp: string;
    message: string;
    payload?: any;
}

export type DevLogEntry = PlayerActionLogEntry | StateChangeLogEntry | AiLogEntry | DbLogEntry | SystemLogEntry;
export type LogType = DevLogEntry['type'];

// --- LÓGICA DO STORE ---
interface DevLogState {
    logEntries: DevLogEntry[];
}

interface DevLogActions {
    addLogEntry: (entry: DevLogEntry) => void;
    clearLog: () => void;
}

export const useDevLogStore = create<DevLogState & DevLogActions>((set) => ({
    logEntries: [],
    addLogEntry: (entry) => set((state) => ({ logEntries: [entry, ...state.logEntries] })),
    clearLog: () => set({ logEntries: [] }),
}));


// --- FUNÇÃO DE LOGGING GLOBAL ---
type LogEventPayload = 
    | Omit<PlayerActionLogEntry, 'id' | 'timestamp'>
    | Omit<StateChangeLogEntry, 'id' | 'timestamp'>
    | Omit<AiLogEntry, 'id' | 'timestamp'>
    | Omit<DbLogEntry, 'id' | 'timestamp'>
    | Omit<SystemLogEntry, 'id' | 'timestamp'>;

let logIdCounter = 0;

/**
 * Função global para registrar um evento no dev log.
 * @param entryData Os dados do evento a serem registrados.
 */
export const logEvent = (entryData: LogEventPayload) => {
    const newEntry: DevLogEntry = {
        ...entryData,
        id: logIdCounter++,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    } as DevLogEntry; 

    // Adiciona o novo log ao store Zustand.
    useDevLogStore.getState().addLogEntry(newEntry);
};