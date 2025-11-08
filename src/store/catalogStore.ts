// store/catalogStore.ts
import { create } from 'zustand';
import * as catalogService from '@/services/db/catalog.service';
import * as rulesService from '@/services/db/rules.service'; // Import new service
import { TraitDefinition, GroupedTraits, ConditionDefinition } from '@/types/character';
import { ArcanaCard } from '@/types/chat';
import { Rule } from '@/types/rules'; // Import new type
import { ELEMENT_GROUP_ORDER } from '@/data/rules/traits';
import { usePromptStore } from './promptStore';

export interface ArcanaDecks {
    verbo: string[];
    tema: string[];
    adjetivo: string[];
    emocao: string[];
}

interface CatalogState {
    traits: TraitDefinition[];
    conditions: ConditionDefinition[];
    arcanaCards: ArcanaCard[];
    rules: Rule[]; // Add rules to state
    groupedTraits: GroupedTraits;
    decks: ArcanaDecks;
    isLoading: boolean;
    error: Error | null;
}

interface CatalogActions {
    fetchCatalogs: () => Promise<void>;
}

const initialState: CatalogState = {
    traits: [],
    conditions: [],
    arcanaCards: [],
    rules: [], // Add rules to initial state
    groupedTraits: { advantages: {}, disadvantages: {} },
    decks: { verbo: [], tema: [], adjetivo: [], emocao: [] },
    isLoading: true,
    error: null,
};

export const useCatalogStore = create<CatalogState & CatalogActions>((set, get) => ({
    ...initialState,
    fetchCatalogs: async () => {
        if (get().isLoading === false && get().traits.length > 0) return; // Already fetched
        set({ isLoading: true, error: null });
        try {
            // A busca de catálogos agora também aciona a busca de prompts e regras.
            // As duas operações ocorrem em paralelo para otimizar o tempo de carregamento.
            const [traits, conditions, arcanaCards, rules, _] = await Promise.all([
                catalogService.fetchAllTraits(),
                catalogService.fetchAllConditions(),
                catalogService.fetchAllArcanaCards(),
                rulesService.fetchAllRules(), // Add fetch for rules
                usePromptStore.getState().fetchPrompts(), // Aciona a busca de prompts.
            ]);

            // Process traits into groupedTraits
            const newGroupedTraits: GroupedTraits = { advantages: {}, disadvantages: {} };
            for (const trait of traits) {
                const groupName = ELEMENT_GROUP_ORDER[trait.element];
                if (trait.type === 'advantage') {
                    if (!newGroupedTraits.advantages[groupName]) newGroupedTraits.advantages[groupName] = [];
                    newGroupedTraits.advantages[groupName].push(trait);
                } else if (trait.type === 'disadvantage') {
                    if (!newGroupedTraits.disadvantages[groupName]) newGroupedTraits.disadvantages[groupName] = [];
                    newGroupedTraits.disadvantages[groupName].push(trait);
                }
            }

            // Process arcanaCards into decks
            const newDecks: ArcanaDecks = { verbo: [], tema: [], adjetivo: [], emocao: [] };
            for (const card of arcanaCards) {
                switch (card.deck) {
                    case 'Verbo': newDecks.verbo.push(card.content); break;
                    case 'Tema': newDecks.tema.push(card.content); break;
                    case 'Adjetivo': newDecks.adjetivo.push(card.content); break;
                    case 'Emoção': newDecks.emocao.push(card.content); break;
                }
            }

            set({ 
                traits, 
                conditions, 
                arcanaCards,
                rules, // Set rules in state
                groupedTraits: newGroupedTraits,
                decks: newDecks,
                isLoading: false 
            });

        } catch (error) {
            console.error("Failed to fetch initial app catalogs, prompts, and rules:", error);
            const err = error instanceof Error ? error : new Error(String(error));
            set({ error: err, isLoading: false });
        }
    },
}));
