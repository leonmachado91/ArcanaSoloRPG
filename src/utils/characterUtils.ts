// utils/characterUtils.ts
// Este arquivo contém funções utilitárias puras relacionadas à lógica de negócio
// de personagens, como cálculos de atributos baseados em vantagens.

import { Element, TraitDefinition, Character } from '../types/character';

/**
 * Calcula os valores totais dos quatro elementos (Fogo, Água, Ar, Terra) de um personagem.
 * A regra é: cada elemento começa com 1 ponto base, e cada Vantagem adiciona +1 ponto ao seu elemento correspondente.
 * @param advantages Uma lista com os nomes das vantagens que o personagem possui.
 * @param allAdvantageTraits A lista completa de todas as definições de vantagens disponíveis no jogo.
 * @returns Um objeto contendo a pontuação final para cada um dos quatro elementos.
 */
export const calculateElements = (advantages: string[], allAdvantageTraits: TraitDefinition[]): Record<Element, number> => {
    // Inicializa um contador para cada elemento.
    const counts: Record<Element, number> = { fire: 0, water: 0, air: 0, earth: 0 };

    // Itera sobre as vantagens fornecidas (ou um array vazio se for nulo/undefined).
    (advantages || []).forEach(advName => {
        // Encontra a definição completa da vantagem na lista de regras.
        const trait = allAdvantageTraits.find(t => t.name === advName);
        // Se a vantagem for encontrada, incrementa o contador do seu elemento.
        if (trait) {
            counts[trait.element]++;
        }
    });

    // Retorna a soma do valor base (1) com a contagem de vantagens de cada elemento.
    return {
        fire: 1 + counts.fire,
        water: 1 + counts.water,
        air: 1 + counts.air,
        earth: 1 + counts.earth,
    };
};


/**
 * Encontra um personagem em uma lista pelo ID ou nome (case-insensitive).
 * @param characterIdOrName O ID ou nome do personagem.
 * @param allCharacters A lista de todos os personagens (jogador e NPCs) onde a busca será feita.
 * @returns O objeto `Character` ou `undefined` se não for encontrado.
 */
export const findCharacter = (characterIdOrName: string, allCharacters: Character[]): Character | undefined => {
    if (!characterIdOrName) return undefined;
    const normalizedId = characterIdOrName.toLowerCase();

    // Prioriza a correspondência por ID
    const byId = allCharacters.find(c => c.id === characterIdOrName);
    if (byId) return byId;
    
    // Recorre à correspondência por nome
    const byName = allCharacters.find(c => c.name.toLowerCase() === normalizedId);
    return byName;
};


/**
 * Gera uma string com os personagens disponíveis em uma lista, para mensagens de erro.
 * @param allCharacters A lista de todos os personagens (jogador e NPCs).
 * @returns Uma string formatada para depuração.
 */
export const getAvailableCharactersMessage = (allCharacters: Character[]): string => {
    if (allCharacters.length === 0) return 'Nenhum personagem na cena.';

    return `Personagens válidos: [${allCharacters.map(c => `'${c.name}' (ID: ${c.id})`).join(', ')}]`;
};