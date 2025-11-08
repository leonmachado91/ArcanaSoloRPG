// services/ai/tools/toolDefinitions.ts
// Este arquivo define o "contrato" entre a IA Mestre e o motor de regras da aplicação (O Juiz).
// Cada objeto `FunctionDeclaration` aqui exportado descreve uma ferramenta que a IA pode
// solicitar, especificando seu nome, propósito e os argumentos que ela espera.

import { FunctionDeclaration, Type } from "@google/genai";

/**
 * Ferramenta para resolver um teste de dificuldade.
 * A IA decide o elemento, a dificuldade e descreve a ação. A aplicação rola os dados.
 */
export const roll_character_difficultyCheck: FunctionDeclaration = {
    name: 'roll_character_difficultyCheck',
    description: "Use esta ferramenta quando um personagem tentar uma ação cujo resultado é incerto e que não seja um conflito direto com outro personagem. Ideal para testes de habilidade, percepção ou conhecimento.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            characterId: {
                type: Type.STRING,
                description: "O ID ou nome exato do personagem que está realizando a ação.",
            },
            element: {
                type: Type.STRING,
                description: "O elemento principal sendo testado na ação ('fire', 'water', 'air', 'earth').",
            },
            difficulty: {
                type: Type.INTEGER,
                description: "O número alvo que o personagem precisa superar. Defina este valor com base no contexto da cena e na complexidade da tarefa.",
            },
            description: {
                type: Type.STRING,
                description: "Uma descrição narrativa concisa do que o personagem está tentando fazer.",
            },
        },
        required: ['characterId', 'element', 'difficulty', 'description'],
    },
};

/**
 * Ferramenta para resolver um confronto direto entre dois personagens.
 * A IA identifica o atacante, o defensor e o contexto. A aplicação resolve o combate.
 */
export const roll_character_clash: FunctionDeclaration = {
    name: 'roll_character_clash',
    description: "Use esta ferramenta para resolver um confronto direto entre dois personagens, seja um combate físico, uma disputa social ou um duelo de vontades.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            attackerId: {
                type: Type.STRING,
                description: "O ID ou nome exato do personagem que está iniciando a ação (o atacante).",
            },
            defenderId: {
                type: Type.STRING,
                description: "O ID ou nome exato do personagem que está resistindo ou se defendendo.",
            },
            description: {
                type: Type.STRING,
                description: "Uma descrição narrativa concisa do confronto (ex: 'Jax ataca o guarda com sua espada').",
            },
        },
        required: ['attackerId', 'defenderId', 'description'],
    },
};

/**
 * Ferramenta para aplicar uma condição a um personagem.
 * A IA determina a condição, a intensidade e a causa narrativa.
 */
export const modify_character_applyCondition: FunctionDeclaration = {
    name: 'modify_character_applyCondition',
    description: "Use esta ferramenta para aplicar uma condição (positiva ou negativa) a um personagem como consequência direta de um evento narrativo ou do resultado de um confronto.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            characterId: {
                type: Type.STRING,
                description: "O ID ou nome exato do personagem que receberá a condição.",
            },
            conditionName: {
                type: Type.STRING,
                description: "O nome exato da condição a ser aplicada. Deve ser um nome de condição válido do sistema.",
            },
            intensity: {
                type: Type.STRING,
                description: "A intensidade da condição, que deve ser 'Leve', 'Moderado' ou 'Grave'.",
            },
            reason: {
                type: Type.STRING,
                description: "A justificativa narrativa curta pela qual a condição foi aplicada.",
            },
        },
        required: ['characterId', 'conditionName', 'intensity', 'reason'],
    },
};

/**
 * Ferramenta para conceder pontos de progresso ao jogador.
 * A IA julga se a ação do jogador o aproxima de seu objetivo principal.
 */
export const modify_character_addProgress: FunctionDeclaration = {
    name: 'modify_character_addProgress',
    description: "Use esta ferramenta para recompensar um personagem com Pontos de Progresso quando ele realizar uma ação significativa que o aproxime de seu Objetivo Principal.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            characterId: {
                type: Type.STRING,
                description: "O ID ou nome exato do personagem que receberá os pontos de progresso. Se omitido, o progresso será aplicado ao personagem do jogador.",
            },
            points: {
                type: Type.INTEGER,
                description: "O número de pontos de progresso a serem concedidos (geralmente 1 para ações boas, 2 para ações excelentes).",
            },
            reason: {
                type: Type.STRING,
                description: "A justificativa narrativa curta pela qual os pontos foram concedidos.",
            },
        },
        required: ['points', 'reason'],
    },
};

