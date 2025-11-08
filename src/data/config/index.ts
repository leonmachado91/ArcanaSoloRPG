// data/config/index.ts
// Este é um arquivo "barrel". Sua única função é re-exportar tudo do
// `appConfig.ts`. Isso permite que outros arquivos importem configurações
// de `data/config` em vez de `data/config/appConfig`, tornando os caminhos
// de importação mais limpos e fáceis de gerenciar.
export * from './appConfig';
