// store/authStore.ts
import { create } from 'zustand';
import * as authService from '@/services/authService';
import { supabase } from '@/services/db/supabaseClient';
import { createAppError } from '@/types/game';

interface AuthState {
    username: string | null;
    isLoading: boolean;
    isLoggedIn: boolean;
}

interface AuthActions {
    signIn: (name: string) => Promise<void>;
    signOut: () => Promise<void>;
    checkUserSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
    username: null,
    isLoading: true,
    isLoggedIn: false,

    checkUserSession: async () => {
        set({ isLoading: true });
        try {
            const storedUsername = authService.getLocalUsername();
            if (storedUsername) {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    set({ username: storedUsername, isLoggedIn: true });
                } else {
                    authService.signOut();
                    set({ username: null, isLoggedIn: false });
                }
            }
        } catch (error) {
            console.error("Failed to check user session:", error);
            set({ username: null, isLoggedIn: false });
        } finally {
            set({ isLoading: false });
        }
    },

    signIn: async (name: string) => {
        set({ isLoading: true });
        const context = 'authStore.signIn';
        try {
            await authService.loginOrSignUpWithAdventurerName(name);
            authService.signInWithUsername(name);
            set({ username: name, isLoggedIn: true, isLoading: false });
        } catch (error) {
            console.error(`[${context}] Error:`, error);
            set({ isLoading: false });
            // Re-throw the error so the UI component can catch it and show a toast
            throw error;
        }
    },

    signOut: async () => {
        await supabase.auth.signOut();
        authService.signOut();
        set({ username: null, isLoggedIn: false });
    },
}));
