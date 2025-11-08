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
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Testes

- `npm test`: executa os testes unitários e de integração via Vitest (ambiente `jsdom`). Os cenários Playwright e o teste com Supabase ficam de fora por padrão.
- `npm run test:e2e`: roda os cenários E2E em Playwright, separados do Vitest.
- Para habilitar o teste de integração com Supabase, configure as variáveis `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `TEST_SUPABASE_EMAIL` e `TEST_SUPABASE_PASSWORD` e garanta que o usuário informado esteja apto a autenticar.
