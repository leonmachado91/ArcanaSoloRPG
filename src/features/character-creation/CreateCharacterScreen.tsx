// features/character-creation/CreateCharacterScreen.tsx
// Este componente gerencia o fluxo de criação do personagem do jogador.
// Após a refatoração, ele atua como um orquestrador, gerenciando o estado do fluxo (passos)
// e a lógica do personagem, enquanto delega a renderização de cada passo
// para componentes filhos dedicados.

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useGameStore } from '@/store/useGameStore';
import ElementDisplay from '../../components/character/ElementDisplay';
import { Character } from '../../types/character';
import { calculateElements } from '../../utils/characterUtils';
import StepIndicator from '../../components/ui/StepIndicator';
import { useCatalogStore } from '@/store/catalogStore';
import CharacterBasicInfoStep from './components/CharacterBasicInfoStep';
import CharacterTraitsStep from './components/CharacterTraitsStep';
import { useNavigationStore } from '@/store/navigationStore';
import { useErrorStore } from '@/store/errorStore';
import { useAppChrome } from '@/components/layout/AppChromeContext';

/**
 * Componente `CreateCharacterScreen`
 * A tela principal para o fluxo de criação de personagem.
 */
const CreateCharacterScreen: React.FC = () => {
    const { navigate, goBack } = useNavigationStore();
    const { registerBackAction, registerPrimaryAction } = useAppChrome();
    const dispatch = useGameStore(state => state.dispatch);
    const playerCharacter = useGameStore(state => state.playerCharacter);
    const { showError } = useErrorStore();
    
    // Consome os dados de catálogo do store Zustand.
    const { traits: allTraits, groupedTraits, isLoading: isLoadingTraits, error: traitsError } = useCatalogStore();

    // Estado local para controlar o passo atual do formulário.
    const [step, setStep] = useState(1);
    const [customTrait, setCustomTrait] = useState('');
    
    // Lógica de pontos: para cada desvantagem, o jogador ganha um ponto para gastar em vantagens.
    const advantagePoints = (playerCharacter.disadvantages || []).length;
    const usedAdvantagePoints = (playerCharacter.advantages || []).length;

    // Efeito para mostrar um erro se a busca global de traits falhar.
    useEffect(() => {
        if(traitsError) {
            console.error("Falha ao carregar traits do store:", traitsError);
            showError(`Falha ao carregar Vantagens/Desvantagens: ${traitsError.message}. Verifique a base de dados nas Opções se o problema persistir.`);
        }
    }, [traitsError, showError]);
    
    /**
     * Função memoizada (`useCallback`) para atualizar o estado do personagem no GameContext.
     */
    const updatePlayerCharacter = useCallback((data: Partial<Character>) => {
        dispatch({ type: 'UPDATE_PLAYER_CHARACTER', payload: data });
    }, [dispatch]);

    /**
     * Manipulador para finalizar a criação do personagem e navegar para a tela de carregamento da campanha.
     */
    const handleFinishCreation = () => {
        navigate('campaign-loading');
    };
    
    /**
     * Adiciona ou remove uma vantagem/desvantagem, aplicando a lógica de balanceamento de pontos.
     */
    const toggleTrait = useCallback((traitName: string, type: 'advantages' | 'disadvantages') => {
        const currentList = playerCharacter[type] || [];
        const isAdding = !currentList.includes(traitName);

        if (type === 'advantages' && isAdding && usedAdvantagePoints >= advantagePoints) {
            return;
        }
        
        if (type === 'disadvantages' && !isAdding && usedAdvantagePoints > (advantagePoints - 1)) {
            showError("Remova uma vantagem primeiro para manter o equilíbrio.");
            return;
        }

        const newList = isAdding
            ? [...currentList, traitName]
            : currentList.filter(name => name !== traitName);
        updatePlayerCharacter({ [type]: newList });
    }, [playerCharacter, advantagePoints, usedAdvantagePoints, updatePlayerCharacter, showError]);
    
    /**
     * Adiciona ou remove um traço de personalidade.
     */
    const togglePersonalityTrait = (trait: string) => {
        const currentTraits = playerCharacter.personalityTraits || [];
        const newTraits = currentTraits.includes(trait)
            ? currentTraits.filter(t => t !== trait)
            : [...currentTraits, trait];
        updatePlayerCharacter({ personalityTraits: newTraits });
    };

    /**
     * Adiciona um traço de personalidade customizado.
     */
    const handleAddCustomTrait = useCallback(() => {
        const trimmedTrait = customTrait.trim();
        if (trimmedTrait && !(playerCharacter.personalityTraits || []).includes(trimmedTrait)) {
            const newTraits = [...(playerCharacter.personalityTraits || []), trimmedTrait];
            updatePlayerCharacter({ personalityTraits: newTraits });
            setCustomTrait(''); // Limpa o input após adicionar
        }
    }, [customTrait, playerCharacter.personalityTraits, updatePlayerCharacter]);

    // `useMemo` recalcula os valores dos elementos apenas quando a lista de vantagens muda.
    const elements = useMemo(() => {
        const allAdvantageTraits = allTraits.filter(t => t.type === 'advantage');
        return calculateElements(playerCharacter.advantages || [], allAdvantageTraits);
    }, [playerCharacter.advantages, allTraits]);
    
    // Efeito que sincroniza os elementos calculados com o estado global do personagem.
    useEffect(() => {
        const newElements = elements;
        if (JSON.stringify(playerCharacter.elements) !== JSON.stringify(newElements)) {
            updatePlayerCharacter({ elements: newElements });
        }
    }, [playerCharacter.advantages, playerCharacter.elements, updatePlayerCharacter, elements]);

    const totalSteps = 2;

    const backAction = useMemo(() => ({
        icon: 'back' as const,
        ariaLabel: step > 1 ? 'Voltar para o passo anterior' : 'Voltar para a criação de campanha',
        onAction: () => {
            if (step > 1) {
                setStep(prev => Math.max(1, prev - 1));
            } else {
                goBack();
            }
        },
        variant: 'ghost' as const,
    }), [step, goBack]);

    const primaryAction = useMemo(() => ({
        icon: 'next' as const,
        ariaLabel: step < totalSteps ? 'Avançar para o próximo passo' : 'Concluir criação do personagem',
        onAction: () => {
            if (step < totalSteps) {
                setStep(prev => Math.min(totalSteps, prev + 1));
            } else {
                handleFinishCreation();
            }
        },
        variant: 'primary' as const,
    }), [step, totalSteps, handleFinishCreation]);

    useEffect(() => {
        registerBackAction(backAction);
        return () => registerBackAction(null);
    }, [backAction, registerBackAction]);

    useEffect(() => {
        registerPrimaryAction(primaryAction);
        return () => registerPrimaryAction(null);
    }, [primaryAction, registerPrimaryAction]);

    return (
        <div className="min-h-screen flex flex-col p-4 sm:p-8">

            <main className="flex-grow flex flex-col items-center justify-center">
                <div className="w-full max-w-6xl pb-24">
                    <header className="text-center mb-8">
                        <h1 className="text-4xl font-display text-white">Criar Personagem</h1>
                        <p className="text-slate-400 mt-2 font-body-serif">Quem é você nesta história que se inicia?</p>
                    </header>

                    <StepIndicator currentStep={step} totalSteps={totalSteps} />

                    <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-lg p-8 min-h-[500px]">
                        {step === 1 && (
                           <CharacterBasicInfoStep 
                                character={playerCharacter}
                                onUpdate={updatePlayerCharacter}
                                onTogglePersonalityTrait={togglePersonalityTrait}
                                customTraitInput={customTrait}
                                onCustomTraitInputChange={setCustomTrait}
                                onAddCustomTrait={handleAddCustomTrait}
                           />
                        )}
                        {step === 2 && (
                            <CharacterTraitsStep
                                character={playerCharacter}
                                groupedTraits={groupedTraits}
                                isLoading={isLoadingTraits}
                                error={traitsError}
                                advantagePoints={advantagePoints}
                                usedAdvantagePoints={usedAdvantagePoints}
                                onToggleTrait={toggleTrait}
                            />
                        )}
                    </div>
                </div>
            </main>
            
            {step === 2 && (
                <div className="fixed top-1/2 right-8 -translate-y-1/2 bg-zinc-900/80 backdrop-blur-sm border border-zinc-700 rounded-lg p-6 shadow-2xl">
                    <h3 className="font-display text-center mb-4">Elementos</h3>
                    <div className="flex flex-col gap-4">
                        <ElementDisplay name="fire" value={elements.fire} />
                        <ElementDisplay name="water" value={elements.water} />
                        <ElementDisplay name="air" value={elements.air} />
                        <ElementDisplay name="earth" value={elements.earth} />
                    </div>
                </div>
            )}

        </div>
    );
};

export default CreateCharacterScreen;
