// data/config/appConfig.ts

/**
 * ===================================================================================
 * ARQUIVO DE CONFIGURAÇÃO PRINCIPAL DO ARCANA RPG
 * ===================================================================================
 * Este é o painel de controle central da aplicação. Modifique os valores abaixo para
 * ajustar o comportamento da IA, da UI e das regras do jogo sem precisar alterar
 * o código-fonte principal.
 * ===================================================================================
 */
export const appConfig = {

    // ===============================================================================
    // Configurações de Inteligência Artificial
    // ===============================================================================
    ai: {
        /**
         * Modelos de IA padrão para cada tarefa. Os valores devem corresponder às chaves
         * em `data/ai/models.ts`.
         */
        defaults: {
            /** Modelo para gerar o rascunho inicial da campanha (tela de criação). */
            initialGeneration: "gemini-flash-lite-latest",

            /** Modelo para a geração completa da campanha na tela de loading (mais caro e completo). */
            fullGeneration: "gemini-2.5-pro",

            /** O cérebro principal do mestre de jogo durante o chat. */
            gameMaster: "gemini-flash-latest",

            /** Modelo para gerar imagens de cenas e personagens. */
            imageGeneration: 'imagen-4.0-generate-001',

            /** Modelo para gerar a narração de voz (Text-to-Speech). */
            audioGeneration: 'gemini-2.5-flash-preview-tts',
        },

        /**
         * Controla a criatividade da IA em gerações de texto. Valores mais altos (ex: 1.0)
         * resultam em respostas mais imprevisíveis e criativas, enquanto valores mais baixos
         * (ex: 0.2) produzem resultados mais focados e determinísticos.
         */
        temperature: 0.75,

        /**
         * Voz padrão para o Mestre/Narrador quando nenhuma outra lógica se aplica.
         * O valor deve corresponder a um dos "name" da lista em `data/ai/voices.ts`.
         */
        defaultMasterVoice: 'Algenib',
    },

    // ===============================================================================
    // Configurações de RAG (Busca em Base de Conhecimento)
    // ===============================================================================
    rag: {
        /** Limiar de similaridade para a busca de REGRAS. Valores mais altos = busca mais precisa e restrita. (0.0 a 1.0) */
        rulesMatchThreshold: 0.5,

        /** Número máximo de resultados que a busca de REGRAS deve retornar para a IA. */
        rulesMatchCount: 3,

        /** Limiar de similaridade para a busca no ESTADO DO JOGO (fichas, etc.). */
        gameStateMatchThreshold: 0.5,

        /** Número máximo de resultados que a busca no ESTADO DO JOGO deve retornar. */
        gameStateMatchCount: 5,
    },

    // ===============================================================================
    // Configurações da Interface de Usuário (UI)
    // ===============================================================================
    ui: {
        /** Duração em milissegundos que um toast de erro permanece na tela. (1000ms = 1 segundo) */
        toastDurationMs: 5000,

        /** Atraso em milissegundos antes da rolagem de dados de um NPC, para simular reflexão. */
        npcRollDelayMs: 1500,

        /** Atraso em milissegundos após a exibição das cartas do arcana, antes do mestre começar a narrar a cena. */
        arcanaCardAnimationDelayMs: 3000,

        /** Duração em milissegundos que o indicador "Salvo na nuvem!" fica visível após salvar. */
        saveIndicatorDurationMs: 1500,
    },

    // ===============================================================================
    // Configurações de Sistema e Regras de Jogo
    // ===============================================================================
    system: {
        /** Intervalo em milissegundos para o salvamento automático na nuvem. (Lógica desativada no reset) */
        autoSaveIntervalMs: 2500,

        /** Limite máximo de tamanho (em Megabytes) para o upload de imagens de personagem. */
        characterImageUploadSizeLimitMb: 2,

        /** Mensagens exibidas aleatoriamente na tela de carregamento da campanha. */
        campaignLoadingMessages: [
            "Consultando os astros para forjar seu destino...",
            "Desenhando os mapas de reinos esquecidos...",
            "Escrevendo os segredos dos seus companheiros...",
            "Acordando os deuses antigos...",
            "Sussurrando lendas ao pé do ouvido da IA...",
            "Equilibrando as forças cósmicas da sua campanha...",
            "Aguardando a profecia se concretizar..."
        ],
    },
};

/**
 * Exporta o tipo `AppConfig`, inferido diretamente do objeto `appConfig`.
 * Isso permite que o tipo de configuração seja usado em outros lugares
 * sem precisar ser definido manualmente, garantindo consistência.
 */
export type AppConfig = typeof appConfig;