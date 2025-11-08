// App.tsx
// Este é o componente raiz da aplicação. Sua principal responsabilidade é
// configurar todos os provedores de contexto globais e rotear para a tela apropriada
// com base no estado de navegação e autenticação.

import React, { useEffect } from 'react';
import HomeScreen from './features/home/HomeScreen';
import CreateCampaignScreen from './features/campaign-creation/CreateCampaignScreen';
import CreateCharacterScreen from './features/character-creation/CreateCharacterScreen';
import GameRoomScreen from './features/game-room/GameRoomScreen';
import SavedGamesScreen from './features/saved-games/SavedGamesScreen';
import ToastContainer from './components/ui/ToastContainer';
import CampaignLoadingScreen from './features/campaign-creation/CampaignLoadingScreen';
import GlobalOverlays from './components/ui/GlobalOverlays';
import WelcomeScreen from './features/welcome/WelcomeScreen';
import Spinner from './components/ui/Spinner';
import { useAuthStore } from './store/authStore';
import { useSettingsStore } from './store/settingsStore';
import { useCatalogStore } from './store/catalogStore';
import { useNavigationStore } from './store/navigationStore';

/**
 * AppRouter
 * Componente responsável por renderizar a tela correta com base no estado de navegação.
 * Ele utiliza o `useNavigationStore` para obter a tela atual e um `switch` para
 * determinar qual componente de tela deve ser exibido.
 */
const AppRouter: React.FC = () => {
    const history = useNavigationStore(state => state.history);
    const screen = history[history.length - 1];

    switch (screen) {
        case 'home':
            return <HomeScreen />;
        case 'create-campaign':
            return <CreateCampaignScreen />;
        case 'create-character':
            return <CreateCharacterScreen />;
        case 'saved-games':
            return <SavedGamesScreen />;
        case 'game-room':
            return <GameRoomScreen />;
        case 'campaign-loading':
            return <CampaignLoadingScreen />;
        default:
            return <HomeScreen />;
    }
};

/**
 * AppContent
 * Este componente decide qual fluxo principal renderizar: a tela de boas-vindas para
 * usuários não autenticados ou o roteador principal do aplicativo para usuários logados.
 * Também exibe um spinner global enquanto o estado de autenticação está sendo verificado.
 */
const AppContent: React.FC = () => {
    const { isLoggedIn, isLoading } = useAuthStore();

    // Mostra um spinner de carregamento enquanto o estado de autenticação é verificado
    // para evitar um piscar da tela de login.
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Spinner className="w-12 h-12" />
            </div>
        );
    }

    // Se o usuário não estiver logado, mostra a tela de boas-vindas para entrada do nome.
    if (!isLoggedIn) {
        return <WelcomeScreen />;
    }

    // Se o usuário estiver logado, renderiza o roteador principal do aplicativo.
    return <AppRouter />;
};

/**
 * App (Componente Raiz)
 * A estrutura foi simplificada para remover todos os provedores de Contexto.
 * A inicialização dos stores e a aplicação de efeitos de UI são gerenciados aqui.
 */
const App: React.FC = () => {
    // Inicializa a verificação da sessão do usuário e a busca dos catálogos na montagem do App.
    useEffect(() => {
        useAuthStore.getState().checkUserSession();
        useCatalogStore.getState().fetchCatalogs();
    }, []);

    // Subscreve às mudanças do `settingsStore` para aplicar efeitos colaterais no DOM.
    useEffect(() => {
        const unsubscribe = useSettingsStore.subscribe(
            (settings) => {
                const root = document.documentElement;
                
                root.classList.remove('text-sm', 'text-base', 'text-lg');
                if (settings.fontSize === 'small') root.classList.add('text-sm');
                else if (settings.fontSize === 'large') root.classList.add('text-lg');
                else root.classList.add('text-base');

                if (settings.highContrast) {
                    root.classList.add('high-contrast');
                } else {
                    root.classList.remove('high-contrast');
                }
            }
        );
        // Aplica o estado inicial na primeira renderização.
        const initialSettings = useSettingsStore.getState();
        const root = document.documentElement;
        root.classList.add(initialSettings.fontSize === 'small' ? 'text-sm' : initialSettings.fontSize === 'large' ? 'text-lg' : 'text-base');
        if (initialSettings.highContrast) root.classList.add('high-contrast');
        
        return unsubscribe;
    }, []);


    return (
        <div className="min-h-screen">
            <AppContent />
            {/* Componentes de sobreposição global que precisam estar fora do fluxo de roteamento */}
            <ToastContainer />
            <GlobalOverlays />
        </div>
    );
};

export default App;
