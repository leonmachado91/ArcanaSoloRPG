// e2e/full-lifecycle.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Full Campaign Lifecycle', () => {
  // Usa um título único para cada execução do teste para evitar colisões de dados.
  const campaignTitle = `Teste E2E - ${Date.now()}`;
  const characterName = 'Herói de Teste';

  test('deve permitir que um usuário crie, salve, liste, carregue e valide uma campanha', async ({ page }) => {
    // 1. Tela de Boas-Vindas
    await page.goto('/');
    await page.getByLabel('Nome de Aventureiro').fill('Aventureiro E2E');
    await page.getByRole('button', { name: 'Entrar no Mundo' }).click();
    await expect(page).toHaveURL('/#home');

    // 2. Tela Inicial e Início da Criação
    await page.getByRole('button', { name: 'Iniciar Nova Campanha' }).click();
    await expect(page).toHaveURL('/#create-campaign');

    // 3. Criação da Campanha
    await page.getByLabel('Título da Campanha').fill(campaignTitle);
    await page.getByLabel('Gênero da Campanha').fill('Fantasia Épica');
    await page.getByLabel('Adjetivo ao Mundo').fill('Misterioso');
    await page.getByLabel('Local').fill('Floresta Ancestral');
    await page.getByLabel('Época').fill('Era dos Dragões');
    await page.getByRole('button', { name: 'Próximo' }).click(); // Avança para o passo 2
    await page.getByLabel('Declaração 1').fill('A magia está desaparecendo do mundo.');
    await page.getByRole('button', { name: 'Concluir e Criar Personagem' }).click();
    await expect(page).toHaveURL('/#create-character');

    // 4. Criação do Personagem
    await page.getByLabel('Nome do Personagem').fill(characterName);
    await page.getByLabel('Idade').fill('25');
    await page.getByRole('button', { name: 'Próximo' }).click(); // Avança para o passo 2
    // Seleciona uma vantagem e uma desvantagem para balancear os pontos
    await page.getByRole('button', { name: 'Corpo de Ferro' }).click(); 
    await page.getByRole('button', { name: 'Azarado' }).click(); 
    await page.getByRole('button', { name: 'Concluir' }).click();
    
    // 5. Carregamento e Validação na Sala de Jogo
    await expect(page).toHaveURL('/#campaign-loading', { timeout: 10000 });
    // Aguarda o processo de salvamento/carregamento e a navegação para a sala de jogo
    await expect(page).toHaveURL('/#game-room', { timeout: 20000 });
    await expect(page.getByRole('heading', { name: campaignTitle })).toBeVisible();

    // 6. Sair e Navegar para Campanhas Salvas
    await page.getByRole('button', { name: 'Sair para o Menu' }).click();
    await page.getByRole('button', { name: 'Sair' }).click(); // Confirma no modal
    await expect(page).toHaveURL('/#home');
    await page.getByRole('button', { name: 'Campanhas Salvas' }).click();
    await expect(page).toHaveURL('/#saved-games');
    
    // 7. Encontrar e Carregar o Jogo Salvo
    // Localiza o card da campanha pelo título único.
    const campaignCard = page.locator('div', { hasText: campaignTitle }).first();
    await expect(campaignCard).toBeVisible();
    await campaignCard.getByRole('button', { name: 'Carregar' }).click();

    // 8. Validação Final na Sala de Jogo
    await expect(page).toHaveURL('/#game-room', { timeout: 10000 });
    await expect(page.getByRole('heading', { name: campaignTitle })).toBeVisible();
    // Verifica se o nome do personagem também está visível para confirmar que o estado foi carregado corretamente.
    await expect(page.getByRole('heading', { name: characterName })).toBeVisible();
  });
});
