// features/home/HomeScreen.tsx
// Este componente representa a tela inicial da aplicação (a "landing page").
// Sua função é apresentar a marca "Arcana" e fornecer os pontos de entrada
// principais para o usuário: "Iniciar Nova Campanha" e "Campanhas Salvas".

import React from 'react';
import Button from '../../components/ui/Button';
import { useGameStore } from '@/store/useGameStore';
import { useNavigationStore } from '@/store/navigationStore';

const HomeScreen: React.FC = () => {
    const { navigate } = useNavigationStore();
    const dispatch = useGameStore(state => state.dispatch);

    /**
     * Manipulador para o botão "Iniciar Nova Campanha".
     * Ele despacha a ação `START_NEW_CAMPAIGN` para garantir que qualquer estado de jogo
     * anterior seja completamente limpo e, em seguida, navega para a tela de criação de campanha.
     * Isso previne que dados de um jogo anterior "vazem" para um novo.
     */
    const handleNewCampaign = () => {
        dispatch({ type: 'START_NEW_CAMPAIGN' });
        navigate('create-campaign');
    };

    return (
        <div className="relative min-h-screen flex flex-col items-center justify-center p-8 overflow-hidden">
            {/* Efeitos de Luz: Elementos decorativos para criar uma atmosfera mística. */}
            <div className="absolute top-0 left-0 w-1/2 h-1/2 rounded-full bg-amber-500/10 blur-3xl animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-1/3 h-1/3 rounded-full bg-amber-600/20 blur-3xl animate-pulse delay-500"></div>

            <main className="z-10 text-center flex flex-col items-center gap-8">
                <h1 className="text-6xl md:text-8xl font-display font-bold text-[#f5f0e1] tracking-wider"
                    style={{ textShadow: '0 0 25px rgba(212, 175, 55, 0.5)' }}>
                    ARCANA
                </h1>
                <p className="max-w-xl text-lg text-slate-300 font-body-serif">
                    Onde o destino é tirado nas cartas e cada escolha molda a sua saga.
                </p>
                <nav className="mt-8 flex flex-col sm:flex-row gap-4">
                    <Button
                        onClick={handleNewCampaign}
                    >
                        Iniciar Nova Campanha
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => navigate('saved-games')}
                    >
                        Campanhas Salvas
                    </Button>
                </nav>
            </main>

        </div>
    );
};

export default HomeScreen;
