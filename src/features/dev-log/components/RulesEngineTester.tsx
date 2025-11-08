// features/dev-log/components/RulesEngineTester.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { useCatalogStore } from '@/store/catalogStore';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import { Character, Element as ElementType, DamageSeverity } from '@/types/character';
import { logEvent } from '@/store/devLogStore';
import { oracles, OracleTableName } from '@/data/rules/oracles';
import { formatErrorForDisplay } from '@/types/game';
import Textarea from '@/components/ui/Textarea';
import { useErrorStore } from '@/store/errorStore';
import { gameMasterService } from '@/services/gameMasterService';
import { toolService } from '@/services/ai/tools/toolService';
import { supabase } from '@/services/db/supabaseClient';
import { usePromptStore } from '@/store/promptStore';

// FIX: Removed imports for obsolete static prompt files.
// The functionality to seed prompts from these files is deprecated.

// Seção de UI reutilizável para organizar os testes
const TestSection: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div className="p-4 border border-zinc-800 bg-zinc-900/50 rounded-lg">
        <h3 className="font-display text-lg text-amber-400 mb-3">{title}</h3>
        <div className="space-y-4">{children}</div>
    </div>
);

// Componente para exibir resultados de forma consistente
const ResultDisplay: React.FC<{ result: any }> = ({ result }) => {
    if (!result) return null;
    return (
        <pre className="mt-2 p-3 bg-black/50 rounded-md text-sm text-slate-300 overflow-x-auto">
            <code>{JSON.stringify(result, null, 2)}</code>
        </pre>
    );
};


