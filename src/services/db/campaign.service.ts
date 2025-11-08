// services/db/campaign.service.ts
// Este serviço é responsável por toda a lógica de acesso a dados
// relacionada a campanhas (listagem, salvamento, carregamento, exclusão).

import { supabase } from '@/services/db/supabaseClient';
import { logEvent } from '@/store/devLogStore';
import { createAppError, isAppError, GameState } from '@/types/game';
import { Campaign } from '@/types/campaign';
import { Character } from '@/types/character';
import { toSnakeCase, toCamelCase } from '@/utils/dbUtils';
import { Message } from '@/types/chat';
import { generateEmbedding } from '../ai/embeddingService';

/**
 * Lista todas as campanhas salvas para o usuário logado.
 */
export async function listSavedCampaigns(): Promise<Partial<Campaign>[]> {
    const startTime = Date.now();
    const context = 'campaign.service.listSavedCampaigns';
    try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw createAppError('SUPABASE_ERROR', 'Falha ao obter a sessão do usuário.', sessionError, context);
        if (!session?.user) throw createAppError('AUTH_ERROR', 'Usuário não autenticado.', null, context);

        const { data, error } = await supabase
            .from('campaigns')
            .select('id, title, genre, world_adjective, last_played_at')
            .eq('user_id', session.user.id)
            .order('last_played_at', { ascending: false });

        if (error) throw createAppError('SUPABASE_ERROR', 'Falha ao listar as campanhas salvas.', error, context);
        
        logEvent({ type: 'db', functionName: context, params: {}, response: data ? `Fetched ${data.length} campaigns.` : 'No data', responseTimeMs: Date.now() - startTime });
        return toCamelCase(data) || [];
    } catch (e) {
        if (isAppError(e)) throw e;
        throw createAppError('NETWORK_ERROR', 'Erro de rede ao listar as campanhas.', e, context);
    }
}

/**
 * Salva o estado completo de uma campanha no banco de dados.
 */
