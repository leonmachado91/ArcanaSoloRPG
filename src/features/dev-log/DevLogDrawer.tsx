import React, { useState, useMemo } from 'react';
import Drawer from '@/components/ui/Drawer';
import { useDevLogStore, LogType, DevLogEntry } from '@/store/devLogStore';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import RulesEngineTester from './components/RulesEngineTester';
import StatCard from './components/StatCard';
import LogEntryView from './components/LogEntryView';

interface DevLogDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onReplayAction?: (action: string, isOffTopic?: boolean) => void;
}

const DevLogDrawer: React.FC<DevLogDrawerProps> = ({ isOpen, onClose, onReplayAction }) => {
    const logEntries = useDevLogStore(state => state.logEntries);
    const clearLog = useDevLogStore(state => state.clearLog);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState<Record<LogType, boolean>>({
        ai: true, db: true, state_change: true, player_action: true, system: true
    });
    const [activeTab, setActiveTab] = useState<'log' | 'rules'>('log');

    const stats = useMemo(() => {
        let totalInputTokens = 0;
        let totalOutputTokens = 0;
        let totalEstimatedCost = 0;
        let totalResponseTime = 0;
        let aiRequestCount = 0;
        const statsByTask: Record<string, { requestCount: number; totalCost: number; }> = {};

        for (const entry of logEntries) {
            if (entry.type === 'ai') {
                totalInputTokens += entry.inputTokens;
                totalOutputTokens += entry.outputTokens;
                totalEstimatedCost += entry.estimatedCost;
                totalResponseTime += entry.responseTimeMs;
                aiRequestCount++;

                if (!statsByTask[entry.taskType]) {
                    statsByTask[entry.taskType] = { requestCount: 0, totalCost: 0 };
                }
                statsByTask[entry.taskType].requestCount++;
                statsByTask[entry.taskType].totalCost += entry.estimatedCost;
            }
        }

        return {
            requestCount: logEntries.length,
            totalInputTokens,
            totalOutputTokens,
            totalEstimatedCost,
            averageResponseTime: aiRequestCount > 0 ? Math.round(totalResponseTime / aiRequestCount) : 0,
            statsByTask,
        };
    }, [logEntries]);


    const toggleFilter = (filter: LogType) => {
        setFilters(prev => ({ ...prev, [filter]: !prev[filter] }));
    };

    const filteredLogs = useMemo(() => {
        return logEntries.filter(entry => {
            if (!filters[entry.type]) return false;
            if (searchTerm) {
                try {
                    const searchableString = JSON.stringify(entry).toLowerCase();
                    return searchableString.includes(searchTerm.toLowerCase());
                } catch {
                    return false;
                }
            }
            return true;
        });
    }, [logEntries, filters, searchTerm]);

    const handleExport = () => {
        const jsonString = JSON.stringify(logEntries, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const date = new Date().toISOString();
        a.href = url;
        a.download = `arcana_devlog_${date}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <Drawer isOpen={isOpen} onClose={onClose} title="Painel do Desenvolvedor" size="large">
             <div className="flex flex-col h-full">
                <div className="flex-shrink-0 border-b border-zinc-800">
                    <button 
                        className={`py-2 px-4 font-display text-lg transition-colors ${activeTab === 'log' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-slate-400 hover:text-white'}`}
                        onClick={() => setActiveTab('log')}
                    >
                        Log da Sessão
                    </button>
                    <button 
                        className={`py-2 px-4 font-display text-lg transition-colors ${activeTab === 'rules' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-slate-400 hover:text-white'}`}
                        onClick={() => setActiveTab('rules')}
                    >
                        Motor de Regras
                    </button>
                </div>
                
                <div className="flex-grow overflow-y-auto pt-4">
                {activeTab === 'log' && (
                    <div className="flex flex-col h-full px-1">
                        <details className="flex-shrink-0 mb-4" open>
                            <summary className="text-lg font-display cursor-pointer">Resumo da Sessão</summary>
                            <div className="mt-2 p-4 bg-zinc-900/80 border border-zinc-800 rounded-lg">
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
                                    <StatCard label="Eventos" value={stats.requestCount} />
                                    <StatCard label="Tokens (In)" value={stats.totalInputTokens.toLocaleString()} />
                                    <StatCard label="Tokens (Out)" value={stats.totalOutputTokens.toLocaleString()} />
                                    <StatCard label="Custo Estimado" value={`$${stats.totalEstimatedCost.toFixed(8)}`} />
                                    <StatCard label="Tempo Médio" value={`${stats.averageResponseTime} ms`} />
                                </div>
                                {Object.keys(stats.statsByTask).length > 0 && (
                                    <div className="pt-3 border-t border-zinc-700">
                                        <h4 className="text-sm font-bold text-slate-300 mb-2">Análise por Tarefa</h4>
                                        <div className="text-xs text-slate-400 space-y-1 font-mono">
                                            {Object.keys(stats.statsByTask).map((task) => {
                                                const taskStats = stats.statsByTask[task as keyof typeof stats.statsByTask];
                                                return (
                                                    <div key={task} className="flex justify-between items-center bg-zinc-800/50 p-1.5 rounded">
                                                        <span>{task}</span>
                                                        <div className="flex gap-4">
                                                            <span>Reqs: <strong className="text-slate-200">{taskStats.requestCount}</strong></span>
                                                            <span>Custo: <strong className="text-slate-200">${taskStats.totalCost.toFixed(6)}</strong></span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </details>

                        <div className="flex flex-col sm:flex-row items-center justify-between flex-shrink-0 my-4 flex-wrap gap-4">
                            <div className="flex items-center gap-2">
                                {(['player_action', 'ai', 'db', 'state_change', 'system'] as LogType[]).map(f => (
                                    <Button key={f} onClick={() => toggleFilter(f)} variant={filters[f] ? 'secondary' : 'ghost'} className="py-1 px-3 text-xs">{f.replace('_', ' ')}</Button>
                                ))}
                            </div>
                            <div className='w-full sm:w-auto'>
                                <Input label="" placeholder="Buscar no log..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="!p-2 text-sm" />
                            </div>
                        </div>
                        
                        <div className="flex-grow overflow-y-auto space-y-2 pr-2 border-t border-zinc-800 pt-4">
                            {filteredLogs.length === 0 ? (
                                <p className="text-slate-500 text-center py-8">Nenhum evento encontrado com os filtros atuais.</p>
                            ) : (
                                filteredLogs.map(entry => (
                                    <LogEntryView key={entry.id} entry={entry} onReplayAction={entry.type === 'player_action' && onReplayAction ? onReplayAction : undefined} />
                                ))
                            )}
                        </div>

                        <div className="flex items-center justify-end flex-shrink-0 pt-4 mt-auto border-t border-zinc-800 gap-2">
                            <Button variant="ghost" onClick={handleExport} className="py-1 px-3 text-sm">Exportar Log</Button>
                            <Button variant="ghost" onClick={clearLog} className="py-1 px-3 text-sm text-red-400 hover:bg-red-500/10">Limpar Log</Button>
                        </div>
                    </div>
                 )}
                 {activeTab === 'rules' && (
                    <RulesEngineTester />
                 )}
                </div>
            </div>
        </Drawer>
    );
};

export default DevLogDrawer;