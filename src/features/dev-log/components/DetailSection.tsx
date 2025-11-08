import React from 'react';

const DetailSection: React.FC<{ title: string; children: React.ReactNode; colorClass?: string; defaultOpen?: boolean }> = ({ title, children, colorClass = 'text-slate-300', defaultOpen = false }) => (
    <details className="mt-2" open={defaultOpen}>
        <summary className={`font-bold text-sm cursor-pointer ${colorClass} hover:opacity-80 transition-opacity`}>
            {title}
        </summary>
        <div className="bg-black/50 p-3 mt-2 rounded-md text-xs whitespace-pre-wrap overflow-x-auto font-mono">
            <code>{children}</code>
        </div>
    </details>
);

export default DetailSection;