export async function saveCampaign(state: GameState): Promise<void> {
    const startTime = Date.now();
    const context = 'campaign.service.saveCampaign';
    try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw createAppError('SUPABASE_ERROR', 'Falha ao obter a sessão do usuário para salvar.', sessionError, context);
        if (!session?.user) throw createAppError('AUTH_ERROR', 'Usuário não autenticado. Não é possível salvar.', null, context);

        const { campaign, playerCharacter, npcs } = state;
        const allCharacters = [playerCharacter, ...npcs];
        const keyItems = campaign.keyItems || [];
        
        const { data: traitsData, error: traitsError } = await supabase.from('traits').select('id, name');
        if (traitsError) throw traitsError;
        const traitMap = new Map(traitsData.map(t => [t.name, t.id]));

        const { data: conditionsData, error: conditionsError } = await supabase.from('conditions').select('id, name');
        if (conditionsError) throw conditionsError;
        const conditionMap = new Map(conditionsData.map(c => [c.name, c.id]));

        const { data: itemsData, error: itemsError } = await supabase.from('items').select('id, name');
        if (itemsError) throw itemsError;
        const itemMap = new Map(itemsData.map(i => [i.name, i.id]));
        
        // --- Start of Embedding Generation ---
        logEvent({ type: 'system', message: 'Iniciando geração de embeddings para a Memória de Longo Prazo...' });

        const characterEmbeddingPromises = allCharacters.map(async (c) => {
            const document = `Nome: ${c.name}\nTipo: ${c.type}\nDescrição: ${c.description}\nHistória: ${c.history}\nSegredo: ${c.secret || 'Nenhum'}\nObjetivo: ${c.objective || 'Nenhum'}\nPersonalidade: ${(c.personalityTraits || []).join(', ')}`;
            const embedding = await generateEmbedding(document);
            return { entityId: c.id, sheetEmbedding: embedding };
        });

        const loreEmbeddingPromises = (campaign.lore || []).map(async (l) => {
            const document = `Categoria de Lore: ${l.category}\nConteúdo: ${l.content}`;
            const embedding = await generateEmbedding(document);
            return { id: l.id, embedding };
        });

        const missionEmbeddingPromises = (campaign.missions || []).map(async (m) => {
            const document = `Missão: ${m.title}\nDescrição: ${m.description}`;
            const embedding = await generateEmbedding(document);
            return { id: m.id, embedding };
        });

        const sceneEmbeddingPromises = (campaign.scenes || []).map(async (s) => {
            const document = `Cena ${s.sceneNumber}: ${s.description}`;
            const embedding = await generateEmbedding(document);
            return { id: s.id, embedding };
        });

        const locationEmbeddingPromises = (campaign.locations || []).map(async (l) => {
            const document = `Local: ${l.name}\nDescrição: ${l.description}\nHistória: ${l.history}`;
            const embedding = await generateEmbedding(document);
            return { id: l.id, embedding };
        });
        
        const [
            characterEmbeddings,
            loreEmbeddings,
            missionEmbeddings,
            sceneEmbeddings,
            locationEmbeddings,
        ] = await Promise.all([
            Promise.all(characterEmbeddingPromises),
            Promise.all(loreEmbeddingPromises),
            Promise.all(missionEmbeddingPromises),
            Promise.all(sceneEmbeddingPromises),
            Promise.all(locationEmbeddingPromises),
        ]);

        const charEmbeddingMap = new Map(characterEmbeddings.map(e => [e.entityId, e.sheetEmbedding]));
        const loreEmbeddingMap = new Map(loreEmbeddings.map(e => [e.id, e.embedding]));
        const missionEmbeddingMap = new Map(missionEmbeddings.map(e => [e.id, e.embedding]));
        const sceneEmbeddingMap = new Map(sceneEmbeddings.map(e => [e.id, e.embedding]));
        const locationEmbeddingMap = new Map(locationEmbeddings.map(e => [e.id, e.embedding]));

        logEvent({ type: 'system', message: 'Geração de embeddings concluída.' });
        // --- End of Embedding Generation ---
        
        const campaignData = {
            id: campaign.id, userId: session.user.id, title: campaign.title, genre: campaign.genre,
            worldAdjective: campaign.worldAdjective, location: campaign.location, era: campaign.era,
            declarations: campaign.declarations, lastPlayedAt: new Date().toISOString()
        };

        const entitiesData = allCharacters.map(c => ({ id: c.id, campaignId: campaign.id, type: c.type }));
        
        const charactersData = allCharacters.map(c => ({
            entityId: c.id, name: c.name, age: c.age, description: c.description,
            personalityTraits: c.personalityTraits, imageUrl: c.imageUrl, characterType: c.type,
            history: c.history, secret: c.secret, objective: c.objective, elements: c.elements,
            progressPoints: c.progressPoints || 0,
            unspentElementPoints: c.unspentElementPoints || 0,
            sheetEmbedding: charEmbeddingMap.get(c.id) || null,
            archetype: c.archetype,
        }));

        const entityTraitsData = allCharacters.flatMap(c => {
            const adv = (c.advantages || []).map(name => ({ name, isAdvantage: true }));
            const disadv = (c.disadvantages || []).map(name => ({ name, isAdvantage: false }));
            return [...adv, ...disadv]
                .map(t => ({ entityId: c.id, traitId: traitMap.get(t.name), isAdvantage: t.isAdvantage }))
                .filter(et => et.traitId !== undefined);
        });

        const entityConditionsData = allCharacters.flatMap(c => 
            (c.states || []).map(s => ({ entityId: c.id, conditionId: conditionMap.get(s.name), intensity: s.intensity || 'Leve', remaining_turns: s.remaining_turns }))
                .filter(ec => ec.conditionId !== undefined)
        );

        const entityInventoryData = allCharacters.flatMap(c => 
            (c.items || []).map(i => ({ entityId: c.id, itemId: itemMap.get(i.name), quantity: i.quantity }))
                .filter(ei => ei.itemId !== undefined)
        );

        const scenesData = (campaign.scenes || []).map(s => ({
            id: s.id, campaignId: campaign.id, sceneNumber: s.sceneNumber, title: s.title, description: s.description,
            arcanaCardsDrawn: s.arcanaCardsDrawn, isActive: s.isActive, turnCount: s.turnCount,
            embedding: sceneEmbeddingMap.get(s.id) || null,
        }));
        
        const sceneEntitiesData = (campaign.scenes || []).flatMap(s => (s.characterIds || []).map(charId => ({ sceneId: s.id, entityId: charId })));

        const chatHistoryData = (campaign.chatHistory || []).map(m => {
             const metadata: any = { authorName: m.authorName };
             if(m.diceRoll) metadata.diceRoll = m.diceRoll;
             if(m.cardDraw) metadata.cardDraw = m.cardDraw;
             if (m.imageUrl) metadata.imageUrl = m.imageUrl;
             let authorEntityId: string | null = (m.authorId === 'system' || m.authorId === 'master') ? null : (m.authorId === 'player' ? playerCharacter.id : m.authorId);
             return { id: m.id, campaignId: campaign.id, sceneId: m.sceneId, authorEntityId: authorEntityId,
                messageType: m.type, content: m.text, metadata };
        });

        const missionsData = (campaign.missions || []).map(m => ({
            id: m.id, campaignId: campaign.id, title: m.title, description: m.description, status: m.status,
            embedding: missionEmbeddingMap.get(m.id) || null,
        }));
        
        const loreData = (campaign.lore || []).map(l => ({
            id: l.id, campaignId: campaign.id, category: l.category, content: l.content,
            embedding: loreEmbeddingMap.get(l.id) || null,
        }));

        const locationsData = (campaign.locations || []).map(l => ({
            id: l.id, campaignId: campaign.id, name: l.name, description: l.description,
            history: l.history, relevantInfo: l.relevantInfo,
            embedding: locationEmbeddingMap.get(l.id) || null,
        }));

        // --- ORDEM DE ESCRITA CORRIGIDA ---
        // 1. Salva as entidades "pai" primeiro (campaigns, entities)
        const { error: campaignError } = await supabase.from('campaigns').upsert(toSnakeCase(campaignData));
        if (campaignError) throw campaignError;

        if (entitiesData.length > 0) {
            const { error: entitiesError } = await supabase.from('entities').upsert(toSnakeCase(entitiesData), { onConflict: 'id' });
            if (entitiesError) throw entitiesError;
        }

        // 2. Salva as tabelas que dependem das primeiras (characters, scenes, quests, lore)
        if (keyItems.length > 0) {
            const itemsToUpsert = keyItems.map((item: any) => ({ 
                name: item.name, 
                description: item.description || null,
                campaign_id: campaign.id
            }));
            const { error: itemsUpsertError } = await supabase.from('items').upsert(toSnakeCase(itemsToUpsert), { onConflict: 'name' });
            if (itemsUpsertError) throw itemsUpsertError;
        }
        
        if (charactersData.length > 0) {
            const { error: charError } = await supabase.from('characters').upsert(toSnakeCase(charactersData), { onConflict: 'entity_id' });
            if (charError) throw charError;
        }

        if (scenesData.length > 0) {
            const { error: scenesError } = await supabase.from('scenes').upsert(toSnakeCase(scenesData), { onConflict: 'id' });
            if (scenesError) throw scenesError;
        }

        await supabase.from('quests').delete().eq('campaign_id', campaign.id);
        if (missionsData.length > 0) {
            const { error: missionsError } = await supabase.from('quests').upsert(toSnakeCase(missionsData));
            if (missionsError) throw missionsError;
        }

        await supabase.from('campaign_lore').delete().eq('campaign_id', campaign.id);
        if (loreData.length > 0) {
            const { error: loreError } = await supabase.from('campaign_lore').upsert(toSnakeCase(loreData));
            if (loreError) throw loreError;
        }
        
        await supabase.from('locations').delete().eq('campaign_id', campaign.id);
        if (locationsData.length > 0) {
            const { error: locationsError } = await supabase.from('locations').upsert(toSnakeCase(locationsData));
            if (locationsError) throw locationsError;
        }
        
        // 3. Salva as tabelas de junção, que dependem das anteriores (scene_entities, chat_history, etc.)
        const allSceneIds = scenesData.map(s => s.id);
        if (allSceneIds.length > 0) {
            await supabase.from('scene_entities').delete().in('scene_id', allSceneIds);
            if (sceneEntitiesData.length > 0) {
                const { error: seError } = await supabase.from('scene_entities').upsert(toSnakeCase(sceneEntitiesData));
                if (seError) throw seError;
            }
        }
        
        if (chatHistoryData.length > 0) {
            const { error: chatError } = await supabase.from('chat_history').upsert(toSnakeCase(chatHistoryData), { onConflict: 'id' });
            if (chatError) throw chatError;
        }
        
        const allEntityIds = allCharacters.map(c => c.id);
        if (allEntityIds.length > 0) {
            await supabase.from('entity_traits').delete().in('entity_id', allEntityIds);
            if (entityTraitsData.length > 0) {
                const { error: etError } = await supabase.from('entity_traits').upsert(toSnakeCase(entityTraitsData));
                if (etError) throw etError;
            }
            await supabase.from('entity_conditions').delete().in('entity_id', allEntityIds);
            if (entityConditionsData.length > 0) {
                const { error: ecError } = await supabase.from('entity_conditions').insert(toSnakeCase(entityConditionsData));
                if (ecError) throw ecError;
            }
            await supabase.from('entity_inventory').delete().in('entity_id', allEntityIds);
            if (entityInventoryData.length > 0) {
                const { error: eiError } = await supabase.from('entity_inventory').upsert(toSnakeCase(entityInventoryData));
                if (eiError) throw eiError;
            }
        }

        logEvent({ type: 'db', functionName: context, params: { campaignId: campaign.id }, response: 'Success', responseTimeMs: Date.now() - startTime });
    } catch (error) {
        if (isAppError(error)) throw error;
        throw createAppError('SUPABASE_ERROR', 'Falha ao salvar o estado completo da campanha.', error, context);
    }
}

