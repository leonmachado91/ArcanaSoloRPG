// services/authService.ts
// Este serviço centraliza a autenticação simplificada do projeto. O usuário
// "loga" com um nome de aventureiro e nós garantimos que o Supabase possua
// uma conta compatível antes de gravar o nome no localStorage.

import type { AuthError } from '@supabase/supabase-js';
import { supabase } from '@/services/db/supabaseClient';
import { createAppError, isAppError } from '../types/game';

/** Chave usada para armazenar o nome de usuário no localStorage. */
const LOCAL_USERNAME_KEY = 'arcana_username';
const INVALID_LOGIN_SNIPPET = 'invalid login credentials';
const USER_ALREADY_REGISTERED_SNIPPET = 'user already registered';

const isMatchingAuthError = (error: AuthError | null, snippet: string) =>
    Boolean(error?.message?.toLowerCase().includes(snippet));

/**
 * Obtém o nome de usuário salvo localmente no localStorage.
 */
export const getLocalUsername = (): string | null => localStorage.getItem(LOCAL_USERNAME_KEY);

/**
 * Realiza o "login" local salvando o nome informado.
 */
export const signInWithUsername = (username: string) => {
    localStorage.setItem(LOCAL_USERNAME_KEY, username);
};

/**
 * Remove o nome salvo no localStorage.
 */
export const signOut = () => {
    localStorage.removeItem(LOCAL_USERNAME_KEY);
};

/**
 * Realiza login ou cadastro determinístico a partir do nome do aventureiro.
 * Para evitar o erro 422 exibido no console, tentamos logar antes de criar a conta.
 */
export const loginOrSignUpWithAdventurerName = async (name: string): Promise<void> => {
    const context = 'loginOrSignUp';
    const email = `${name.toLowerCase().replace(/\s/g, '_')}@example.com`;
    const password = `password-${name.toLowerCase()}`;

    const forceLoginOrThrow = async (friendlyMessage: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            throw createAppError('SUPABASE_ERROR', friendlyMessage, error, context);
        }
    };

    try {
        // 1. Primeiro tenta logar. Se a conta já existir evitamos o 422 no console.
        const { error: initialSignInError } = await supabase.auth.signInWithPassword({ email, password });
        if (!initialSignInError) {
            console.log(`[${context}] Login bem-sucedido para o aventureiro ${email}.`);
            return;
        }

        if (!isMatchingAuthError(initialSignInError, INVALID_LOGIN_SNIPPET)) {
            throw createAppError('SUPABASE_ERROR', 'Falha ao logar com o aventureiro informado.', initialSignInError, context);
        }

        // 2. Conta inexistente (ou senha divergente). Tenta criar a conta.
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) {
            if (isMatchingAuthError(signUpError, USER_ALREADY_REGISTERED_SNIPPET)) {
                console.log(`[${context}] Conta detectada durante o cadastro. Repetindo login.`);
                await forceLoginOrThrow('Falha ao logar com um aventureiro existente.');
                return;
            }

            throw createAppError('SUPABASE_ERROR', 'Falha ao criar uma nova conta de aventureiro.', signUpError, context);
        }

        // 3. Em alguns cenários o Supabase não inicia sessão automaticamente.
        if (!data.session) {
            await forceLoginOrThrow('Conta criada, mas não foi possível autenticar automaticamente.');
        }

        console.log(`[${context}] Nova conta criada com sucesso para ${email}.`);
    } catch (error) {
        if (isAppError(error)) throw error;
        throw createAppError('UNKNOWN_ERROR', 'Um erro inesperado ocorreu durante a autenticação.', error, context);
    }
};
