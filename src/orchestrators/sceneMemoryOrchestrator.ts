// orchestrators/sceneMemoryOrchestrator.ts
// Responsável por transformar uma cena concluída em um diário persistido no Supabase
// e imediatamente disponível para o RAG/Dev Log.

import { GameState } from '@/types/game';
import { Scene } from '@/types/scene';
import { Message } from '@/types/chat';
import { Character } from '@/types/character';
import { CampaignLore } from '@/types/lore';
import { logEvent } from '@/store/devLogStore';
import { generateSceneDiary } from '@/services/ai/sceneMemoryService';
import { generateEmbedding } from '@/services/ai/embeddingService';
import { findLoreEntryByCategory, insertLoreEntry } from '@/services/db/campaignLore.service';

const formatStates = (states?: Character['states']) => {
    if (!states || states.length === 0) return 'Nenhuma condição ativa.';
    return states.map(state => `${state?.name || 'Estado'} (${state?.intensity || 'N/A'})`).join(', ');
};

const buildPlayerSummary = (player: Character) => {
    return [
        `Nome: ${player.name}`,
        `Arquétipo/Tipo: ${player.type}`,
        `Descrição: ${player.description || 'N/A'}`,
        `Objetivo Atual: ${player.objective || 'Indefinido'}`,
        `Segredo: ${player.secret || 'Nenhum'}`,
        `Condições Ativas: ${formatStates(player.states)}`,
    ].join('\n');
};

const buildNpcSummary = (npcs: Character[]) => {
    if (npcs.length === 0) return 'Nenhum NPC presente.';
    return npcs
        .map(npc => {
            return [
                `- ${npc.name} (${npc.type})`,
                npc.description ? `  Descrição: ${npc.description}` : null,
                npc.history ? `  História: ${npc.history}` : null,
                npc.personalityTraits?.length ? `  Traços: ${npc.personalityTraits.join(', ')}` : null,
                npc.states?.length ? `  Condições: ${formatStates(npc.states)}` : null,
            ]
                .filter(Boolean)
                .join('\n');
        })
        .join('\n');
};

const buildObjectivesSummary = (state: GameState) => {
    const summaries: string[] = [];
    const plot = state.campaign.plotDetails;
    if (plot) {
        summaries.push(
            `Conflito Central: ${plot.centralConflict || 'N/A'}`,
            `Mistério Principal: ${plot.mainMystery || 'N/A'}`,
            `Estrutura: ${plot.narrativeStructure || 'N/A'}`,
            `Objetivo Final: ${plot.finalObjective || 'N/A'}`
        );
    }
    const missions = state.campaign.missions || [];
    if (missions.length > 0) {
        summaries.push('Missões em andamento:');
        missions.forEach(m => summaries.push(`- ${m.title}: ${m.description || 'Sem descrição'}`));
    }
    return summaries.length > 0 ? summaries.join('\n') : 'Nenhum objetivo ou missão registrado.';
};

const buildSceneMetadata = (scene: Scene) => {
    const arcana = scene.arcanaCardsDrawn
        ? `${scene.arcanaCardsDrawn.verb}, ${scene.arcanaCardsDrawn.theme}, ${scene.arcanaCardsDrawn.adjective}, ${scene.arcanaCardsDrawn.emotion}`
        : 'Cartas não registradas.';
    return [
        `Título: ${scene.title || 'Cena sem título'}`,
        `Número: ${scene.sceneNumber}`,
        `Arcana: ${arcana}`,
        `Turnos Totais: ${scene.turnCount || 0}`,
        `Atualizado em: ${new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}`,
    ].join('\n');
};

const buildSceneLog = (messages: Message[]) => {
    if (messages.length === 0) return 'Nenhuma mensagem registrada para esta cena.';
    return messages
        .map((msg, index) => {
            const prefix = `[${index + 1}] ${msg.authorName || msg.authorId || 'Autor desconhecido'}`;
            let text = msg.text || '';
            if (msg.cardDraw) {
                text += ` (Cartas: ${msg.cardDraw.verb}, ${msg.cardDraw.theme}, ${msg.cardDraw.adjective}, ${msg.cardDraw.emotion})`;
            }
            if (msg.diceRoll) {
                const outcome = msg.diceRoll.result?.success ? 'SUCESSO' : 'FALHA';
                text += ` (Rolagem: ${msg.diceRoll.type} → ${outcome})`;
            }
            return `${prefix}: ${text}`.trim();
        })
        .join('\n');
};

export const sceneMemoryOrchestrator = {
    async archiveScene(scene: Scene, state: GameState): Promise<CampaignLore | null> {
        if (!scene || !state?.campaign?.id) {
            logEvent({ type: 'system', message: 'SceneMemory: estado inválido para consolidar cena.' });
            return null;
        }

        const campaignId = state.campaign.id;
        const category = `scene_diary:${scene.id}`;

        const existing = await findLoreEntryByCategory(campaignId, category);
        if (existing) {
            logEvent({
                type: 'system',
                message: 'SceneMemory: diário já existente, ignorando nova consolidação.',
                payload: { sceneId: scene.id, loreId: existing.id },
            });
            return existing;
        }

        const messages = (state.campaign.chatHistory || []).filter(msg => msg.sceneId === scene.id);
        if (messages.length === 0) {
            logEvent({
                type: 'system',
                message: 'SceneMemory: nenhum registro de chat para consolidar a cena.',
                payload: { sceneId: scene.id },
            });
            return null;
        }

        const npcsInSceneIds = new Set(scene.characterIds || []);
        const npcsInScene = state.npcs.filter(npc => npcsInSceneIds.has(npc.id));

        const metadataBlock = buildSceneMetadata(scene);
        const playerSummary = buildPlayerSummary(state.playerCharacter);
        const npcsSummary = buildNpcSummary(npcsInScene);
        const objectivesSummary = buildObjectivesSummary(state);
        const sceneLog = buildSceneLog(messages);

        const diaryResult = await generateSceneDiary({
            metadataBlock,
            playerSummary,
            npcsSummary,
            objectivesSummary,
            sceneLog,
        });

        const formattedDiary = [
            `## Cena ${scene.sceneNumber}: ${scene.title || 'Sem título'}`,
            `Categoria: Diário Cronológico`,
            '',
            diaryResult.diary.trim(),
        ].join('\n');

        const embedding = await generateEmbedding(formattedDiary);
        const loreEntry = await insertLoreEntry({
            campaignId,
            category,
            content: formattedDiary,
            embedding,
        });

        logEvent({
            type: 'system',
            message: 'SceneMemory: diário consolidado e salvo.',
            payload: {
                sceneId: scene.id,
                loreId: loreEntry.id,
                inputTokens: diaryResult.inputTokens,
                outputTokens: diaryResult.outputTokens,
                cost: diaryResult.estimatedCost,
            },
        });

        return loreEntry;
    },
};
