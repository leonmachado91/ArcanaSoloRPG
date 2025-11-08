// store/promptStore.ts
import { create } from 'zustand';
import * as promptService from '@/services/db/prompt.service';
import { Prompt } from '@/services/db/prompt.service';

/**
 * Interface for the structure of a single prompt entry in the store.
 */
export interface PromptEntry {
    content: string;
    description: string | null;
}

/**
 * Interface for the state of prompts fetched from the database.
 */
interface PromptState {
    /** A map of prompt keys to their full entry (content and description). */
    prompts: Record<string, PromptEntry>;
    isLoading: boolean;
    error: Error | null;
}

/**
 * Actions available for the prompt store.
 */
interface PromptActions {
    /** Fetches all prompts from the database and populates the store. */
    fetchPrompts: () => Promise<void>;
}

const initialState: PromptState = {
    prompts: {},
    isLoading: false,
    error: null,
};

/**
 * Zustand store for managing dynamic AI prompts.
 * This store is responsible for fetching, storing, and providing access to
 * all AI prompt templates, allowing for dynamic updates without code changes.
 */
export const usePromptStore = create<PromptState & PromptActions>((set) => ({
    ...initialState,
    fetchPrompts: async () => {
        set({ isLoading: true, error: null });
        try {
            const promptArray: Prompt[] = await promptService.fetchAllPrompts();
            
            const promptMap = promptArray.reduce((acc, prompt) => {
                acc[prompt.key] = {
                    content: prompt.content,
                    description: prompt.description
                };
                return acc;
            }, {} as Record<string, PromptEntry>);

            set({ prompts: promptMap, isLoading: false });
        } catch (error) {
            console.error("Failed to fetch prompts:", error);
            const err = error instanceof Error ? error : new Error('An unknown error occurred while fetching prompts.');
            set({ error: err, isLoading: false, prompts: {} });
            // Re-throw so the calling bootstrapper (catalogStore) can catch it.
            throw err;
        }
    },
}));