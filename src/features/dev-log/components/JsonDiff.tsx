import React from 'react';

const JsonDiff: React.FC<{ before: any, after: any }> = ({ before, after }) => {
    // Se não houver dados, retorna uma mensagem padrão.
    if (typeof before !== 'object' || before === null || typeof after !== 'object' || after === null) {
        return <div className="text-zinc-500">Dados de diff indisponíveis.</div>;
    }
    
    const allKeys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
    const changes: React.ReactNode[] = [];

    allKeys.sort().forEach(key => {
        const beforeValStr = JSON.stringify(before[key], null, 2);
        const afterValStr = JSON.stringify(after[key], null, 2);

        if (!before.hasOwnProperty(key)) {
            changes.push(<div key={key} className="text-green-400">+ {key}: {afterValStr}</div>);
        } else if (!after.hasOwnProperty(key)) {
            changes.push(<div key={key} className="text-red-400">- {key}: {beforeValStr}</div>);
        } else if (beforeValStr !== afterValStr) {
            changes.push(
                <div key={key} className="text-yellow-400">
                    <span className="text-red-400/70">~ {key}: {beforeValStr}</span>
                    <br />
                    <span className="pl-4">➔ {afterValStr}</span>
                </div>
            );
        }
    });

    if (changes.length === 0) {
        return <div className="text-zinc-500">Nenhuma mudança de estado detectada para este objeto.</div>;
    }

    return <>{changes}</>;
};

export default JsonDiff;