export async function loadCampaign(campaignId: string): Promise<GameState | null> {
    const startTime = Date.now();
    const context = 'campaign.service.loadCampaign';
    try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw createAppError('SUPABASE_ERROR', 'Falha ao obter sessão para carregar.', sessionError, context);
        if (!session?.user) throw createAppError('AUTH_ERROR', 'Usuário não autenticado.', null, context);

        const { data: campaignData, error: campaignError } = await supabase.from('campaigns').select('*').eq('id', campaignId).single();
        if (campaignError) throw campaignError;
        if (!campaignData) return null;

        const { data: entitiesData, error: entitiesError } = await supabase.from('entities').select('id, type').eq('campaign_id', campaignId);
        if (entitiesError) throw entitiesError;
        const entityIds = (entitiesData || []).map(e => e.id);

        const { data: charactersData, error: charError } = await supabase.from('characters').select('*').in('entity_id', entityIds);
        if (charError) throw charError;

        const { data: scenesData, error: scenesError } = await supabase.from('scenes').select('*').eq('campaign_id', campaignId).order('scene_number');
        if (scenesError) {
             throw createAppError('SUPABASE_ERROR', 'Falha ao carregar dados de cenas da campanha.', scenesError, context);
        }
        const sceneIds = (scenesData || []).map(s => s.id);

        const [
            { data: traitsData, error: traitsError },
            { data: conditionsData, error: condError },
            { data: inventoryData, error: invError },
            { data: sceneEntitiesData, error: seError },
            { data: chatData, error: chatError },
            { data: missionsData, error: missionsError },
            { data: loreData, error: loreError },
            { data: locationsData, error: locationsError },
        ] = await Promise.all([
            supabase.from('entity_traits').select('*, traits(name)').in('entity_id', entityIds),
            supabase.from('entity_conditions').select('*, conditions(name, type, level_1_description, level_2_description, level_3_description)').in('entity_id', entityIds),
            supabase.from('entity_inventory').select('*, items(name, description)').in('entity_id', entityIds),
            supabase.from('scene_entities').select('*').in('scene_id', sceneIds),
            supabase.from('chat_history').select('*').eq('campaign_id', campaignId).order('timestamp'),
            supabase.from('quests').select('*').eq('campaign_id', campaignId),
            supabase.from('campaign_lore').select('*').eq('campaign_id', campaignId),
            supabase.from('locations').select('*').eq('campaign_id', campaignId),
        ]);
        
        if (traitsError || condError || invError || seError || chatError || missionsError || loreError || locationsError) {
             throw createAppError('SUPABASE_ERROR', 'Falha ao carregar dados relacionados da campanha.', { traitsError, condError, invError, seError, chatError, missionsError, loreError, locationsError }, context);
        }

        const allCharacters = toCamelCase(charactersData).map((char: any) => {
            const entity = entitiesData.find(e => e.id === char.entityId);
            
            return {
                ...char,
                id: char.entityId,
                type: entity?.type,
                progressPoints: char.progressPoints || 0,
                unspentElementPoints: char.unspentElementPoints || 0,
                advantages: (traitsData || []).filter(t => t.entity_id === char.entityId && t.is_advantage).map(t => t.traits.name),
                disadvantages: (traitsData || []).filter(t => t.entity_id === char.entityId && !t.is_advantage).map(t => t.traits.name),
                items: (inventoryData || []).filter(i => i.entity_id === char.entityId).map((i: any) => ({ 
                    name: i.items.name, 
                    description: i.items.description, 
                    quantity: i.quantity,
                    item_type: i.configuration_details?.item_type
                })),
                states: (conditionsData || []).filter(c => c.entity_id === char.entityId).map((c: any): Character['states'][number] => ({
                    name: c.conditions.name, 
                    type: c.conditions.type, 
                    intensity: c.intensity,
                    description: c.intensity === 'Grave' ? c.conditions.level_3_description : c.intensity === 'Moderado' ? c.conditions.level_2_description : c.intensity === 'Leve' ? c.conditions.level_1_description : '',
                    remaining_turns: c.remaining_turns,
                })),
            };
        });
        
        const playerCharacter = allCharacters.find(c => c.type === 'player');
        const npcs = allCharacters.filter(c => c.type !== 'player');

        if (!playerCharacter) throw createAppError('VALIDATION_ERROR', 'Nenhum personagem do jogador encontrado na campanha carregada.', null, context);

        const loadedCampaign: Campaign = {
            ...toCamelCase(campaignData),
            chatHistory: (chatData || []).map((dbMsg: any) => {
                const camelCasedMsg = toCamelCase(dbMsg);
                const camelCasedMetadata = camelCasedMsg.metadata ? toCamelCase(camelCasedMsg.metadata) : {};

                const finalMessage: Partial<Message> = {
                    ...camelCasedMetadata,
                    id: camelCasedMsg.id,
                    sceneId: camelCasedMsg.sceneId,
                    authorId: camelCasedMsg.authorEntityId,
                    authorName: camelCasedMetadata.authorName,
                    type: camelCasedMsg.messageType,
                    text: camelCasedMsg.content,
                };
                
                if (finalMessage.authorId === null || finalMessage.authorId === undefined) {
                    if (camelCasedMetadata.authorName === 'Mestre') {
                        finalMessage.authorId = 'master';
                    } else {
                        finalMessage.authorId = 'system';
                    }
                }
                
                return finalMessage as Message;
            }),
            scenes: toCamelCase(scenesData).map((scene: any) => ({
                ...scene,
                characterIds: (sceneEntitiesData || []).filter(se => se.scene_id === scene.id).map(se => se.entity_id)
            })),
            missions: toCamelCase(missionsData || []),
            lore: toCamelCase(loreData || []),
            locations: toCamelCase(locationsData || []),
            plotDetails: undefined,
        };
        
        const loadedState: GameState = {
            campaign: loadedCampaign,
            playerCharacter: playerCharacter as any,
            npcs: npcs as any[],
            isMasterThinking: false,
            isSaving: false,
        };
        
        logEvent({ type: 'db', functionName: context, params: { campaignId }, response: `Campaign '${loadedState.campaign.title}' loaded.`, responseTimeMs: Date.now() - startTime });

        return loadedState;

    } catch(e) {
        if (isAppError(e)) throw e;
        throw createAppError('SUPABASE_ERROR', 'Falha ao carregar o estado da campanha.', e, context);
    }
}


