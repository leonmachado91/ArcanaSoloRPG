// data/rules/oracles.ts
// Este arquivo centraliza a definição de todas as tabelas de oráculos do jogo.
// Manter esses dados separados da lógica do `rulesService` facilita a manutenção e a adição de novos oráculos.

/**
 * Define os nomes válidos para as tabelas de oráculos que podem ser consultadas.
 * Isso garante a segurança de tipos ao chamar a função `queryOracle`.
 */
export type OracleTableName = 'npc_combat_action';

/**
 * Define a estrutura de uma única entrada em uma tabela de oráculo.
 */
type OracleEntry = {
    min: number;
    max: number;
    result: string;
};

/**
 * Define o tipo para uma tabela de oráculo completa, que é um array de entradas.
 */
type OracleTable = OracleEntry[];

/**
 * Um registro que mapeia os nomes de oráculos (`OracleTableName`) para seus dados de tabela (`OracleTable`).
 * O sistema de rolagem é baseado em um d100 (1 a 100).
 */
export const oracles: Record<OracleTableName, OracleTable> = {
    npc_combat_action: [
        { min: 1, max: 3, result: 'Convencer a uma rendição' },
        { min: 4, max: 6, result: 'Coordenar aliados' },
        { min: 7, max: 9, result: 'Agrupar reforços' },
        { min: 10, max: 13, result: 'Apreender algo ou alguém' },
        { min: 14, max: 17, result: 'Provocar uma resposta imprudente' },
        { min: 18, max: 21, result: 'Intimidar ou assustar' },
        { min: 22, max: 25, result: 'Revelar uma verdade surpreendente' },
        { min: 26, max: 29, result: 'Mudar o foco para alguém ou outra coisa' },
        { min: 30, max: 33, result: 'Destruir algo ou torná-lo inútil' },
        { min: 34, max: 39, result: 'Tomar uma ação decisiva' },
        { min: 40, max: 45, result: 'Reforçar suas defesas' },
        { min: 46, max: 52, result: 'Preparar uma ação' },
        { min: 53, max: 60, result: 'Usar o terreno para ganhar vantagem' },
        { min: 61, max: 68, result: 'Aproveitar a vantagem de uma arma ou habilidade' },
        { min: 69, max: 78, result: 'Criar uma oportunidade' },
        { min: 79, max: 89, result: 'Atacar com precisão' },
        { min: 90, max: 99, result: 'Atacar com poder' },
        { min: 100, max: 100, result: 'Tomar uma ação completamente inesperada' } // '00' é representado como 100
    ]
};