const RulesEngineTester: React.FC = () => {
    const state = useGameStore();
    const { conditions: allConditions, isLoading: isLoadingConditions } = useCatalogStore();
    const { showError } = useErrorStore();

    const [difficulty, setDifficulty] = useState(10);
    const [difficultyResult, setDifficultyResult] = useState<any>(null);
    const [selectedElement, setSelectedElement] = useState<ElementType>('fire');
    const [modifier, setModifier] = useState(0);
    const [conditionId, setConditionId] = useState<number | undefined>(undefined);
    const [intensity, setIntensity] = useState<'Leve' | 'Moderado' | 'Grave'>('Leve');
    const [arcanaResult, setArcanaResult] = useState<any>(null);
    const [oracleResult, setOracleResult] = useState<any>(null);
    const [selectedOracle, setSelectedOracle] = useState<OracleTableName>('npc_combat_action');
    const [progressPoints, setProgressPoints] = useState(2);
    const [progressResult, setProgressResult] = useState<any>(null);
    const [attackerId, setAttackerId] = useState<string>(state.playerCharacter.id);
    const [defenderId, setDefenderId] = useState<string>(state.playerCharacter.id);
    const [attackerMod, setAttackerMod] = useState(0);
    const [defenderMod, setDefenderMod] = useState(0);
    const [contestedResult, setContestedResult] = useState<any>(null);
    const [severityInput, setSeverityInput] = useState('6, 6, 2');
    const [severityResult, setSeverityResult] = useState<any>(null);
    const [itemTargetCharId, setItemTargetCharId] = useState<string>(state.playerCharacter.id);
    const [itemName, setItemName] = useState('Chave de Gelo Antiga');
    const [itemDesc, setItemDesc] = useState('Um item de missão único.');
    const [itemQty, setItemQty] = useState(1);
    const [charToAddToScene, setCharToAddToScene] = useState<string>('');
    const [npcName, setNpcName] = useState('');
    const [npcDesc, setNpcDesc] = useState('');
    const [npcHistory, setNpcHistory] = useState('');
    const [isCreatingNpc, setIsCreatingNpc] = useState(false);
    // FIX: Removed state related to obsolete prompt seeding.
    const [promptStoreState, setPromptStoreState] = useState<any>(null);


    const conditionOptions = useMemo(() => allConditions.map(c => ({ value: c.id.toString(), label: c.name })), [allConditions]);
    const oracleOptions = useMemo(() => Object.keys(oracles).map(key => ({
        value: key,
        label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    })), []);

    const allCharacters = useMemo(() => [state.playerCharacter, ...state.npcs], [state.playerCharacter, state.npcs]);
    const characterOptions = useMemo(() => allCharacters.map(c => ({ value: c.id, label: c.name || c.id })), [allCharacters]);
    const npcOptions = useMemo(() => state.npcs.map(c => ({ value: c.id, label: c.name || c.id })), [state.npcs]);

    useEffect(() => {
        if (conditionId === undefined && allConditions.length > 0) {
            setConditionId(allConditions[0].id);
        }
    }, [allConditions, conditionId]);

    useEffect(() => {
        if (allCharacters.length > 0 && !allCharacters.find(c => c.id === defenderId)) {
            setDefenderId(allCharacters[0].id);
        }
         if (allCharacters.length > 0 && !allCharacters.find(c => c.id === attackerId)) {
            setAttackerId(allCharacters[0].id);
        }
    }, [allCharacters, defenderId, attackerId]);
    
    useEffect(() => {
        if (charToAddToScene === '' && npcOptions.length > 0) {
            setCharToAddToScene(npcOptions[0].value);
        }
    }, [npcOptions, charToAddToScene]);

    const handleAction = async (action: () => Promise<any>, setResult: (result: any) => void, successMsg: string, errorMsg: string) => {
        try {
            const result = await action();
            setResult({ message: successMsg, result });
        } catch (error) {
            const message = formatErrorForDisplay(error, errorMsg);
            showError(message);
            setResult({ message: `Erro: ${message}` });
        }
    };

    const handleDifficultyCheck = () => handleAction(
        () => gameMasterService.executeImmediateDifficultyCheck({ characterId: state.playerCharacter.id, element: selectedElement, difficulty, modifier, description: "Teste manual de dificuldade." }),
        setDifficultyResult,
        "Teste executado e enviado para o chat.",
        "Falha ao executar teste."
    );
    
    const handleSendDifficultyCheckToRoll = () => handleAction(
        () => toolService.dispatchTool({ name: 'roll_character_difficultyCheck', args: { characterId: state.playerCharacter.id, element: selectedElement, difficulty, modifier, description: "Teste manual pendente." } }),
        setDifficultyResult,
        "Solicitação de rolagem enviada para o chat.",
        "Falha ao enviar solicitação de teste."
    );

    const handleContestedCheck = () => handleAction(
        () => gameMasterService.executeImmediateClash({ attackerId, defenderId, attackerMod, defenderMod, description: `Confronto manual: ${attackerId} vs ${defenderId}` }),
        setContestedResult,
        "Confronto executado e enviado para o chat.",
        "Falha ao executar confronto."
    );
    
    const handleSendContestedCheckToRoll = () => handleAction(
        () => toolService.dispatchTool({ name: 'roll_character_clash', args: { attackerId, defenderId, description: `Confronto manual pendente: ${attackerId} vs ${defenderId}` } }),
        setContestedResult,
        "Solicitação de confronto enviada para o chat.",
        "Falha ao enviar solicitação de confronto."
    );
    
    const handleSeverityCheck = () => handleAction(
        () => {
            const rolls = severityInput.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
            return gameMasterService.executeSeverityCheck(rolls);
        },
        setSeverityResult,
        "Cálculo de severidade enviado para o chat.",
        "Falha ao calcular severidade."
    );

    const handleApplyCondition = () => {
        if (typeof conditionId !== 'number' || !itemTargetCharId) return;
        const conditionInfo = allConditions.find(c => c.id === conditionId);
        if (!conditionInfo) return;
        handleAction(
            () => gameMasterService.executeApplyCondition(itemTargetCharId, conditionInfo.name, intensity, "Aplicada manualmente."),
            () => {},
            "Condição aplicada com sucesso.",
            "Falha ao aplicar condição."
        );
    };

    const handleDrawArcana = () => handleAction(
        gameMasterService.executeArcanaDraw,
        setArcanaResult,
        "Sorteio de cartas enviado para o chat.",
        "Falha ao sortear cartas."
    );
    
    const handleQueryOracle = () => handleAction(
        () => gameMasterService.executeOracleQuery(selectedOracle),
        setOracleResult,
        "Consulta ao oráculo enviada para o chat.",
        "Falha ao consultar oráculo."
    );

    const handleAddProgress = () => handleAction(
        () => gameMasterService.executeAddProgress(itemTargetCharId, progressPoints, "Adicionado manualmente."),
        setProgressResult,
        "Pontos de progresso aplicados com sucesso.",
        "Falha ao adicionar progresso."
    );
    
    const handleEndTurn = () => handleAction(
        gameMasterService.executeEndTurnCycle,
        () => {},
        "Turno finalizado com sucesso.",
        "Falha ao finalizar turno."
    );

    const handleAddItem = () => handleAction(
        () => gameMasterService.executeAddItem(itemTargetCharId, { name: itemName, description: itemDesc, quantity: itemQty }),
        () => {},
        "Item adicionado com sucesso.",
        "Falha ao adicionar item."
    );

    const handleNewScene = () => handleAction(
        gameMasterService.executeSceneChange,
        () => {},
        "Nova cena criada com sucesso.",
        "Falha ao criar nova cena."
    );
    
    const handleAddCharacterToScene = () => {
        if (!charToAddToScene) return;
        handleAction(
            () => gameMasterService.executeAddCharacterToScene(charToAddToScene),
            () => {},
            "Personagem adicionado à cena.",
            "Falha ao adicionar personagem à cena."
        );
    };
    
    const handleCreateNpc = async () => {
        if (!npcName) {
            showError("O nome do NPC é obrigatório.");
            return;
        }
        setIsCreatingNpc(true);
        await handleAction(
            () => gameMasterService.executeNpcCreation({ name: npcName, description: npcDesc, history: npcHistory }),
            () => {
                setNpcName(''); setNpcDesc(''); setNpcHistory('');
            },
            "NPC criado com sucesso.",
            "Falha ao criar NPC."
        );
        setIsCreatingNpc(false);
    };

    const handleShowPromptStore = () => {
        const { prompts, isLoading, error } = usePromptStore.getState();
        setPromptStoreState({
            isLoading,
            error: error ? error.message : null,
            promptCount: Object.keys(prompts).length,
            prompts,
        });
    };

    return (
        <div className="space-y-6 overflow-y-auto h-full pr-2">
            
            <TestSection title="Visualizador de Stores">
                <p className="text-sm text-slate-400 font-body-serif">Clique para ver o estado atual dos prompts carregados do Supabase.</p>
                <Button onClick={handleShowPromptStore}>
                    Exibir Estado do Prompt Store
                </Button>
                <ResultDisplay result={promptStoreState} />
            </TestSection>
            
            <TestSection title="Gerenciamento de Cena e Personagens">
                <Button onClick={handleNewScene} variant="secondary">Forçar Nova Cena</Button>
                
                <div className="pt-4 border-t border-zinc-800">
                    <h4 className="font-semibold text-slate-300 mb-2">Adicionar NPC à Cena Ativa</h4>
                    <div className="flex items-end gap-2">
                        <div className="flex-grow">
                            {npcOptions.length > 0 ? (
                                 <Select label="Personagem" options={npcOptions} value={charToAddToScene} onChange={setCharToAddToScene} />
                            ) : <p className='text-sm text-zinc-500'>Nenhum NPC na campanha para adicionar.</p>}
                        </div>
                        <Button onClick={handleAddCharacterToScene} disabled={!charToAddToScene || npcOptions.length === 0}>Adicionar</Button>
                    </div>
                </div>

                 <div className="pt-4 border-t border-zinc-800">
                    <h4 className="font-semibold text-slate-300 mb-2">Criar Novo NPC</h4>
                    <div className="space-y-3">
                        <Input label="Nome do NPC" value={npcName} onChange={e => setNpcName(e.target.value)} placeholder="Nome..." />
                        <Input label="Descrição" value={npcDesc} onChange={e => setNpcDesc(e.target.value)} placeholder="Aparência..." />
                        <Textarea label="História" value={npcHistory} onChange={e => setNpcHistory(e.target.value)} placeholder="Background..." rows={2} />
                        <Button onClick={handleCreateNpc} isLoading={isCreatingNpc} className="w-full">Criar e Adicionar NPC</Button>
                    </div>
                </div>
            </TestSection>
            
            <TestSection title="Adicionar Item (Teste Dinâmico)">
                <Select label="Personagem Alvo" options={characterOptions} value={itemTargetCharId} onChange={setItemTargetCharId} />
                <div className="grid grid-cols-2 gap-4">
                    <Input label="Nome do Item" value={itemName} onChange={e => setItemName(e.target.value)} />
                    <Input label="Quantidade" type="number" value={itemQty} onChange={e => setItemQty(parseInt(e.target.value, 10) || 1)} />
                </div>
                <Input label="Descrição do Item" value={itemDesc} onChange={e => setItemDesc(e.target.value)} />
                <Button onClick={handleAddItem} disabled={!itemName || !itemTargetCharId}>Adicionar Item</Button>
            </TestSection>

            <TestSection title="Teste de Dificuldade">
                <div className="grid grid-cols-3 gap-4">
                     <Select 
                        label="Elemento" 
                        options={[
                            { value: 'fire', label: 'Fogo' },
                            { value: 'water', label: 'Água' },
                            { value: 'air', label: 'Ar' },
                            { value: 'earth', label: 'Terra' },
                        ]} 
                        value={selectedElement} 
                        onChange={v => setSelectedElement(v as ElementType)} 
                    />
                    <Input label="Dificuldade" type="number" value={difficulty} onChange={e => setDifficulty(parseInt(e.target.value, 10) || 0)} />
                    <Input label="Modificador" type="number" value={modifier} onChange={e => setModifier(parseInt(e.target.value, 10) || 0)} />
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleDifficultyCheck} className="flex-1">Executar e Rolar</Button>
                    <Button onClick={handleSendDifficultyCheckToRoll} variant="secondary" className="flex-1">Enviar para Rolar</Button>
                </div>
                <ResultDisplay result={difficultyResult} />
            </TestSection>

            <TestSection title="Ação Contestada (Combate)">
                <div className="grid grid-cols-2 gap-4">
                    <Select label="Atacante (Fogo)" options={characterOptions} value={attackerId} onChange={setAttackerId} />
                    <Select label="Defensor (Terra)" options={characterOptions} value={defenderId} onChange={setDefenderId} />
                     <Input label="Modificador Atacante" type="number" value={attackerMod} onChange={e => setAttackerMod(parseInt(e.target.value, 10) || 0)} />
                    <Input label="Modificador Defensor" type="number" value={defenderMod} onChange={e => setDefenderMod(parseInt(e.target.value, 10) || 0)} />
                </div>
                 <div className="flex gap-2">
                    <Button onClick={handleContestedCheck} className="flex-1">Executar e Rolar</Button>
                    <Button onClick={handleSendContestedCheckToRoll} variant="secondary" className="flex-1">Enviar para Rolar</Button>
                </div>
                <ResultDisplay result={contestedResult} />
            </TestSection>

            <TestSection title="Cálculo de Severidade de Dano">
                <Input 
                    label="Dados de Defesa (separados por vírgula)" 
                    value={severityInput}
                    onChange={e => setSeverityInput(e.target.value)}
                    placeholder="Ex: 6, 6, 2"
                />
                <Button onClick={handleSeverityCheck}>Calcular Severidade</Button>
                <ResultDisplay result={severityResult} />
            </TestSection>

            <TestSection title="Aplicar Condição">
                <Select label="Personagem Alvo" options={characterOptions} value={itemTargetCharId} onChange={setItemTargetCharId} />
                {isLoadingConditions ? <Spinner/> : (
                    <div className="grid grid-cols-2 gap-4">
                        <Select label="Condição" options={conditionOptions} value={conditionId?.toString() ?? ''} onChange={v => setConditionId(parseInt(v,10))} />
                        <Select label="Intensidade" options={[{value: 'Leve', label: 'Leve'}, {value: 'Moderado', label: 'Moderada'}, {value: 'Grave', label: 'Grave'}]} value={intensity} onChange={v => setIntensity(v as any)} />
                    </div>
                )}
                <Button onClick={handleApplyCondition} disabled={typeof conditionId !== 'number'}>Aplicar Condição</Button>
            </TestSection>

            <TestSection title="Adicionar Pontos de Progresso">
                <Select label="Personagem Alvo" options={characterOptions} value={itemTargetCharId} onChange={setItemTargetCharId} />
                <Input label="Pontos a Adicionar" type="number" value={progressPoints} onChange={e => setProgressPoints(parseInt(e.target.value, 10) || 0)} />
                <Button onClick={handleAddProgress}>Adicionar Progresso</Button>
                <ResultDisplay result={progressResult} />
            </TestSection>
            
            <TestSection title="Sorteio de Cartas Arcana">
                <Button onClick={handleDrawArcana}>Sortear Cartas</Button>
                <ResultDisplay result={arcanaResult} />
            </TestSection>

            <TestSection title="Consulta a Oráculos">
                 <Select 
                    label="Tabela de Oráculo" 
                    options={oracleOptions} 
                    value={selectedOracle} 
                    onChange={v => setSelectedOracle(v as OracleTableName)} 
                />
                <Button onClick={handleQueryOracle}>Consultar Oráculo</Button>
                <ResultDisplay result={oracleResult} />
            </TestSection>

            <TestSection title="Avançar Turno">
                <p className="text-sm text-slate-400">Turno Atual: {state.campaign.scenes?.find(s=>s.isActive)?.turnCount || 0}</p>
                <Button onClick={handleEndTurn}>Finalizar Turno</Button>
            </TestSection>
        </div>
    );
};

export default RulesEngineTester;