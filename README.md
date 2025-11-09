<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1gTYhCL-L1useqniVqfBNdjld8tZDAMSQ

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Configure as variáveis em [.env.local](.env.local):
   - `VITE_GEMINI_API_KEY`
   - `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (as mesmas que você usará no Netlify)
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `TEST_SUPABASE_EMAIL` e `TEST_SUPABASE_PASSWORD` (necessárias apenas para os testes de integração; podem repetir os valores públicos quando fizer sentido)
3. Run the app:
   `npm run dev`

## Testes

- `npm test`: executa os testes unitários e de integração via Vitest (ambiente `jsdom`). Os cenários Playwright e o teste com Supabase ficam de fora por padrão.
- `npm run test:e2e`: roda os cenários E2E em Playwright, separados do Vitest.
- Para habilitar o teste de integração com Supabase, configure `SUPABASE_URL`/`VITE_SUPABASE_URL`, `SUPABASE_ANON_KEY`/`VITE_SUPABASE_ANON_KEY`, `TEST_SUPABASE_EMAIL` e `TEST_SUPABASE_PASSWORD` e garanta que o usuário informado esteja apto a autenticar.

## Design tokens Arcana e App Shell

- **Paleta:** use `bg-arcana-ink-*` para fundos escuros (700–950), `text-arcana-parchment-*` para textos claros e combine com `arcana-ember`, `arcana-aura`, `arcana-verdant` e `arcana-rose` para feedbacks (primário, info, sucesso e alerta visual). Os mesmos valores estão disponíveis como variáveis CSS (`--arcana-ink-950`, `--arcana-parchment-100`, etc.) em `src/index.css`.
- **Sombras e brilhos:** `shadow-arcana-card` cria a profundidade principal dos painéis, enquanto `shadow-arcana-glow` adiciona o brilho místico. Para estados de foco manual, aplique `shadow-arcana-focus`.
- **Tipografia:** `font-display` (Cinzel) para títulos, `font-body-serif` (Merriweather) para trechos narrativos e `font-sans` (Inter) como base. Tamanhos semânticos (`text-heading-hero`, `text-heading-xl`, `text-body-lg`, `text-body-sm`) vivem em `tailwind.config.ts`.
- **App Shell:** `AppShell` (em `src/components/layout/AppShell.tsx`) envolve `AppContent`, `ToastContainer` e `GlobalOverlays`, aplica os gradientes/grades definidos pelos tokens e garante que botões de Settings/DevLog estejam acessíveis em todas as rotas. Qualquer nova tela deve apenas renderizar seu conteúdo dentro da árvore padrão do App para herdar o shell automaticamente.

## Deploy no Netlify

1. No painel do Netlify, acesse *Site settings → Build & deploy → Environment → Environment variables*.
2. Crie as variáveis `VITE_GEMINI_API_KEY`, `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Elas serão injetadas durante o build (e expostas ao bundle, então utilize apenas chaves públicas).
3. Se você tiver funções server-side ou testes que rodem no CI, também cadastre `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `TEST_SUPABASE_EMAIL` e `TEST_SUPABASE_PASSWORD`. Essas não são expostas ao frontend.
4. Após salvar, dispare um novo deploy. O Netlify usará os valores configurados sem que você precise versioná-los.
