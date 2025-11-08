// services/settingsService.ts
// Este serviço existe para um propósito de arquitetura específico: permitir que outros
// serviços não-React (que não podem usar hooks como `useContext`) possam ler as
// configurações salvas no `SettingsContext`. Ele atua como uma ponte, garantindo o
// desacoplamento e a separação de responsabilidades.

import { useSettingsStore } from '../store/settingsStore';

/**
 * Obtém as configurações atuais da aplicação.
 * Esta função utiliza o método `getState()` do store Zustand para ler as
 * configurações de forma síncrona, fornecendo um ponto de acesso para
 * módulos que não são componentes React.
 * @returns O objeto de estado das configurações (`SettingsState`).
 */
export const getSettings = () => {
    return useSettingsStore.getState();
};
