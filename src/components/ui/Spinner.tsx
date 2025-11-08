// components/ui/Spinner.tsx
// Um componente simples de indicador de carregamento (spinner) animado.
// Usado para fornecer feedback visual ao usuário durante operações assíncronas.

import React from 'react';

const Spinner: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
    <div
        // A animação `animate-spin` é uma utilidade padrão do Tailwind CSS.
        // As bordas de cores diferentes criam o efeito de rotação visual.
        className={`animate-spin rounded-full border-2 border-slate-400 border-t-transparent ${className}`}
        role="status" // Atributo de acessibilidade para leitores de tela.
        aria-label="loading"
    >
        {/* Este span é para leitores de tela, mas é visualmente oculto. */}
        <span className="sr-only">Loading...</span>
    </div>
);

export default Spinner;
