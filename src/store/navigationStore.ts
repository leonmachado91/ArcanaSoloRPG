// store/navigationStore.ts
import { create } from 'zustand';
import { Screen } from '@/types/navigation';

interface NavigationState {
    history: Screen[];
}

interface NavigationActions {
    navigate: (screen: Screen, options?: { replace?: boolean }) => void;
    goBack: () => void;
    goHome: () => void;
}

export const useNavigationStore = create<NavigationState & NavigationActions>((set, get) => ({
    history: ['home'],

    navigate: (newScreen, options) => {
        const currentScreen = get().history[get().history.length - 1];
        if (newScreen === currentScreen && !options?.replace) return;

        set(state => {
            if (options?.replace) {
                const newHistory = [...state.history];
                newHistory[newHistory.length - 1] = newScreen;
                return { history: newHistory };
            }
            return { history: [...state.history, newScreen] };
        });
    },

    goBack: () => {
        if (get().history.length > 1) {
            set(state => ({ history: state.history.slice(0, -1) }));
        }
    },

    goHome: () => {
        set({ history: ['home'] });
    },
}));
