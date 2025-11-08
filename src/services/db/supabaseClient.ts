// services/db/supabaseClient.ts
// Centraliza a criação da instância do cliente Supabase para ser usada em toda a aplicação.

import { createClient } from '@supabase/supabase-js';

const getNodeEnvVar = (key: 'SUPABASE_URL' | 'SUPABASE_ANON_KEY'): string | undefined => {
    if (typeof process !== 'undefined' && process.env) {
        return process.env[key];
    }
    return undefined;
};

/**
 * Prefere as variáveis públicas usadas pelo Vite (expostas para o frontend),
 * mas aceita um fallback para `process.env` para facilitar testes/integrations.
 */
const resolvedSupabaseUrl = import.meta.env?.VITE_SUPABASE_URL ?? getNodeEnvVar('SUPABASE_URL');
const resolvedSupabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY ?? getNodeEnvVar('SUPABASE_ANON_KEY');

if (!resolvedSupabaseUrl || !resolvedSupabaseAnonKey) {
    throw new Error('Supabase URL and Anon Key must be provided via environment variables.');
}

/** URL do projeto Supabase. */
export const SUPABASE_URL = resolvedSupabaseUrl;

/** Instância do cliente Supabase, exportada para ser usada em toda a aplicação. */
export const supabase = createClient(resolvedSupabaseUrl, resolvedSupabaseAnonKey);
