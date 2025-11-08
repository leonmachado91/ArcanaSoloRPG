// types/character.ts
// Este arquivo define as estruturas de dados (interfaces TypeScript) para tudo relacionado
// a um personagem, seja ele o jogador, um companheiro ou um NPC.

/**
 * Define os quatro elementos fundamentais do sistema de regras.
 */
export type Element = 'fire' | 'water' | 'air' | 'earth';

/**
 * Define a severidade do dano em um ataque bem-sucedido.
 */
export type DamageSeverity = 'leve' | 'moderada' | 'grave' | 'sem_dano' | 'no_damage';

/**
 * Define a estrutura de uma Vantagem ou Desvantagem, conforme armazenado no banco de dados.
 */
export interface TraitDefinition {
    /** ID numérico único do trait. */
    id: number;
    /** O nome do trait (ex: "Atleta Completo"). */
    name: string;
    /** O elemento ao qual o trait está associado. */
    element: Element;
    /** A descrição do que o trait faz, mecanicamente ou narrativamente. */
    description: string;
    /** O custo em pontos (positivo para vantagens, negativo para desvantagens). */
    points: number;
    /** O tipo de trait. */
    type: 'advantage' | 'disadvantage';
}

/**
 * Define a estrutura de uma Condição (estado físico ou mental), conforme armazenado no banco de dados.
 */
export interface ConditionDefinition {
    id: number;
    name: string;
    category: string;
    level_1_description: string;
    level_2_description: string;
    level_3_description: string;
    type: 'positive' | 'negative';
    nature: 'physical' | 'mental';
    embedding?: number[]; // Vetor para busca de similaridade (RAG).
}

/**
 * Define a estrutura para os traits agrupados, para uso na UI de criação de personagem.
 */
export interface GroupedTraits {
    advantages: Record<string, TraitDefinition[]>;
    disadvantages: Record<string, TraitDefinition[]>;
}

/**
 * A interface principal que representa a ficha de um personagem.
 */
export interface Character {
    /** ID único do personagem, geralmente um UUID do Supabase. */
    id: string;
    /** O tipo de personagem, determinando seu papel no jogo. */
    type: 'player' | 'companion' | 'npc';
    /** O nome do personagem. */
    name: string;
    /** A idade do personagem. */
    age: number;
    /** A descrição física do personagem. */
    description: string;
    /** Uma lista de traços de personalidade (ex: "Corajoso", "Cínico"). */
    personalityTraits: string[];
    /** URL para a imagem/avatar do personagem. */
    imageUrl: string;
    /** Gênero do personagem, usado principalmente para seleção de voz TTS. */
    gender?: 'male' | 'female' | 'neutral';
    /** Um objeto contendo a pontuação final para cada um dos quatro elementos. */
    elements: {
        [key in Element]: number;
    };
    /** Uma lista com os nomes das Vantagens que o personagem possui. */
    advantages: string[];
    /** Uma lista com os nomes das Desvantagens que o personagem possui. */
    disadvantages: string[];
    /** O total de pontos de progresso acumulados pelo personagem. */
    progressPoints: number;
    /** Pontos de elemento não gastos, ganhos ao completar marcos de progresso. */
    unspentElementPoints: number;
    /** O segredo do personagem, que deve ser mantido oculto dos outros. */
    secret?: string;
    /** O objetivo principal do personagem na campanha. */
    objective?: string;
    /** A história de fundo (background) do personagem. */
    history: string;
    /** Uma lista de condições ativas (positivas ou negativas) que afetam o personagem. */
    states: { name: string; description: string; type: 'positive' | 'negative'; intensity?: 'Leve' | 'Moderado' | 'Grave'; remaining_turns?: number | null }[];
    /** O inventário do personagem. */
    items: { name: string; quantity: number; description?: string; item_type?: 'quest' | 'standard' }[];
    /** Um prompt de sistema específico para a IA, guiando o comportamento de um NPC. */
    behaviorPrompt?: string;
    /** Vetor de embedding da ficha completa, para busca de similaridade (RAG). */
    sheetEmbedding?: number[];
    /** O arquétipo do personagem (ex: "Guerreiro", "Mago"). */
    archetype?: string;
}