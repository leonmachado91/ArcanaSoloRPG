// services/supabaseService.test.ts
// test(db): Adiciona testes de integração para o `supabaseService`.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { saveCampaign, loadCampaign } from '@/services/db/campaign.service';
import { supabase } from '@/services/db/supabaseClient';
import { GameState } from '../types/game';
// FIX: Update import to use the new Zustand store instead of the deprecated GameContext.
import { initialGameState } from '../store/useGameStore';

// --- DADOS DE CATÁLOGO MOCK ---
// Estes dados precisam existir no DB para o teste funcionar.
const MOCK_TRAITS_CATALOG = [
    { id: 9001, name: "Atleta", element: 'fire', description: '...', points: 1, type: 'advantage' },
    { id: 9002, name: "Azarado", element: 'water', description: '...', points: -1, type: 'disadvantage' }
];
const MOCK_CONDITIONS_CATALOG = [
    { id: 8001, name: 'Envenenado', category: 'Físico', level_1_description: 'Leve', level_2_description: 'Moderado', level_3_description: 'Grave', type: 'negative', nature: 'physical' }
];
const MOCK_ITEMS_CATALOG = [
    { id: 7001, name: 'Poção de Vida', description: 'Cura ferimentos leves.' },
    { id: 7002, name: 'Adaga', description: 'Uma adaga simples.' }
];


// --- DADOS DE ESTADO DE JOGO MOCK ---
const MOCK_CAMPAIGN_ID = uuidv4();
const MOCK_PLAYER_ID = uuidv4();
const MOCK_NPC_ID = uuidv4();
const MOCK_SCENE_ID = uuidv4();
const MOCK_CHAT_ID = uuidv4();
const MOCK_MISSION_ID = uuidv4();
const MOCK_LORE_ID = uuidv4();

const MOCK_GAME_STATE: GameState = {
    ...initialGameState,
    campaign: {
        ...initialGameState.campaign,
        id: MOCK_CAMPAIGN_ID,
        title: 'A Saga de Teste',
        genre: 'Fantasia de Teste',
        worldAdjective: 'Caótico',
        location: 'Taverna do Código',
        era: 'Era da Integração',
        declarations: ['Testes são importantes.'],
        scenes: [{
            id: MOCK_SCENE_ID,
            campaignId: MOCK_CAMPAIGN_ID,
            sceneNumber: 1,
            // FIX: Added the required 'title' property to the Scene object.
            title: 'A cena inicial',
            description: 'A cena inicial',
            arcanaCardsDrawn: { verb: 'Testar', theme: 'Código', adjective: 'Confiável', emotion: 'Foco' },
            isActive: true,
            turnCount: 0,
            characterIds: [MOCK_PLAYER_ID, MOCK_NPC_ID]
        }],
        chatHistory: [{
            id: MOCK_CHAT_ID,
            sceneId: MOCK_SCENE_ID,
            authorId: 'player',
            authorName: 'Jogador Teste',
            type: 'chat',
            text: 'Eu ataco!',
        }],
        missions: [{
            id: MOCK_MISSION_ID,
            campaignId: MOCK_CAMPAIGN_ID,
            title: 'Missão de Teste',
            description: 'Completar os testes de integração.',
            status: 'active'
        }],
        lore: [{
            id: MOCK_LORE_ID,
            campaignId: MOCK_CAMPAIGN_ID,
            category: 'Metateste',
            content: 'Este é um registro de lore para fins de teste.'
        }],
    },
    playerCharacter: {
        ...initialGameState.playerCharacter,
        id: MOCK_PLAYER_ID,
        type: 'player',
        name: 'Jogador Teste',
        age: 30,
        description: 'Um aventureiro corajoso.',
        personalityTraits: ['Corajoso', 'Determinado'],
        history: 'Nascido para testar.',
        advantages: ['Atleta'],
        disadvantages: ['Azarado'],
        items: [{ name: 'Poção de Vida', quantity: 2, description: 'Cura ferimentos leves.' }],
        states: [{ name: 'Envenenado', description: 'Leve', type: 'negative', intensity: 'Leve' }],
    },
    npcs: [{
        ...initialGameState.playerCharacter,
        id: MOCK_NPC_ID,
        type: 'npc',
        name: 'NPC de Teste',
        age: 150,
        description: 'Um PNJ para testes.',
        personalityTraits: ['Sábio'],
        history: 'Existe para ser testado.',
        advantages: [],
        disadvantages: [],
        items: [{ name: 'Adaga', quantity: 1, description: 'Uma adaga simples.' }],
        states: [],
    }],
};

// Helper para ordenar arrays dentro do estado para comparação consistente
const sortStateArrays = (state: GameState): GameState => {
    state.npcs.sort((a, b) => a.id.localeCompare(b.id));
    state.playerCharacter.advantages.sort();
    state.playerCharacter.disadvantages.sort();
    state.playerCharacter.items.sort((a, b) => a.name.localeCompare(b.name));
    state.playerCharacter.states.sort((a, b) => a.name.localeCompare(b.name));
    state.campaign.scenes?.sort((a, b) => a.sceneNumber - b.sceneNumber);
    state.campaign.chatHistory?.sort((a, b) => a.id.localeCompare(b.id));
    state.campaign.missions?.sort((a, b) => a.title.localeCompare(b.title));
    state.campaign.lore?.sort((a, b) => a.content.localeCompare(b.content));
    return state;
};


