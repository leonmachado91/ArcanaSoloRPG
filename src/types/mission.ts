// types/mission.ts
// Este arquivo define as estruturas de dados para missões, quests ou objetivos
// dentro de uma campanha.

/**
 * Define os possíveis status de uma missão.
 */
export type MissionStatus = 'pending' | 'active' | 'completed' | 'failed';

/**
 * Representa uma missão ou objetivo que os jogadores podem seguir.
 * Suporta uma estrutura hierárquica com missões principais e secundárias.
 */
export interface Mission {
    /** ID único da missão, geralmente um UUID do Supabase. */
    id: string;
    /** ID da campanha à qual esta missão pertence. */
    campaignId: string;
    /** O título da missão. */
    title: string;
    /** A descrição detalhada do que a missão envolve. */
    description: string;
    /** O status atual da missão. */
    status: MissionStatus;
    /** O ID da missão "pai", se esta for uma sub-missão. */
    parentMissionId?: string | null;
}