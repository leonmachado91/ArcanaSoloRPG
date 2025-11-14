import { PromptEntry } from '@/store/promptStore';
import { logEvent } from '@/store/devLogStore';

type PromptMap = Record<string, PromptEntry>;

export const PROMPT_FALLBACKS = {
    NARRATOR_SYSTEM_INSTRUCTION: `Você é o Mestre Narrador do Arcana. Narre cenas com voz evocativa, descreva sensações e resultados mecânicos sem contradizer as regras. Consulte as cartas, elementos e condições quando fornecidos. Obedeça ao limite de contexto e utilize as informações em {rulesCatalog}.`,
    SESSION_START_CONTEXT_TAG: `[CONTEXTUALIZAÇÃO INICIAL]\n{summary}`,
    STATE_CHANGE_CONTEXT_TAG: `[ATUALIZAÇÃO DE ESTADO] {description}`,
    TIME_CONTEXT_TAG: `[Linha do Tempo] {text}`,
    EVENT_CONTEXT_TAG: `[Evento] {text}`,
    NEW_SCENE_CONTEXT_TAG_WITH_CARDS: `[Cena] {text}\nCartas Arcana: {cards}`,
    NEW_SCENE_CONTEXT_TAG: `[Cena] {text}`,
    COMBAT_CONTEXT_TAG: `Combate "{title}" — Resultado: {outcome} (Atacante {attackerTotal} vs Defensor {defenderTotal})`,
    TEST_CONTEXT_TAG: `Teste "{title}" — {outcome} (Total {total} vs Dificuldade {difficulty})`,
    PENDING_TEST_CONTEXT_TAG: `Teste pendente: {title}`,
    SCENE_START_NARRATION_PROMPT: `Descreva a primeira cena da campanha. Traga o clima do mundo, o objetivo do protagonista e mencione as cartas Arcana sorteadas para amarrar o tom da história.`,
    SCENE_CONSOLIDATION_PROMPT: `Você é o Escriba do Arcana. Utilize os blocos a seguir para gerar um diário cronológico da cena.\n\n[CENA]\n{scene_metadata}\n\n[HERÓI]\n{player_summary}\n\n[NPCS]\n{npcs_summary}\n\n[OBJETIVOS]\n{objectives_summary}\n\n[TRANSCRIÇÃO]\n{scene_log}\n\nProduza uma saída com as seções "Crônica", "Eventos Mecânicos", "Consequências e Ganchos" e "Registro Temporal". Seja objetivo e fiel aos fatos.`,
    CHARACTER_IMAGE_PROMPT: `Crie uma splash art vertical detalhada para o personagem descrito abaixo.\n\n[PERSONAGEM]\n{character_summary}\n\n[PERSONALIDADE]\n{personality_traits}\n\n[ARCANA/CONTEXTO]\n{arcana_context}\n\nEstilo: pintura digital mística, iluminação dramática, qualidade AAA. Não adicione texto na imagem.`,
    SCENE_IMAGE_PROMPT: `Crie uma cena panorâmica (16:9) inspirada na narração.\n\n[NARRAÇÃO]\n{scene_narration}\n\n[PERSONAGENS]\n{characters_in_scene}\n\n[HUMOR/ARCANA]\n{arcana_mood}\n\nGaranta consistência visual com os personagens descritos e enfatize o clima indicado pelas cartas.`,
} as const;

export type PromptKey = keyof typeof PROMPT_FALLBACKS;

/**
 * Obtém o conteúdo de um prompt. Quando não encontrado, aplica um fallback
 * pré-definido e registra o evento no Dev Log para facilitar inspeções futuras.
 */
export const resolvePrompt = (
    prompts: PromptMap,
    key: PromptKey,
    logContext: string
): { value: string; usedFallback: boolean } => {
    const custom = prompts[key]?.content?.trim();
    if (custom) {
        return { value: custom, usedFallback: false };
    }

    const fallbackValue = PROMPT_FALLBACKS[key];
    logEvent({
        type: 'system',
        message: '[Prompts] Fallback aplicado.',
        payload: { promptKey: key, context: logContext, fallbackPreview: fallbackValue.slice(0, 80) },
    });
    console.warn(`[${logContext}] Prompt '${key}' não encontrado. Usando fallback embutido.`);
    return { value: fallbackValue, usedFallback: true };
};