const envMatrix = {
    SUPABASE_URL: process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY,
    TEST_SUPABASE_EMAIL: process.env.TEST_SUPABASE_EMAIL,
    TEST_SUPABASE_PASSWORD: process.env.TEST_SUPABASE_PASSWORD,
} as const;

const missingEnvVars = Object.entries(envMatrix)
    .filter(([, value]) => !value)
    .map(([key]) => {
        if (key === 'SUPABASE_URL') return 'SUPABASE_URL/VITE_SUPABASE_URL';
        if (key === 'SUPABASE_ANON_KEY') return 'SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY';
        return key;
    });

const canRunSupabaseTests = missingEnvVars.length === 0;
const describeIntegration = canRunSupabaseTests ? describe : describe.skip;

if (!canRunSupabaseTests) {
    console.warn(`[supabaseService.test] Testes de integracao do Supabase ignorados. Variaveis ausentes: ${missingEnvVars.join(', ')}`);
}

describeIntegration('supabaseService integration tests', () => {

    let shouldSignOut = false;

    beforeAll(async () => {
        const email = envMatrix.TEST_SUPABASE_EMAIL!;
        const password = envMatrix.TEST_SUPABASE_PASSWORD!;

        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
            throw new Error(`Falha ao autenticar usuario de teste no Supabase: ${signInError.message}`);
        }
        shouldSignOut = true;

        // SETUP: Garante que os dados de catalogo existem no DB.
        await supabase.from('traits').upsert(MOCK_TRAITS_CATALOG);
        await supabase.from('conditions').upsert(MOCK_CONDITIONS_CATALOG);
        await supabase.from('items').upsert(MOCK_ITEMS_CATALOG);
    }, 30000);

    afterAll(async () => {
        // TEARDOWN: Limpa todos os dados de campanha e catalogo criados.
        const entityIds = [MOCK_PLAYER_ID, MOCK_NPC_ID];
        
        await supabase.from('entity_traits').delete().in('entity_id', entityIds);
        await supabase.from('entity_conditions').delete().in('entity_id', entityIds);
        await supabase.from('entity_inventory').delete().in('entity_id', entityIds);
        await supabase.from('chat_history').delete().eq('campaign_id', MOCK_CAMPAIGN_ID);
        await supabase.from('scenes').delete().eq('campaign_id', MOCK_CAMPAIGN_ID);
        await supabase.from('quests').delete().eq('campaign_id', MOCK_CAMPAIGN_ID);
        await supabase.from('campaign_lore').delete().eq('campaign_id', MOCK_CAMPAIGN_ID);
        await supabase.from('characters').delete().in('entity_id', entityIds);
        await supabase.from('entities').delete().eq('campaign_id', MOCK_CAMPAIGN_ID);
        await supabase.from('campaigns').delete().eq('id', MOCK_CAMPAIGN_ID);
        
        await supabase.from('traits').delete().in('id', MOCK_TRAITS_CATALOG.map(t => t.id));
        await supabase.from('conditions').delete().in('id', MOCK_CONDITIONS_CATALOG.map(c => c.id));
        await supabase.from('items').delete().in('id', MOCK_ITEMS_CATALOG.map(i => i.id));

        if (shouldSignOut) {
            await supabase.auth.signOut();
        }
    }, 30000);

    it('should save and load a campaign state correctly (round-trip test)', async () => {
        // ARRANGE: O mock state ja esta pronto.
        
        // ACT 1: Salvar a campanha
        // Usamos um bloco try/catch para obter mais detalhes em caso de falha.
        let saveError: any = null;
        try {
            await saveCampaign(MOCK_GAME_STATE);
        } catch (error) {
            saveError = error;
        }
        expect(saveError).toBeNull();
        
        // ACT 2: Carregar a campanha de volta
        let loadedState: GameState | null = null;
        let loadError: any = null;
        try {
             loadedState = await loadCampaign(MOCK_CAMPAIGN_ID);
        } catch (error) {
            loadError = error;
        }
        expect(loadError).toBeNull();
        expect(loadedState).not.toBeNull();

        // ASSERT: Comparar o estado carregado com o original
        if (loadedState) {
            const sortedLoadedState = sortStateArrays(loadedState);
            const sortedMockState = sortStateArrays(MOCK_GAME_STATE);

            // Removendo campos que podem nao ser salvos/carregados consistentemente
            // ou que sao recalculados (como companionCount).
            delete sortedMockState.campaign.companionCount;
            delete sortedLoadedState.campaign.companionCount;

            // Comparacao profunda
            expect(sortedLoadedState.playerCharacter).toEqual(sortedMockState.playerCharacter);
            expect(sortedLoadedState.npcs).toEqual(sortedMockState.npcs);
            expect(sortedLoadedState.campaign).toEqual(sortedMockState.campaign);
        }
    }, 60000); // Timeout estendido para testes de integracao de DB.
});

