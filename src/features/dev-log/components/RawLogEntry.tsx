// features/dev-log/components/RawLogEntry.tsx
import React, { Fragment } from 'react';
import Icon from '@/components/ui/Icon';
import { DevLogEntry } from '@/store/devLogStore';
import { MODEL_DETAILS } from '@/data/ai/models';
import DetailSection from './DetailSection';

const RawLogEntry: React.FC<{ entry: DevLogEntry }> = ({ entry }) => {
    
    const getIconAndColor = (): { icon: React.ReactNode, color: string } => {
        switch (entry.type) {
            case 'ai': return { icon: <Icon name="d20" className="w-5 h-5" />, color: 'border-sky-800' };
            case 'player_action': return { icon: <Icon name="player" className="w-5 h-5" />, color: 'border-amber-800' };
            case 'system': return { icon: <Icon name="settings" className="w-5 h-5" />, color: 'border-gray-700' };
            default: return { icon: null, color: 'border-zinc-800' };
        }
    };
    
    const getLogTitle = (logEntry: DevLogEntry) => {
        switch (logEntry.type) {
            case 'player_action':
                return logEntry.actionText;
            case 'system':
                return logEntry.message;
            case 'ai':
                return `[IA] ${logEntry.taskType}`;
            default:
                return ((logEntry as any)?.type || 'unknown').replace('_', ' ').toUpperCase();
        }
    };

    const renderContent = () => {
        switch (entry.type) {
            case 'ai':
                const friendlyModelName = MODEL_DETAILS[entry.modelUsed]?.friendlyName || entry.modelUsed;
                return (
                    <div className="text-xs text-slate-400 space-y-2">
                        <div className="flex items-center gap-4 bg-zinc-800/50 px-3 py-1 rounded-full w-fit">
                            <span>{friendlyModelName}</span>
                            <span>{entry.responseTimeMs} ms</span>
                            <span>${entry.estimatedCost.toFixed(6)}</span>
                        </div>
                        {entry.toolCalls && entry.toolCalls.length > 0 && (
                            <DetailSection title="Ciclo de Ferramentas" colorClass="text-gray-400">
                                {entry.toolCalls.map((call, index) => (
                                    <Fragment key={index}>
                                        <div className="border-t border-zinc-700 my-2"></div>
                                        <p className='font-bold text-sky-300'>{index + 1}. {call.name}</p>
                                        <pre className='text-amber-300/80'>Args: {JSON.stringify(call.args, null, 2)}</pre>
                                        <pre className='text-emerald-300/80'>Result: {JSON.stringify(call.result, null, 2)}</pre>
                                    </Fragment>
                                ))}
                            </DetailSection>
                        )}
                        <DetailSection title="System Prompt" colorClass="text-purple-400">{entry.systemInstruction}</DetailSection>
                        <DetailSection title="Prompt Enviado" colorClass="text-amber-400">{entry.requestPrompt}</DetailSection>
                        <DetailSection title="Resposta Crua" colorClass="text-cyan-400">{entry.rawResponse}</DetailSection>
                    </div>
                );
            case 'system':
                 return (
                    <>
                        {entry.payload && (
                            <DetailSection title="Payload" colorClass="text-gray-400">
                                {JSON.stringify(entry.payload, null, 2)}
                            </DetailSection>
                        )}
                    </>
                );
            default: return <p className="text-slate-300 font-mono text-sm">{getLogTitle(entry)}</p>;
        }
    };
    
    const { icon, color } = getIconAndColor();

    return (
        <div className={`border-l-4 ${color} bg-zinc-900/50 p-3 my-4`}>
            <div className="flex justify-between items-center gap-2 mb-2">
                <div className="flex items-center gap-2 text-slate-300">
                    {icon}
                    <p className="font-bold text-sm truncate">{getLogTitle(entry)}</p>
                </div>
                 <p className="text-xs text-slate-500 font-bold flex-shrink-0">[{entry.timestamp}]</p>
            </div>
            {renderContent()}
        </div>
    );
};

export default RawLogEntry;