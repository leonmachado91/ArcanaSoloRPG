// features/content-editor/data/promptConfig.ts

/**
 * Define a lista completa de placeholders válidos que podem ser usados nos prompts.
 * Cada placeholder tem uma descrição para auxiliar o usuário no editor com autocomplete.
 */
export const PROMPT_PLACEHOLDERS = [
    // --- Geração de Campanha (Arquiteta) ---
    { placeholder: '{creativeSeeds}', description: 'Os dados iniciais fornecidos pelo jogador (gênero, local, etc.).' },
    { placeholder: '{dynamicInstructions}', description: 'As "ordens diretas" para a IA (ex: número de companheiros).' },
    
    // --- Geração de Rascunho ---
    { placeholder: '{contextData}', description: 'Os dados já preenchidos pelo jogador no formulário.' },
    { placeholder: '{personalityTraitsOptions}', description: 'Lista de sugestões de traços de personalidade.' },
    { placeholder: '{advantagesOptions}', description: 'Lista de todas as Vantagens válidas no sistema.' },
    { placeholder: '{disadvantagesOptions}', description: 'Lista de todas as Desvantagens válidas no sistema.' },
    
    // --- Mestre de Jogo (Narrador) ---
    { placeholder: '{rulesCatalog}', description: 'O catálogo de regras injetado no sistema (ex: Condições válidas).' },
    
    // --- Tags de Contexto ---
    { placeholder: '{summary}', description: 'O resumo completo do estado atual do jogo.' },
    { placeholder: '{description}', description: 'A descrição de uma mudança de estado ou evento.' },
    { placeholder: '{text}', description: 'O conteúdo textual de um evento ou narração.' },
    { placeholder: '{cards}', description: 'As quatro palavras sorteadas das cartas do Arcana.' },
    { placeholder: '{title}', description: 'O título de um confronto ou teste de dificuldade.' },
    { placeholder: '{outcome}', description: 'O resultado de um confronto ou teste (ex: "SUCESSO").' },
    { placeholder: '{attackerTotal}', description: 'O placar final do atacante em um combate.' },
    { placeholder: '{defenderTotal}', description: 'O placar final do defensor em um combate.' },
    { placeholder: '{total}', description: 'O placar final de um teste de dificuldade.' },
    { placeholder: '{difficulty}', description: 'A dificuldade alvo de um teste.' },
    
    // --- Geração de Áudio (TTS) ---
    { placeholder: '{emotion}', description: 'A emoção sorteada na carta do Arcana para guiar o tom da narração.' },
    { placeholder: '{traits}', description: 'Os traços de personalidade de um personagem, para guiar a voz.' },
];