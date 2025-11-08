import React from 'react';

const StatCard: React.FC<{ label: string; value: string | number; className?: string }> = ({ label, value, className }) => (
    <div className={`text-center p-2 bg-zinc-900 rounded-md ${className}`}>
        <span className="block text-xs text-slate-400 uppercase tracking-wider">{label}</span>
        <span className="block text-lg font-bold text-amber-400">{value}</span>
    </div>
);

export default StatCard;
