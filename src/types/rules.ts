// types/rules.ts

/**
 * Define a estrutura de uma regra ou "chunk" de conhecimento,
 * conforme armazenado no banco de dados.
 */
export interface Rule {
    id: string; // uuid
    topic: string;
    content: string;
    embedding?: number[] | null;
}

/**
 * Payload para atualização/inserção de regras.
 */
export interface RuleUpdatePayload {
    topic: string;
    content: string;
    embedding: number[] | null;
}