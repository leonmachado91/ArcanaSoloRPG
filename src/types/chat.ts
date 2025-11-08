// types/chat.ts
// Este arquivo define as estruturas de dados (interfaces TypeScript) para os elementos
// interativos que aparecem no chat do jogo, como mensagens, rolagens de dados e cartas do Arcana.

import { Element, Character, DamageSeverity } from './character';

/**
 * Representa o resultado de um sorteio de cartas do Arcana, com uma carta de cada um dos quatro baralhos.
 */
export interface ArcanaCardDraw {
    verb: string;
    theme: string;
    adjective: string;
    emotion: string;
}

/**
 * Define a estrutura de uma única carta do Arcana, conforme armazenada no banco de dados.
 */
export interface ArcanaCard {
    id: number;
    deck: 'Verbo' | 'Tema' | 'Adjetivo' | 'Emoção';
    content: string;
    embedding?: number[]; // Vetor para busca de similaridade (RAG).
}

/**
 * Define os diferentes tipos de rolagens de dados que podem ocorrer no jogo.
 */
export type RollType = 'difficulty_check' | 'combat_clash' | 'state_check' | 'oracle';

/**
 * Define o resultado de um combate.
 */
export type ContestedCheckOutcome = 'attacker_wins' | 'defender_wins' | 'tie';


/**
 * Define o status de uma rolagem de dados (se ela ainda precisa ser rolada ou se já foi).
 */
export type RollStatus = 'pending' | 'rolled';

/**
 * Representa um modificador aplicado a uma rolagem de dados (ex: +1 por uma vantagem).
 */
export interface RollModifier {
    description: string;
    value: number;
}

/**
 * Representa o resultado numérico de uma rolagem de dados após ter sido efetuada.
 */
export interface RollResult {
    /** Os valores individuais de cada dado rolado. */
    rolls: number[];
    /** A soma dos valores dos dados. */
    sum: number;
    /** A soma total, incluindo modificadores. */
    total: number;
    /** Se a rolagem foi um sucesso (comparado à dificuldade). Opcional para rolagens de oráculo. */
    success?: boolean;
}

/**
 * A estrutura completa de uma solicitação de rolagem de dados.
 */
export interface DiceRoll {
    /** O nome específico do teste (ex: "Teste de Força"). */
    testName?: string;
    /** O tipo da rolagem. */
    type: RollType;
    /** A descrição narrativa do que está sendo testado. */
    description: string;
    /** O ID do personagem que está realizando a rolagem. */
    characterId: string;
    /** O ID do personagem oponente em um teste contestado. */
    vsCharacterId?: string;
    /** O elemento sendo testado (se aplicável). */
    element?: Element;
    /** O número de dados a serem rolados. */
    diceCount: number;
    /** O valor alvo que precisa ser superado para um sucesso. */
    difficulty?: number;
    /** Uma lista de modificadores para o atacante/personagem principal. */
    modifiers: RollModifier[];
    /** Uma lista de modificadores para o defensor em um teste contestado. */
    defenderModifiers?: RollModifier[];
    /** O status atual da rolagem. */
    status: RollStatus;
    /** O resultado da rolagem para o atacante/personagem principal. */
    result?: RollResult;
    /** O resultado da rolagem para o defensor em um teste contestado. */
    defenderResult?: RollResult;
    /** O resultado explícito de um confronto ('attacker_wins', 'defender_wins', 'tie'). */
    outcome?: ContestedCheckOutcome;
    /** A severidade do dano calculada em um confronto. */
    damageSeverity?: DamageSeverity;
}

/**
 * A interface principal para uma mensagem no histórico de chat.
 * É uma estrutura flexível que pode representar diferentes tipos de eventos no jogo.
 */
export interface Message {
    /** ID único da mensagem. */
    id: string;
    /** ID da cena onde a mensagem foi criada, para preservar o contexto histórico. */
    sceneId: string;
    /** ID do autor ('player', 'master', 'system', ou ID de um personagem). */
    authorId: string;
    /** Nome do autor a ser exibido (ex: "Jax", "Mestre"). */
    authorName: string;
    /** O objeto completo do personagem autor, usado para seleção de voz TTS. */
    author?: Character;
    /** URL da imagem do autor. */
    authorImageUrl?: string;
    /** O tipo de evento que a mensagem representa. */
    type: 'chat' | 'card_draw' | 'event' | 'dice_roll' | 'scene_change';
    /** O conteúdo de texto da mensagem. */
    text: string;
    /** URL de uma imagem anexada à mensagem (geralmente pelo mestre). */
    imageUrl?: string;
    /** Estado temporário para feedback na UI enquanto uma imagem está sendo gerada. */
    isGeneratingImage?: boolean;
    /** Cache para os dados de áudio em base64, para evitar gerar novamente. */
    audioData?: string;
    /** Dados do sorteio de cartas, se a mensagem for do tipo 'card_draw' ou 'scene_change'. */
    cardDraw?: ArcanaCardDraw;
    /** Dados da rolagem de dados, se a mensagem for do tipo 'dice_roll'. */
    diceRoll?: DiceRoll;
    /** Se verdadeiro, indica uma mensagem "fora do personagem" (off-topic). */
    isOffTopic?: boolean;
}