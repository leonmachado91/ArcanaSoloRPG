// data/rules/traits.ts
// ATENÇÃO: Os dados neste arquivo (MOCK_ADVANTAGES, MOCK_DISADVANTAGES) são apenas para
// fins de teste. A aplicação principal busca estes dados do Supabase através do TraitsContext.
// Não use estas constantes na lógica de produção.

import { Element, TraitDefinition } from '../../types/character';

/**
 * Uma lista de opções de traços de personalidade para a tela de criação de personagem.
 */
export const personalityTraitsOptions = [
    "Corajoso", "Cínico", "Leal", "Ambicioso", "Piedoso", "Impulsivo",
    "Calculista", "Otimista", "Pessimista", "Honesto", "Sarcástico", "Empático"
];

// Define a ordem e os nomes de exibição para os grupos de elementos.
export const ELEMENT_GROUP_ORDER: Record<Element, string> = {
    fire: 'Fogo',
    water: 'Água',
    air: 'Ar',
    earth: 'Terra'
};

export const MOCK_ADVANTAGES: TraitDefinition[] = [
    { id: 1, name: "Atleta Completo", element: 'fire', description: 'Destreza e força aprimoradas.', points: 1, type: 'advantage' },
    { id: 2, name: "Mãos Rápidas", element: 'fire', description: 'Ataques e reações mais ágeis.', points: 1, type: 'advantage' },
    { id: 3, name: "Golpe Preciso", element: 'fire', description: 'Maior chance de acertar pontos vitais.', points: 1, type: 'advantage' },
    { id: 4, name: "Empatia Afiada", element: 'water', description: 'Percebe emoções e intenções ocultas.', points: 1, type: 'advantage' },
    { id: 5, name: "Erudito", element: 'air', description: 'Vasto conhecimento sobre diversos assuntos.', points: 1, type: 'advantage' },
    { id: 6, name: "Corpo de Ferro", element: 'earth', description: 'Resistência física excepcional.', points: 1, type: 'advantage' },
];

export const MOCK_DISADVANTAGES: TraitDefinition[] = [
    { id: 101, name: "Azarado", element: 'water', description: 'As coisas tendem a dar errado para você.', points: -1, type: 'disadvantage' },
    { id: 102, name: "Código de Honra", element: 'earth', description: 'Você segue um código estrito que limita suas ações.', points: -1, type: 'disadvantage' },
    { id: 103, name: "Distraído", element: 'air', description: 'Você tem dificuldade em manter o foco.', points: -1, type: 'disadvantage' },
    { id: 104, name: "Fraco", element: 'fire', description: 'Sua força física é abaixo da média.', points: -1, type: 'disadvantage' },
];