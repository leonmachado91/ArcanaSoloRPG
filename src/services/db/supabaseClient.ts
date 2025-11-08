// services/db/supabaseClient.ts
// Centraliza a criação da instância do cliente Supabase para ser usada em toda a aplicação.

import { createClient } from '@supabase/supabase-js';

/** URL do projeto Supabase. */
export const SUPABASE_URL = "https://xadadnpicpxdjmofkamw.supabase.co";
/** Chave anônima pública (anon key) do Supabase, segura para ser exposta no frontend. */
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhZGFkbnBpY3B4ZGptb2ZrYW13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyMTI5MzQsImV4cCI6MjA3NTc4ODkzNH0.jK5ZEOwtKaoFEvqBhtyIUkO7daSgyau_VVdyM8m5fY4";

// Validação para garantir que as credenciais do Supabase estão presentes.
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase URL and Anon Key must be provided.');
}

/** Instância do cliente Supabase, exportada para ser usada em toda a aplicação. */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);