// types/navigation.ts
// Este arquivo define os tipos relacionados ao sistema de roteamento e navegação da aplicação.

/**
 * Define todos os nomes de tela válidos na aplicação.
 * Isso garante a segurança de tipos ao navegar, prevenindo erros de digitação
 * e garantindo que apenas telas existentes possam ser acessadas.
 */
export type Screen = 'home' | 'create-campaign' | 'create-character' | 'saved-games' | 'game-room' | 'campaign-loading';
