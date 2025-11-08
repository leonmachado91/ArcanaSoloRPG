// index.tsx
// Este é o ponto de entrada principal (entry point) da aplicação React.
// Sua responsabilidade é encontrar o elemento 'root' no index.html e renderizar
// o componente principal da aplicação, `App`, dentro dele.

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Busca o elemento principal no DOM onde a aplicação será montada.
const rootElement = document.getElementById('root');
if (!rootElement) {
  // Lança um erro claro se o elemento 'root' não for encontrado,
  // o que geralmente indica um problema na configuração do index.html.
  throw new Error("Elemento 'root' não encontrado no DOM.");
}

// Cria a raiz da aplicação React usando a nova API do React 18.
const root = ReactDOM.createRoot(rootElement);

// Renderiza o componente `App` dentro do modo estrito do React (`React.StrictMode`),
// que ajuda a identificar potenciais problemas na aplicação durante o desenvolvimento.
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
