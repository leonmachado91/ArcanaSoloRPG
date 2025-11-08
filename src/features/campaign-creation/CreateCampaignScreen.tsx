// features/campaign-creation/CreateCampaignScreen.tsx
// Este componente gerencia o fluxo de criação de uma nova campanha.
// É um formulário de múltiplos passos que coleta os parâmetros básicos do mundo
// (título, gênero, etc.) e as "declarações" que o definirão.

import React, { useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import Icon from '../../components/ui/Icon';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import NumberStepper from '../../components/ui/NumberStepper';
import { Campaign } from '../../types/campaign';
import StepIndicator from '../../components/ui/StepIndicator';
import { useNavigationStore } from '@/store/navigationStore';
import { useErrorStore } from '@/store/errorStore';
import * as draftGeneratorService from '@/services/ai/draftGeneratorService';
import { formatErrorForDisplay } from '@/types/game';

/**
 * Componente `CreateCampaignScreen`
 * A tela principal para o fluxo de criação de campanha.
 */
const CreateCampaignScreen: React.FC = () => {
    const { navigate, goBack } = useNavigationStore();
    const dispatch = useGameStore(state => state.dispatch);
    const campaign = useGameStore(state => state.campaign);
    const playerCharacter = useGameStore(state => state.playerCharacter);
    const { showError } = useErrorStore();
    
    // Estado local para controlar o passo atual do formulário.
    const [step, setStep] = useState(1);
    // Estado local para feedback de carregamento do botão "Gerar Rascunho".
    const [isGenerating, setIsGenerating] = useState(false);

    /**
     * Atualiza o estado da campanha no `GameContext`.
     * Esta função é passada para os componentes de input para manter o estado global sincronizado.
     * @param data Um objeto parcial com os dados da campanha a serem atualizados.
     */
    const updateCampaign = (data: Partial<Campaign>) => {
        dispatch({ type: 'UPDATE_CAMPAIGN', payload: data });
    };

    /**
     * Manipulador para o botão "Gerar Rascunho".
     * Invoca o serviço de IA para preencher os campos do formulário com sugestões.
     */
    const handleGenerateAll = async () => {
        setIsGenerating(true);
        try {
            const draftData = await draftGeneratorService.generateDraft(campaign, playerCharacter);
            dispatch({ type: 'POPULATE_FORM_DATA', payload: draftData });
        } catch (error) {
            const errorMessage = formatErrorForDisplay(error, "Falha ao gerar o rascunho.");
            showError(errorMessage);
        } finally {
            setIsGenerating(false);
        }
    };

    // Lógica para gerenciar o estado dinâmico das "declarações" sobre o mundo.
    const declarations = campaign.declarations || [''];
    const addDeclaration = () => updateCampaign({ declarations: [...declarations, ''] });
    const handleDeclarationChange = (index: number, value: string) => {
        const newDeclarations = [...declarations];
        newDeclarations[index] = value;
        updateCampaign({ declarations: newDeclarations });
    };

    const totalSteps = 2;

    return (
        <div className="min-h-screen flex flex-col p-4 sm:p-8">
            <header className="flex-shrink-0">
                <Button variant="ghost" onClick={() => (step > 1 ? setStep(step - 1) : goBack())} className="p-2 -ml-2">
                    <Icon name="back" className="w-7 h-7" />
                </Button>
            </header>

            <main className="flex-grow flex flex-col items-center justify-center">
                <div className="w-full max-w-2xl pb-24">
                    <header className="text-center mb-8">
                        <h1 className="text-4xl font-display text-white">Criar Nova Campanha</h1>
                        <p className="text-slate-400 mt-2 font-body-serif">Dê forma ao mundo onde sua história irá acontecer.</p>
                    </header>

                    <StepIndicator currentStep={step} totalSteps={totalSteps} />

                    <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-lg p-8">
                        {/* Passo 1: Coleta dos parâmetros principais do mundo. */}
                        {step === 1 && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-xl font-bold font-display">Passo 1: Parâmetros do Mundo</h2>
                                    <Button variant="secondary" onClick={handleGenerateAll} isLoading={isGenerating}>
                                         <Icon name="generate-ai" className='w-5 h-5' />
                                         Gerar Rascunho
                                     </Button>
                                </div>
                                <Input label="Título da Campanha" placeholder="Ex: A Sombra de Crimson Peak" value={campaign.title || ''} onChange={e => updateCampaign({ title: e.target.value })} />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Input label="Gênero da Campanha" placeholder="Ex: Fantasia Sombria" value={campaign.genre || ''} onChange={e => updateCampaign({ genre: e.target.value })} />
                                    <Input label="Adjetivo ao Mundo" placeholder="Ex: Fragmentado" value={campaign.worldAdjective || ''} onChange={e => updateCampaign({ worldAdjective: e.target.value })} />
                                    <Input label="Local" placeholder="Ex: Cidade Flutuante" value={campaign.location || ''} onChange={e => updateCampaign({ location: e.target.value })} />
                                    <Input label="Época" placeholder="Ex: Era da Magia" value={campaign.era || ''} onChange={e => updateCampaign({ era: e.target.value })} />
                                </div>
                                 <div className="pt-2">
                                    <NumberStepper 
                                        label="Companheiros"
                                        value={campaign.companionCount ?? 0}
                                        onChange={(newValue) => updateCampaign({ companionCount: newValue })}
                                        min={0}
                                        max={5}
                                    />
                                </div>
                            </div>
                        )}
                        {/* Passo 2: Coleta de declarações (verdades) sobre o mundo. */}
                        {step === 2 && (
                             <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-xl font-bold font-display">Passo 2: Declarações sobre o Mundo</h2>
                                </div>
                                {declarations.map((declaration, index) => (
                                    <Textarea 
                                        key={index} 
                                        label={`Declaração ${index + 1}`}
                                        placeholder={`Escreva uma verdade sobre o mundo...`}
                                        value={declaration}
                                        onChange={e => handleDeclarationChange(index, e.target.value)}
                                        isResizable
                                    />
                                ))}
                                <Button variant="secondary" onClick={addDeclaration} className="w-full">
                                    <Icon name="plus"/>
                                    Adicionar Declaração
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </main>
            
            {/* Botão flutuante para avançar para o próximo passo ou para a criação de personagem. */}
            <button
                onClick={() => (step < totalSteps ? setStep(step + 1) : navigate('create-character'))}
                className="fixed bottom-8 right-8 z-20 w-16 h-16 bg-amber-600 text-white rounded-full shadow-2xl flex items-center justify-center transform transition-all duration-300 ease-in-out hover:bg-amber-500 hover:scale-110 active:scale-100"
                aria-label={step < totalSteps ? 'Próximo' : 'Concluir e Criar Personagem'}
            >
                <Icon name="next" className="w-8 h-8" />
            </button>
        </div>
    );
};

export default CreateCampaignScreen;