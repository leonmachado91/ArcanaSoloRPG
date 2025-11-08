// services/authService.ts
// Este serviço gerencia a "autenticação" do usuário, que neste projeto é um sistema
// simplificado baseado em salvar um nome de usuário no localStorage. Ele também
// interage com o Supabase para verificar se um nome de usuário já existe.

import { supabase } from '@/services/db/supabaseClient';
import { createAppError, isAppError } from '../types/game';

/** Chave usada para armazenar o nome de usuário no localStorage. */
const LOCAL_USERNAME_KEY = 'arcana_username';

/**
 * Obtém o nome de usuário salvo localmente no localStorage.
 * @returns O nome de usuário, ou `null` se não houver nenhum salvo.
 */
export const getLocalUsername = (): string | null => localStorage.getItem(LOCAL_USERNAME_KEY);

/**
 * Realiza o "login" do usuário simplesmente salvando seu nome no localStorage.
 * @param username O nome de usuário a ser salvo.
 */
export const signInWithUsername = (username: string) => {
    localStorage.setItem(LOCAL_USERNAME_KEY, username);
};

/**
 * Realiza o "logout" do usuário removendo seu nome do localStorage.
 */
export const signOut = () => {
    localStorage.removeItem(LOCAL_USERNAME_KEY);
};

/**
 * Tenta logar um usuário com um nome de aventureiro. Se a conta não existir,
 * cria uma nova conta com as mesmas credenciais.
 * @param name O nome do aventureiro.
 */
export const loginOrSignUpWithAdventurerName = async (name: string): Promise<void> => {
    const context = 'loginOrSignUp';
    const email = `${name.toLowerCase().replace(/\s/g, '_')}@example.com`;
    // FIX: A senha agora é gerada a partir do nome em minúsculas para garantir consistência
    // e evitar erros de "credenciais inválidas" por diferença de maiúsculas/minúsculas.
    const password = `password-${name.toLowerCase()}`;

    try {
        // 1. Tenta criar a conta primeiro. É a forma mais atômica de verificar e criar.
        const { error: signUpError } = await supabase.auth.signUp({ email, password });

        if (signUpError) {
            // 2. Se o erro for "Usuário já registrado", sabemos que ele existe, então fazemos o login.
            if (signUpError.message.includes('User already registered')) {
                console.log(`[${context}] User already exists, proceeding to login.`);
                const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

                // Se o login ainda falhar, algo está seriamente errado.
                if (signInError) {
                    throw createAppError('SUPABASE_ERROR', 'Falha ao logar com um aventureiro existente.', signInError, context);
                }
                // Login bem-sucedido após detectar usuário existente.
                return;
            }
            
            // Se foi qualquer outro erro de cadastro, é um erro real.
            throw createAppError('SUPABASE_ERROR', 'Falha ao criar uma nova conta de aventureiro.', signUpError, context);
        }

        // 3. Se `signUpError` for nulo, o cadastro foi bem-sucedido e o Supabase já iniciou a sessão.
        // Nada mais a fazer.
    } catch (e) {
        if (isAppError(e)) throw e;
        throw createAppError('UNKNOWN_ERROR', 'Um erro inesperado ocorreu durante a autenticação.', e, context);
    }
};