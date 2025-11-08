// types/lore.ts
// Este arquivo define a estrutura de dados para uma entrada de lore (história do mundo)
// específica de uma campanha.

/**
 * Representa uma peça de lore ou história do mundo, que pode ser usada pela IA para dar
 * profundidade à narrativa.
 */
export interface CampaignLore {
    /** ID único da entrada de lore, geralmente um UUID do Supabase. */
    id: string;
    /** ID da campanha à qual esta entrada de lore pertence. */
    campaignId: string;
    /** A categoria do lore (ex: "Deuses", "História Antiga", "Fações"). */
    category: string;
    /** O conteúdo de texto da entrada de lore. */
    content: string;
    /** Vetor de embedding para busca de similaridade (RAG). */
    embedding?: number[];
}