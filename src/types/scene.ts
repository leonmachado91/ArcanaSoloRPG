// types/scene.ts
// Este arquivo define a estrutura de dados para uma cena, que representa um momento
// ou evento significativo dentro da campanha.

import { ArcanaCardDraw } from './chat';

/**
 * Representa uma cena dentro do jogo. Uma cena pode ser uma conversa, um combate,
 * uma exploração de um local, etc.
 */
export interface Scene {
    /** ID único da cena, geralmente um UUID do Supabase. */
    id: string;
    /** ID da campanha à qual esta cena pertence. */
    campaignId: string;
    /** O número sequencial da cena na campanha. */
    sceneNumber: number;
    /** O título conciso da cena, para ser exibido na UI. */
    title: string;
    /** O ID do local onde a cena acontece (opcional). */
    locationId?: string | null;
    /** Uma breve descrição do que aconteceu ou está acontecendo na cena. */
    description: string;
    /** O resultado do sorteio de cartas do Arcana que deu origem a esta cena. */
    arcanaCardsDrawn?: ArcanaCardDraw;
    /** Se verdadeiro, indica que esta é a cena atualmente ativa no jogo. */
    isActive: boolean;
    /** O número do turno atual dentro da cena. */
    turnCount: number;
    /** Uma lista de IDs dos personagens presentes nesta cena. */
    characterIds?: string[];
}