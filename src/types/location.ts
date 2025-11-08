// types/location.ts
// Este arquivo define a estrutura de dados para um local dentro do mundo da campanha.

/**
 * Representa um local específico no mundo do jogo, como uma cidade, taverna ou masmorra.
 */
export interface Location {
    /** ID único do local, geralmente um UUID do Supabase. */
    id: string;
    /** ID da campanha à qual este local pertence. */
    campaignId: string;
    /** O nome do local. */
    name: string;
    /** Uma descrição visual e sensorial do local. */
    description: string;
    /** A história ou lore associado a este local. */
    history: string;
    /** Qualquer outra informação relevante que a IA deva saber sobre o local. */
    relevantInfo?: string;
    /** Vetor de embedding para busca de similaridade (RAG). */
    embedding?: number[];
}