/**
 * Ferramenta para consultar uma tabela de oráculo.
 * A IA usa isso para introduzir aleatoriedade e inspirar a narrativa.
 */
export const query_game_oracle: FunctionDeclaration = {
    name: 'query_game_oracle',
    description: "Use esta ferramenta quando precisar de um resultado aleatório para determinar uma ação de NPC, um evento inesperado ou qualquer outro elemento imprevisível da história. Consulte as tabelas disponíveis para ver suas opções.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            tableName: {
                type: Type.STRING,
                description: "O nome exato da tabela de oráculo a ser consultada (ex: 'npc_combat_action').",
            },
        },
        required: ['tableName'],
    },
};

/**
 * Ferramenta para buscar na memória de longo prazo da campanha.
 */
export const query_knowledgeBase: FunctionDeclaration = {
    name: 'query_knowledgeBase',
    description: "Use esta ferramenta para buscar informações na memória de longo prazo da campanha (lore, fichas de personagens, eventos passados, etc.) quando você não tiver a informação no contexto atual. Formule sua pergunta em linguagem natural.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            queryText: {
                type: Type.STRING,
                description: "A pergunta em linguagem natural sobre a informação que você precisa. Seja específico. (ex: 'Qual é o segredo do Duque Alaric?', 'Me lembre o que aconteceu na cena da taverna').",
            },
            searchDomain: {
                type: Type.STRING,
                description: "Opcional. Especifique o domínio da busca para otimizar os resultados. Use 'rules' para buscar por mecânicas de jogo ou 'gameState' para buscar por contexto da história (personagens, lore, eventos). O padrão é 'gameState'.",
                enum: ['gameState', 'rules'],
            }
        },
        required: ['queryText'],
    },
};


/**
 * Ferramenta para avançar o tempo do jogo, finalizando o turno atual.
 */
export const modify_scene_endTurn: FunctionDeclaration = {
    name: 'modify_scene_endTurn',
    description: "Use esta ferramenta para sinalizar o fim de um 'momento' na cena, geralmente após o jogador e os NPCs importantes terem agido. Isso avança o tempo do jogo e aciona mecânicas de duração de condições.",
};

/**
 * Ferramenta para um personagem (NPC) falar ou realizar uma ação.
 * A IA decide qual personagem age e o que ele faz/diz. A aplicação cria a mensagem de chat.
 */
export const character_action: FunctionDeclaration = {
    name: 'character_action',
    description: "Use esta ferramenta para fazer um personagem não-jogador (NPC) ou companheiro falar ou realizar uma ação distinta. A ação ou diálogo será exibida no chat como se fosse daquele personagem.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            characterId: {
                type: Type.STRING,
                description: "O ID ou nome exato do personagem que está falando ou agindo.",
            },
            actionText: {
                type: Type.STRING,
                description: "O diálogo exato (entre aspas) ou a descrição da ação que o personagem está realizando. Deve ser escrito da perspectiva do personagem ou em terceira pessoa descrevendo sua ação.",
            },
        },
        required: ['characterId', 'actionText'],
    },
};

/**
 * Ferramenta para adicionar ou remover itens do inventário de um personagem.
 * Essencial para recompensas, saques e perda de itens.
 */
export const modify_character_inventory: FunctionDeclaration = {
    name: 'modify_character_inventory',
    description: "Use para adicionar ou remover itens do inventário de um personagem. Essencial para recompensas, saques ou perda de itens.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            characterId: {
                type: Type.STRING,
                description: "O ID ou nome exato do personagem afetado.",
            },
            action: {
                type: Type.STRING,
                description: "A ação a ser executada: 'add' para adicionar, 'remove' para remover.",
                enum: ['add', 'remove']
            },
            itemName: {
                type: Type.STRING,
                description: "O nome exato do item.",
            },
            quantity: {
                type: Type.INTEGER,
                description: "A quantidade do item a ser adicionada ou removida.",
            },
            itemDescription: {
                type: Type.STRING,
                description: "Opcional. Uma descrição para o item, especialmente se for um item novo que precisa ser catalogado no mundo.",
            },
            reason: {
                type: Type.STRING,
                description: "A justificativa narrativa curta para a mudança no inventário.",
            },
        },
        required: ['characterId', 'action', 'itemName', 'quantity', 'reason'],
    },
};

/**
 * Uma lista contendo todas as declarações de ferramentas para fácil exportação.
 */
export const allToolDeclarations = [
    roll_character_difficultyCheck,
    roll_character_clash,
    modify_character_applyCondition,
    modify_character_addProgress,
    query_game_oracle,
    modify_scene_endTurn,
    query_knowledgeBase,
    character_action,
    modify_character_inventory,
];