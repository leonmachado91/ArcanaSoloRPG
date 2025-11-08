// features/content-editor/components/ContentEditorModal.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Drawer from '@/components/ui/Drawer';
import Select from '@/components/ui/Select';
import EditableTextarea from './EditableTextarea';
import Button from '@/components/ui/Button';
import { usePromptStore, PromptEntry } from '@/store/promptStore';
import * as promptService from '@/services/db/prompt.service';
import { useErrorStore } from '@/store/errorStore';
import { formatErrorForDisplay } from '@/types/game';
import Icon from '@/components/ui/Icon';
import { useCatalogStore } from '@/store/catalogStore';
import { Rule, RuleUpdatePayload } from '@/types/rules';
import * as rulesService from '@/services/db/rules.service';
import { generateEmbedding } from '@/services/ai/embeddingService';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { v4 as uuidv4 } from 'uuid';

interface ContentEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// Define the structure for a single prompt's history
interface HistoryState {
    past: string[];
    future: string[];
}


const ContentEditorModal: React.FC<ContentEditorModalProps> = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState<'prompts' | 'rules'>('prompts');
    
    // --- Global State ---
    const globalPrompts = usePromptStore(state => state.prompts);
    const fetchGlobalPrompts = usePromptStore(state => state.fetchPrompts);
    const globalRules = useCatalogStore(state => state.rules);
    const fetchCatalogs = useCatalogStore(state => state.fetchCatalogs);
    const { showError } = useErrorStore();

    // --- Common State ---
    const [isLoading, setIsLoading] = useState(false);

    // --- Prompts State ---
    const [localPrompts, setLocalPrompts] = useState<Record<string, PromptEntry>>({});
    const [modifiedKeys, setModifiedKeys] = useState<Set<string>>(new Set());
    const keyOptions = useMemo(() => 
        Object.keys(localPrompts)
            .sort((a, b) => a.localeCompare(b))
            .map(k => ({ value: k, label: k })), 
    [localPrompts]);
    const [selectedKey, setSelectedKey] = useState('');
    const [history, setHistory] = useState<Record<string, HistoryState>>({});
    const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [isNewPromptModalOpen, setIsNewPromptModalOpen] = useState(false);
    const [newPromptKey, setNewPromptKey] = useState('');
    const [newPromptDescription, setNewPromptDescription] = useState('');
    
    // --- Rules State ---
    const [localRules, setLocalRules] = useState<Rule[]>([]);
    const [modifiedRuleTopics, setModifiedRuleTopics] = useState<Set<string>>(new Set());
    const ruleOptions = useMemo(() => 
        localRules
            .filter(r => r.topic) // Filter out rules without a topic
            .map(r => ({ value: r.topic, label: r.topic }))
            .sort((a, b) => a.label.localeCompare(b.label)), 
    [localRules]);
    const [selectedRuleTopic, setSelectedRuleTopic] = useState('');
    const [isNewRuleModalOpen, setIsNewRuleModalOpen] = useState(false);
    const [newRuleTopic, setNewRuleTopic] = useState('');

    
    // Sync global data to local state and reset when the modal opens
    useEffect(() => {
        if (isOpen) {
            // Prompts
            const deepCopiedPrompts = JSON.parse(JSON.stringify(globalPrompts));
            setLocalPrompts(deepCopiedPrompts);
            setModifiedKeys(new Set());
            setHistory({});
            const firstKey = Object.keys(deepCopiedPrompts).sort()[0] || '';
            setSelectedKey(firstKey);
            
            // Rules
            const deepCopiedRules: Rule[] = JSON.parse(JSON.stringify(globalRules));
            setLocalRules(deepCopiedRules);
            setModifiedRuleTopics(new Set());
            const firstTopic = deepCopiedRules.filter(r => r.topic).map(r => r.topic).sort((a, b) => a.localeCompare(b))[0];
            setSelectedRuleTopic(firstTopic || '');
        }
    }, [isOpen, globalPrompts, globalRules]);
    
    // Initialize history for a newly selected prompt
    useEffect(() => {
        if (isOpen && selectedKey && localPrompts[selectedKey] && !history[selectedKey]) {
            setHistory(prev => ({
                ...prev,
                [selectedKey]: {
                    past: [localPrompts[selectedKey].content], // The first entry is the original state
                    future: []
                }
            }));
        }
    }, [isOpen, selectedKey, localPrompts, history]);


    // --- Prompts Handlers ---
    const handleTextChange = useCallback((newContent: string) => {
        if (!selectedKey) return;
        
        // Update UI immediately
        setLocalPrompts(prev => ({
            ...prev,
            [selectedKey]: {
                ...(prev[selectedKey] || { description: null }),
                content: newContent
            }
        }));
        setModifiedKeys(prev => new Set(prev).add(selectedKey));

        // Debounce history saving
        if (historyTimerRef.current) clearTimeout(historyTimerRef.current);

        historyTimerRef.current = setTimeout(() => {
            setHistory(prev => {
                const keyHistory = prev[selectedKey] || { past: [], future: [] };
                const lastPastState = keyHistory.past[keyHistory.past.length - 1];
                if (lastPastState === newContent) {
                    return prev;
                }
                return {
                    ...prev,
                    [selectedKey]: {
                        past: [...keyHistory.past, newContent],
                        future: []
                    }
                };
            });
        }, 500);
    }, [selectedKey]);
    
    const handleConfirmNewPrompt = () => {
        const trimmedKey = newPromptKey.trim().toUpperCase().replace(/\s+/g, '_');
        if (!trimmedKey) {
            showError("A chave do prompt não pode ser vazia.");
            return;
        }
        if (localPrompts[trimmedKey]) {
            showError("Já existe um prompt com esta chave.");
            return;
        }

        const newPrompt: PromptEntry = {
            content: `// TODO: Adicione o conteúdo para o novo prompt "${trimmedKey}" aqui.`,
            description: newPromptDescription.trim() || null,
        };

        setLocalPrompts(prev => ({ ...prev, [trimmedKey]: newPrompt }));
        setModifiedKeys(prev => new Set(prev).add(trimmedKey));
        setSelectedKey(trimmedKey);
        setIsNewPromptModalOpen(false);
        setNewPromptKey('');
        setNewPromptDescription('');
    };

    const handleUndo = useCallback(() => {
        if (!selectedKey) return;
        
        const keyHistory = history[selectedKey];
        if (!keyHistory || keyHistory.past.length < 2) return;

        if (historyTimerRef.current) clearTimeout(historyTimerRef.current);

        const newPast = keyHistory.past.slice(0, -1);
        const currentState = keyHistory.past[newPast.length];
        const prevState = newPast[newPast.length -1];
        
        setHistory(prev => ({
            ...prev,
            [selectedKey]: {
                past: newPast,
                future: [currentState, ...keyHistory.future]
            }
        }));

        setLocalPrompts(prev => ({
            ...prev,
            [selectedKey]: { ...prev[selectedKey], content: prevState }
        }));
        
        const originalGlobalState = globalPrompts[selectedKey]?.content;
        if (prevState === originalGlobalState) {
            setModifiedKeys(prev => {
                const newSet = new Set(prev);
                newSet.delete(selectedKey);
                return newSet;
            });
        } else {
             setModifiedKeys(prev => new Set(prev).add(selectedKey));
        }
    }, [selectedKey, history, globalPrompts]);

    const handleRedo = useCallback(() => {
        if (!selectedKey) return;

        const keyHistory = history[selectedKey];
        if (!keyHistory || keyHistory.future.length === 0) return;
        
        if (historyTimerRef.current) clearTimeout(historyTimerRef.current);

        const nextState = keyHistory.future[0];
        const newFuture = keyHistory.future.slice(1);
        
        setHistory(prev => ({
            ...prev,
            [selectedKey]: {
                past: [...keyHistory.past, nextState],
                future: newFuture
            }
        }));

        setLocalPrompts(prev => ({
            ...prev,
            [selectedKey]: { ...prev[selectedKey], content: nextState }
        }));
        setModifiedKeys(prev => new Set(prev).add(selectedKey));
    }, [selectedKey, history]);

    // --- Rules Handlers ---
    const handleRuleTextChange = useCallback((newContent: string) => {
        if (!selectedRuleTopic) return;

        setLocalRules(prev => prev.map(rule => 
            rule.topic === selectedRuleTopic ? { ...rule, content: newContent } : rule
        ));
        setModifiedRuleTopics(prev => new Set(prev).add(selectedRuleTopic));
    }, [selectedRuleTopic]);

    const handleConfirmNewRule = () => {
        const trimmedTopic = newRuleTopic.trim();
        if (!trimmedTopic) {
            showError("O tópico da regra não pode ser vazio.");
            return;
        }
        if (localRules.some(rule => rule.topic === trimmedTopic)) {
            showError("Já existe uma regra com este tópico.");
            return;
        }

        const newRule: Rule = {
            id: uuidv4(),
            topic: trimmedTopic,
            content: `// TODO: Adicione o conteúdo para a regra "${trimmedTopic}" aqui.`,
            embedding: null,
        };

        setLocalRules(prev => [...prev, newRule]);
        setModifiedRuleTopics(prev => new Set(prev).add(trimmedTopic));
        setSelectedRuleTopic(trimmedTopic);
        setIsNewRuleModalOpen(false);
        setNewRuleTopic('');
    };

    // --- Save Handler ---
    const handleSaveChanges = async () => {
        setIsLoading(true);
        try {
            if (activeTab === 'prompts') {
                if (modifiedKeys.size === 0) {
                    onClose(); // Close if no changes
                    return;
                }
                const updates: promptService.PromptUpdatePayload[] = Array.from(modifiedKeys).map(key => ({
                    key,
                    content: localPrompts[key].content,
                    description: localPrompts[key].description,
                }));
                await promptService.updatePrompts(updates);
                await fetchGlobalPrompts();
                showError("Prompts salvos com sucesso!"); // Using showError for success toast
                setModifiedKeys(new Set());
                onClose();

            } else if (activeTab === 'rules') {
                if (modifiedRuleTopics.size === 0) {
                    onClose(); // Close if no changes
                    return;
                }
                
                const updates: RuleUpdatePayload[] = await Promise.all(
                    Array.from(modifiedRuleTopics).map(async (topic) => {
                        const rule = localRules.find(r => r.topic === topic);
                        if (!rule) throw new Error(`Regra com tópico "${topic}" não encontrada no estado local.`);
                        
                        const embedding = await generateEmbedding(rule.content);
                        
                        return { topic: rule.topic, content: rule.content, embedding };
                    })
                );

                await rulesService.upsertRules(updates);
                await fetchCatalogs(); // Refreshes all catalogs, including rules
                showError("Regras salvas e embedadas com sucesso!");
                setModifiedRuleTopics(new Set());
                onClose();
            }
        } catch (error) {
            const message = formatErrorForDisplay(error, "Falha ao salvar as alterações.");
            showError(message);
        } finally {
            setIsLoading(false);
        }
    };
    
    // --- Render Logic ---
    const selectedPromptDescription = (selectedKey && localPrompts[selectedKey]) ? localPrompts[selectedKey].description : 'Nenhuma descrição disponível.';
    const selectedRule = useMemo(() => localRules.find(r => r.topic === selectedRuleTopic), [localRules, selectedRuleTopic]);

    const TabButton: React.FC<{ tabId: 'prompts' | 'rules'; children: React.ReactNode }> = ({ tabId, children }) => (
        <button
            className={`py-2 px-4 font-display text-lg transition-colors ${activeTab === tabId ? 'text-amber-400 border-b-2 border-amber-400' : 'text-slate-400 hover:text-white'}`}
            onClick={() => setActiveTab(tabId)}
        >
            {children}
        </button>
    );

    return (
        <>
            <Drawer isOpen={isOpen} onClose={onClose} title="Editor de Conteúdo" size="xlarge">
                <div className="flex flex-col h-full space-y-4">

                    <div className="flex-shrink-0 border-b border-zinc-800 -mt-4 -mx-6 px-6">
                        <TabButton tabId="prompts">Prompts</TabButton>
                        <TabButton tabId="rules">Regras</TabButton>
                    </div>

                    {activeTab === 'prompts' && (
                        <>
                            <p className="text-sm text-slate-400 font-body-serif -mt-2">
                                Edite os prompts da IA em tempo real. Digite `&#123;` para ver os placeholders disponíveis.
                            </p>

                            <div className="flex items-end gap-2">
                                <div className="flex-grow">
                                    <Select
                                        label="Prompt"
                                        options={keyOptions}
                                        value={selectedKey}
                                        onChange={setSelectedKey}
                                        disabled={keyOptions.length === 0}
                                    />
                                </div>
                                <Button 
                                    variant="secondary" 
                                    onClick={() => setIsNewPromptModalOpen(true)} 
                                    className="!py-3 !px-4"
                                    title="Adicionar Novo Prompt"
                                >
                                    <Icon name="plus" className="w-5 h-5"/>
                                </Button>
                            </div>
                            
                            <div className="p-3 bg-zinc-900 border border-zinc-700 rounded-md">
                                <h4 className="font-bold text-sm text-amber-300">Descrição</h4>
                                <p className="text-sm text-slate-400 font-body-serif italic">
                                    {selectedPromptDescription}
                                </p>
                            </div>

                            <div className="flex-grow flex flex-col min-h-0">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-medium text-slate-300">
                                        {selectedKey ? `Conteúdo de: ${selectedKey}` : 'Selecione um prompt'}
                                    </label>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            className="p-1 h-auto"
                                            onClick={handleUndo}
                                            disabled={!history[selectedKey] || history[selectedKey].past.length < 2}
                                            title="Desfazer (Ctrl+Z)"
                                        >
                                            <Icon name="back" className="w-5 h-5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            className="p-1 h-auto"
                                            onClick={handleRedo}
                                            disabled={!history[selectedKey] || history[selectedKey].future.length === 0}
                                            title="Refazer (Ctrl+Y / Ctrl+Shift+Z)"
                                        >
                                            <Icon name="next" className="w-5 h-5" />
                                        </Button>
                                    </div>
                                </div>
                                <EditableTextarea
                                    value={(selectedKey && localPrompts[selectedKey]?.content) || ''}
                                    onChange={(e) => handleTextChange(e.target.value)}
                                    onUndo={handleUndo}
                                    onRedo={handleRedo}
                                    isResizable
                                    className="flex-grow"
                                    disabled={!selectedKey}
                                />
                            </div>
                        </>
                    )}

                    {activeTab === 'rules' && (
                        <>
                            <p className="text-sm text-slate-400 font-body-serif -mt-2">
                                Edite as regras e a base de conhecimento do jogo. As alterações serão vetorizadas (embedadas) ao salvar.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Select
                                    label="Tópico da Regra"
                                    options={ruleOptions}
                                    value={selectedRuleTopic}
                                    onChange={setSelectedRuleTopic}
                                    disabled={ruleOptions.length === 0}
                                />
                                <div className="flex items-end">
                                    <Button variant="secondary" onClick={() => setIsNewRuleModalOpen(true)} className="w-full">
                                        <Icon name="plus" />
                                        Adicionar Nova Regra
                                    </Button>
                                </div>
                            </div>

                            <div className="flex-grow flex flex-col min-h-0">
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    {selectedRuleTopic ? `Conteúdo de: ${selectedRuleTopic}` : 'Selecione ou crie uma regra'}
                                </label>
                                <EditableTextarea
                                    value={selectedRule?.content || ''}
                                    onChange={(e) => handleRuleTextChange(e.target.value)}
                                    isResizable
                                    className="flex-grow"
                                    disabled={!selectedRuleTopic}
                                />
                            </div>
                        </>
                    )}


                    <div className="flex-shrink-0 flex justify-end items-center gap-4 pt-4 border-t border-zinc-800">
                        <span className="text-sm text-slate-500 italic">
                            {activeTab === 'prompts' ? modifiedKeys.size : modifiedRuleTopics.size} item(s) modificado(s).
                        </span>
                        <Button
                            variant="primary"
                            onClick={handleSaveChanges}
                            isLoading={isLoading}
                            disabled={(activeTab === 'prompts' && modifiedKeys.size === 0) || (activeTab === 'rules' && modifiedRuleTopics.size === 0)}
                        >
                            Salvar Alterações
                        </Button>
                    </div>
                </div>
            </Drawer>
            <Modal
                isOpen={isNewPromptModalOpen}
                onClose={() => setIsNewPromptModalOpen(false)}
                title="Adicionar Novo Prompt"
                buttons={[
                    { label: 'Cancelar', onClick: () => setIsNewPromptModalOpen(false), variant: 'secondary' },
                    { label: 'Criar Prompt', onClick: handleConfirmNewPrompt, variant: 'primary' }
                ]}
            >
                <div className="space-y-4">
                    <p className="font-body-serif">Digite uma chave única para o novo prompt (ex: `MEU_NOVO_PROMPT`) e uma breve descrição.</p>
                    <Input
                        label="Chave do Novo Prompt"
                        value={newPromptKey}
                        onChange={e => setNewPromptKey(e.target.value)}
                        placeholder="EXEMPLO_DE_CHAVE"
                        autoFocus
                    />
                     <Input
                        label="Descrição"
                        value={newPromptDescription}
                        onChange={e => setNewPromptDescription(e.target.value)}
                        placeholder="Para que este prompt é usado?"
                    />
                </div>
            </Modal>
            <Modal
                isOpen={isNewRuleModalOpen}
                onClose={() => setIsNewRuleModalOpen(false)}
                title="Adicionar Nova Regra"
                buttons={[
                    { label: 'Cancelar', onClick: () => setIsNewRuleModalOpen(false), variant: 'secondary' },
                    { label: 'Criar Regra', onClick: handleConfirmNewRule, variant: 'primary' }
                ]}
            >
                <p className="font-body-serif mb-4">Digite um tópico único e descritivo para a nova regra (ex: "Combate: Severidade de Dano").</p>
                <Input
                    label="Tópico da Nova Regra"
                    value={newRuleTopic}
                    onChange={e => setNewRuleTopic(e.target.value)}
                    placeholder="Ex: Combate: Severidade de Dano"
                    autoFocus
                />
            </Modal>
        </>
    );
};

export default ContentEditorModal;