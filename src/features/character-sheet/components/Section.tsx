// features/character-sheet/components/Section.tsx
import React from 'react';

/**
 * Section
 * [Refatoração] Componente auxiliar para padronizar os títulos das seções na ficha completa.
 */
const Section: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
    <div className={className}>
        <h3 className="font-display text-lg text-amber-400 mb-3 border-b border-zinc-800 pb-2">{title}</h3>
        {children}
    </div>
);

export default Section;