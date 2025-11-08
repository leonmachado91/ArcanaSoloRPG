// store/useRawChatStore.ts
import { create } from 'zustand';
import { Content } from "@google/genai";

interface RawChatState {
    history: Content[];
    systemInstruction: string | null;
}

interface RawChatActions {
    setHistory: (history: Content[]) => void;
    setSystemInstruction: (instruction: string | null) => void;
    clearChat: () => void;
}

const initialState: RawChatState = {
    history: [],
    systemInstruction: null,
};

export const useRawChatStore = create<RawChatState & RawChatActions>((set) => ({
    ...initialState,
    setHistory: (history) => set({ history: [...history] }), // Create a new array to trigger re-renders
    setSystemInstruction: (instruction) => set({ systemInstruction: instruction }),
    clearChat: () => set(initialState),
}));