/**
 * Apaga uma campanha e todos os seus dados relacionados do banco de dados.
 * @param campaignId O ID da campanha a ser apagada.
 */
export async function deleteCampaign(campaignId: string): Promise<void> {
    const startTime = Date.now();
    const context = 'campaign.service.deleteCampaign';
    try {
        const { data: entities, error: entitiesError } = await supabase
            .from('entities')
            .select('id')
            .eq('campaign_id', campaignId);
        if (entitiesError) throw entitiesError;
        const entityIds = entities.map(e => e.id);

        if (entityIds.length > 0) {
            await supabase.from('entity_traits').delete().in('entity_id', entityIds);
            await supabase.from('entity_conditions').delete().in('entity_id', entityIds);
            await supabase.from('entity_inventory').delete().in('entity_id', entityIds);
            await supabase.from('characters').delete().in('entity_id', entityIds);
        }
        await supabase.from('scene_entities').delete().in('scene_id', (await supabase.from('scenes').select('id').eq('campaign_id', campaignId)).data?.map(s => s.id) || []);
        await supabase.from('chat_history').delete().eq('campaign_id', campaignId);
        await supabase.from('scenes').delete().eq('campaign_id', campaignId);
        await supabase.from('locations').delete().eq('campaign_id', campaignId);
        await supabase.from('entities').delete().eq('campaign_id', campaignId);
        
        const { error } = await supabase.from('campaigns').delete().eq('id', campaignId);
        if (error) throw error;
        
        logEvent({ type: 'db', functionName: context, params: { campaignId }, response: "Success", responseTimeMs: Date.now() - startTime });
    } catch (error) {
        throw createAppError('SUPABASE_ERROR', 'Falha ao apagar a campanha.', error, context);
    }
}