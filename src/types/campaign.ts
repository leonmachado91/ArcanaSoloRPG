// types/campaign.ts
// Este arquivo define as estruturas de dados (interfaces TypeScript) relacionadas a uma campanha,
// incluindo seus detalhes narrativos, estado atual e associações com outros elementos do jogo.

import { Message } from './chat';
import { Scene } from './scene';
import { Location } from './location';
import { CampaignLore } from './lore';
import { Mission } from './mission';

/**
 * Define a estrutura para os detalhes do enredo principal da campanha,
 * geralmente gerados pela IA no início.
 */
export interface PlotDetails {
    /** O conflito central que impulsiona a história. */
    centralConflict: string;
    /** A estrutura narrativa (ex: "Jornada do Herói", "Investigação de Mistério"). */
    narrativeStructure: string;
    /** O mistério principal que os jogadores podem desvendar. */
    mainMystery: string;
    /** O objetivo final que, se alcançado, conclui a campanha. */
    finalObjective: string;
}

/**
 * A interface principal que representa o estado completo de uma campanha.
 */
export interface Campaign {
    /** ID único da campanha, geralmente um UUID do Supabase. */
    id: string;
    /** O título da campanha definido pelo jogador. */
    title: string;
    /** O gênero da campanha (ex: "Fantasia Sombria"). */
    genre: string;
    /** Um adjetivo que descreve o tom do mundo (ex: "Fragmentado"). */
    worldAdjective: string;
    /** O local principal onde a campanha se inicia. */
    location: string;
    /** A época ou período em que a campanha acontece (ex: "Era da Magia"). */
    era: string;
    /** "Verdades" sobre o mundo definidas pelo jogador durante a criação. */
    declarations: string[];
    /** O número de companheiros (NPCs) que a IA deve criar para a campanha. */
    companionCount: number;
    /** O histórico completo de mensagens do chat do jogo. */
    chatHistory: Message[];
    /** Um resumo da memória de longo prazo, usado para dar contexto à IA. */
    longTermMemorySummary?: string;
    /** Uma lista de todas as cenas que ocorreram ou podem ocorrer na campanha. */
    scenes?: Scene[];
    /** Uma lista de locais relevantes no mundo da campanha. */
    locations?: Location[];
    /** Uma lista de entradas de lore (história do mundo) específicas da campanha. */
    lore?: CampaignLore[];
    /** O modo de jogo atual, influenciando o comportamento da IA. */
    gameMode?: 'narrative' | 'tactical';
    /** Os detalhes do enredo principal. */
    plotDetails?: PlotDetails;
    /** Uma lista de missões ou objetivos ativos na campanha. */
    missions?: Mission[];
    /** Itens chave gerados pela IA Arquiteta, para serem persistidos no catálogo de itens. */
    keyItems?: { name: string; description: string; item_type: 'quest' | 'standard' }[];
}