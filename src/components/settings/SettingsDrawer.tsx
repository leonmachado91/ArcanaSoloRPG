// components/settings/SettingsDrawer.tsx
// Este componente renderiza o painel lateral (drawer) de configurações da aplicação.
// Ele permite que o usuário personalize opções de acessibilidade, modelos de IA,
// e acesse funcionalidades de administração como a atualização da base de conhecimento.

import React, { useState } from 'react';
import Drawer from '../ui/Drawer';
import Button from '../ui/Button';
import Select from '../ui/Select';
import Toggle from '../ui/Toggle';
import { useSettingsStore } from '../../store/settingsStore';
import { AI_MODEL_CONFIG, AiTask, MODEL_DETAILS } from '../../data/ai/models';
import { VOICES } from '../../data/ai/voices';
import { useAuthStore } from '@/store/authStore';
import ContentEditorModal from '@/features/content-editor/components/ContentEditorModal';

const SettingsDrawer: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    // `useSettingsStore` hook para ler e modificar as configurações globais.
    const { 
        aiModels, voice, isRawModeEnabled,
        setAiModel, setVoice, setIsRawModeEnabled 
    } = useSettingsStore();
    
    // `useAuthStore` para acessar os dados do usuário e a função de logout.
    const { username, signOut } = useAuthStore();

    const [isContentEditorOpen, setIsContentEditorOpen] = useState(false);
    
    /**
     * Manipula a ação de sair, chamando a função do authStore e fechando o drawer.
     */
    const handleSignOut = () => {
        signOut();
        onClose();
    };

    // Filtra as tarefas de IA que são relevantes para modelos de texto e imagem.
    const textAndImageTasks: AiTask[] = ['initialGeneration', 'fullGeneration', 'gameMaster'];
    
    // Prepara as opções para os seletores de voz e modelo de áudio.
    const voiceOptions = VOICES.map(v => ({ value: v.name, label: v.label }));
    const audioModelOptions = AI_MODEL_CONFIG.audioGeneration.available.map(modelKey => ({
        value: modelKey,
        label: MODEL_DETAILS[modelKey]?.friendlyName || modelKey
    }));

    return (
        <>
            <Drawer isOpen={isOpen} onClose={onClose} title="Opções" size="xlarge">
                <div className="space-y-8">
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Seção para selecionar os modelos de IA para diferentes tarefas. */}
                        <section>
                            <h3 className="text-xl font-display text-white mb-4">Modelos de IA</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                                {textAndImageTasks.map(task => {
                                    const config = AI_MODEL_CONFIG[task];
                                    const options = config.available.map(modelKey => ({
                                        value: modelKey,
                                        label: MODEL_DETAILS[modelKey]?.friendlyName || modelKey
                                    }));

                                    return (
                                        <Select
                                            key={task}
                                            label={config.label}
                                            value={aiModels[task]}
                                            onChange={(newValue) => setAiModel(task, newValue)}
                                            options={options}
                                        />
                                    );
                                })}
                                <Select
                                    label={AI_MODEL_CONFIG.imageGeneration.label}
                                    value={aiModels.imageGeneration}
                                    onChange={(newValue) => setAiModel('imageGeneration', newValue)}
                                    options={AI_MODEL_CONFIG.imageGeneration.available.map(modelKey => ({
                                        value: modelKey,
                                        label: MODEL_DETAILS[modelKey]?.friendlyName || modelKey
                                    }))}
                                />
                            </div>
                        </section>

                        {/* Seção para selecionar a voz do narrador e o modelo de áudio. */}
                        <section>
                            <h3 className="text-xl font-display text-white mb-4">Voz do Mestre</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                                <Select
                                    label="Selecione uma voz para o Narrador"
                                    value={voice}
                                    onChange={setVoice}
                                    options={voiceOptions}
                                />
                                <Select
                                    label={AI_MODEL_CONFIG.audioGeneration.label}
                                    value={aiModels.audioGeneration}
                                    onChange={(newValue) => setAiModel('audioGeneration', newValue)}
                                    options={audioModelOptions}
                                />
                            </div>
                        </section>
                    </div>
                    
                    {/* Seção para Opções de Debugging */}
                    <section>
                        <h3 className="text-xl font-display text-white mb-4">Ferramentas de Desenvolvimento</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Modo de Chat Raw</label>
                                <p className="text-xs text-slate-500 mb-2 font-body-serif">Substitui o chat normal por um feed de eventos brutos do sistema para depuração.</p>
                                <Toggle
                                    labelLeft='Desligado'
                                    labelRight='Ligado'
                                    checked={isRawModeEnabled}
                                    onChange={setIsRawModeEnabled}
                                />
                            </div>
                             <div>
                                 <label className="block text-sm font-medium text-slate-300 mb-2">Editor de Conteúdo da IA</label>
                                 <p className="text-xs text-slate-500 mb-2 font-body-serif">Abra uma interface para editar os prompts e as regras da IA em tempo real.</p>
                                 <Button variant="secondary" onClick={() => setIsContentEditorOpen(true)}>Abrir Editor de Conteúdo</Button>
                             </div>
                        </div>
                    </section>

                    {/* Seção de Conta */}
                    <section>
                        <h3 className="text-xl font-display text-white mb-4">Conta</h3>
                        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div>
                                <p className="text-sm text-slate-400">Logado como:</p>
                                <p className="font-bold text-lg text-white">{username}</p>
                            </div>
                            <Button 
                                variant="secondary" 
                                onClick={handleSignOut} 
                                className="py-2 px-4 text-sm w-full sm:w-auto bg-red-900/50 border-red-800 hover:bg-red-800 text-red-300 active:border-red-700"
                            >
                               Sair da Conta
                            </Button>
                        </div>
                    </section>
                    
                    <div className="pt-4 border-t border-zinc-800 flex justify-end">
                        <Button variant="primary" onClick={onClose}>Fechar</Button>
                    </div>
                </div>
            </Drawer>

            {/* O modal do editor é renderizado aqui, mas controlado pelo estado deste componente. */}
            <ContentEditorModal isOpen={isContentEditorOpen} onClose={() => setIsContentEditorOpen(false)} />
        </>
    );
};

export default SettingsDrawer;