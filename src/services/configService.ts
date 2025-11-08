// services/configService.ts
// Este serviço simples atua como um ponto de acesso centralizado para as configurações
// da aplicação definidas em `data/config/appConfig.ts`. Sua principal vantagem é
// abstrair a localização do arquivo de configuração, permitindo que qualquer parte
// do código (incluindo outros serviços não-React) acesse as configurações de forma consistente.

import { appConfig, AppConfig } from '../data/config';

/**
 * Retorna o objeto de configuração completo do aplicativo.
 * Use esta função em qualquer lugar do código para acessar parâmetros de configuração
 * como modelos de IA padrão, durações de UI, etc.
 * @returns O objeto de configuração `AppConfig`.
 */
export const getConfig = (): AppConfig => {
    return appConfig;
};
