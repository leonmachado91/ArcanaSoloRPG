// features/dev-log/components/LogEntryView.tsx
import React, { useState, Fragment } from 'react';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
// FIX: The DevLogEntry type should be imported from the devLogStore, not the deprecated DevLogContext.
import { DevLogEntry } from '@/store/devLogStore';
import { MODEL_DETAILS } from '@/data/ai/models';
import DetailSection from './DetailSection';
import JsonDiff from './JsonDiff';
import MarkdownRenderer from '@/components/ui/MarkdownRenderer';

const LogEntryView: React.FC<{ entry: DevLogEntry; onReplayAction?: (action: string, isOffTopic?: boolean) => void; }> = ({ entry, onReplayAction }) => {
    const [copied, setCopied] = useState(false);

    const getIcon = (): React.ReactNode => {
        switch (entry.type) {
            case 'ai': return <Icon name="d20" className="w-5 h-5 text-sky-400" />;
            case 'db': return <Icon name="save" className="w-5 h-5 text-emerald-400" />;
            case 'player_action': return <Icon name="player" className="w-5 h-5 text-amber-400" />;
            case 'state_change': return <Icon name="star-solid" className="w-5 h-5 text-purple-400" />;
            case 'system': return <Icon name="settings" className="w-5 h-5 text-gray-400" />;
            default: return null;
        }
    };
    
    const handleCopy = () => {
        let textToCopy = '';
        if (entry.type === 'ai') {
            const friendlyModelName = MODEL_DETAILS[entry.modelUsed]?.friendlyName || entry.modelUsed;
            textToCopy = `[TAREFA: ${entry.taskType} | MODELO: ${friendlyModelName}]\n\n[SYSTEM PROMPT]\n\n${entry.systemInstruction}\n\n[PROMPT ENVIADO PARA A IA]\n\n${entry.requestPrompt}\n\n--------------------\n\n[RESPOSTA CRUA DA IA (JSON)]\n\n${entry.rawResponse}`;
        } else if (entry.type === 'db') {
             textToCopy = `[DB CALL: ${entry.functionName}]\n\n[PARAMS]\n\n${JSON.stringify(entry.params, null, 2)}\n\n--------------------\n\n[RESPONSE]\n\n${JSON.stringify(entry.response, null, 2)}`;
        } else if (entry.type === 'player_action') {
            textToCopy = `[AÇÃO DO JOGADOR ${entry.isOffTopic ? '(OFF)' : ''}]\n\n${entry.actionText}`;
        } else if (entry.type === 'state_change') {
            textToCopy = `[MUDANÇA DE ESTADO: ${entry.message}]\n\nANTES:\n${JSON.stringify(entry.stateBefore, null, 2)}\n\nDEPOIS:\n${JSON.stringify(entry.stateAfter, null, 2)}`;
        } else if (entry.type === 'system') {
            textToCopy = `[AÇÃO DO SISTEMA: ${entry.message}]\n\n${JSON.stringify(entry.payload, null, 2)}`;
        }

        navigator.clipboard.writeText(textToCopy).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };
    
    const getLogTitle = (logEntry: DevLogEntry) => {
        switch (logEntry.type) {
            case 'player_action':
                return logEntry.actionText;
            case 'state_change':
            case 'system':
                return logEntry.message;
            case 'ai':
                return logEntry.taskType;
            case 'db':
                return logEntry.functionName;
            default:
                const exhaustiveCheck: never = logEntry;
                return ((exhaustiveCheck as any)?.type || 'unknown').replace('_', ' ').toUpperCase();
        }
    };

    const renderContent = () => {
        switch (entry.type) {
            case 'ai':
                const friendlyModelName = MODEL_DETAILS[entry.modelUsed]?.friendlyName || entry.modelUsed;
                return (
                    <>
                        <div className="flex justify-between items-center flex-wrap gap-2">
                            <div className='flex items-center gap-2'>
                                <span className="text-xs bg-sky-800 px-2 py-0.5 rounded-full text-sky-300 font-semibold">{entry.taskType}</span>
                                <p className="text-xs text-slate-500 font-mono">Modelo: {friendlyModelName}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs mt-2 bg-zinc-800/50 px-3 py-1 rounded-full w-fit">
                            <span><strong className="text-slate-400">Tempo:</strong> {entry.responseTimeMs} ms</span>
                            <span><strong className="text-slate-400">In:</strong> {entry.inputTokens}</span>
                            <span><strong className="text-slate-400">Out:</strong> {entry.outputTokens}</span>
                            <span><strong className="text-slate-400">Custo:</strong> ${entry.estimatedCost.toFixed(8)}</span>
                        </div>
                        {entry.toolCalls && entry.toolCalls.length > 0 && (
                            <DetailSection title="Ciclo de Ferramentas" colorClass="text-gray-400" defaultOpen={true}>
                                {entry.toolCalls.map((call, index) => (
                                    <Fragment key={index}>
                                        <div className="border-t border-zinc-700 my-2"></div>
                                        <p className='font-bold text-sky-300'>{index + 1}. {call.name}</p>
                                        <pre className='text-amber-300/80'>Args: {JSON.stringify(call.args, null, 2)}</pre>
                                        <div className='text-emerald-300/80 mt-1'>
                                            <p className='font-sans font-bold'>Result:</p>
                                            <div className='bg-black/30 p-2 rounded-md font-sans text-slate-300'>
                                            {call.name === 'query_knowledgeBase' && typeof call.result === 'string' ? (
                                                <MarkdownRenderer>{call.result}</MarkdownRenderer>
                                            ) : (
                                                <pre className="font-mono text-xs">{JSON.stringify(call.result, null, 2)}</pre>
                                            )}
                                            </div>
                                        </div>
                                    </Fragment>
                                ))}
                            </DetailSection>
                        )}
                        <DetailSection title="System Prompt" colorClass="text-purple-400">{entry.systemInstruction}</DetailSection>
                        <DetailSection title="Prompt Enviado" colorClass="text-amber-400">{entry.requestPrompt}</DetailSection>
                        <DetailSection title="Resposta Crua" colorClass="text-cyan-400">{entry.rawResponse}</DetailSection>
                    </>
                );
            case 'db':
                return (
                    <>
                        <p className="text-sm text-slate-300 font-mono">Função: {entry.functionName}</p>
                        <div className="flex items-center gap-4 text-xs mt-2 bg-zinc-800/50 px-3 py-1 rounded-full w-fit">
                            <span><strong className="text-slate-400">Tempo:</strong> {entry.responseTimeMs} ms</span>
                        </div>
                        <DetailSection title="Parâmetros" colorClass="text-amber-400">{JSON.stringify(entry.params, null, 2)}</DetailSection>
                        <DetailSection title="Resposta" colorClass="text-cyan-400">
                            {Array.isArray(entry.response) && entry.response.length === 0
                                ? "Nenhum resultado encontrado."
                                : JSON.stringify(entry.response, null, 2)
                            }
                        </DetailSection>
                    </>
                );
            case 'state_change':
                return (
                     <>
                        {entry.stateBefore && entry.stateAfter && (
                            <DetailSection title="Diferença de Estado" colorClass="text-purple-400" defaultOpen={true}>
                                <JsonDiff before={entry.stateBefore} after={entry.stateAfter} />
                            </DetailSection>
                        )}
                    </>
                );
            case 'system':
                return (
                    <>
                        {entry.payload && (
                            <DetailSection title="Payload" colorClass="text-gray-400" defaultOpen={true}>
                                {JSON.stringify(entry.payload, null, 2)}
                            </DetailSection>
                        )}
                    </>
                );
            default: return null;
        }
    }
    
    return (
        <div className="border border-zinc-800 bg-zinc-900/50 rounded-lg p-3 transition-colors hover:border-zinc-700">
            <div className="flex justify-between items-start">
                <div className="flex-grow">
                    <div className="flex justify-between items-center gap-2">
                        <div className="flex items-center gap-2 flex-shrink min-w-0">
                            {getIcon()}
                            <p className="text-sm font-bold text-slate-300 truncate">
                                {getLogTitle(entry)}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                             {entry.type === 'player_action' && <span className={`text-xs font-bold ${entry.isOffTopic ? 'text-yellow-400' : 'text-zinc-500'}`}>{entry.isOffTopic ? 'OFF' : 'ON'}</span>}
                            <p className="text-xs text-slate-500 font-bold">[{entry.timestamp}]</p>
                            <Button variant="ghost" onClick={handleCopy} className="p-1.5 h-auto" title="Copiar Log">
                                {copied ? <Icon name="check" className="w-4 h-4 text-green-400" /> : <Icon name="copy" className="w-4 h-4" />}
                            </Button>
                        </div>
                    </div>
                    {renderContent()}
                </div>
                 {entry.type === 'player_action' && onReplayAction && (
                    <Button variant="ghost" onClick={() => onReplayAction(entry.actionText, entry.isOffTopic)} title="Reenviar Ação" className="p-2 ml-2">
                        <Icon name="next" className="w-5 h-5" />
                    </Button>
                )}
            </div>
        </div>
    );
};

export default LogEntryView;