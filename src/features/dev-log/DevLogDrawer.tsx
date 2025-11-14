import React, { useState, useMemo } from 'react';
import Drawer from '@/components/ui/Drawer';
import { useDevLogStore, LogType, DevLogEntry } from '@/store/devLogStore';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import RulesEngineTester from './components/RulesEngineTester';
import StatCard from './components/StatCard';
import LogEntryView from './components/LogEntryView';
import { useRawChatStore } from '@/store/useRawChatStore';
import RawChatTurn from './components/RawChatTurn';
import Icon from '@/components/ui/Icon';

interface DevLogDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onReplayAction?: (action: string, isOffTopic?: boolean) => void;
}

type DevLogTab = 'log' | 'rules' | 'raw';

const TAB_OPTIONS: { id: DevLogTab; label: string }[] = [
    { id: 'log', label: 'Log da Sessão' },
    { id: 'rules', label: 'Motor de Regras' },
    { id: 'raw', label: 'Modo RAW' },
];

const FILTER_LABELS: Record<LogType, string> = {
    ai: 'IA',
    db: 'DB',
    state_change: 'State',
    player_action: 'Player',
    system: 'Sistema',
};

const DevLogDrawer: React.FC<DevLogDrawerProps> = ({ isOpen, onClose, onReplayAction }) => {
    const logEntries = useDevLogStore(state => state.logEntries);
    const clearLog = useDevLogStore(state => state.clearLog);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState<Record<LogType, boolean>>({
        ai: true, db: true, state_change: true, player_action: true, system: true
    });
    const [activeTab, setActiveTab] = useState<DevLogTab>('log');

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
            <div className="flex h-full flex-col">
                <div className="flex-shrink-0 border-b border-zinc-800">
                    <div className="flex gap-4">
                        {TAB_OPTIONS.map((tab) => (
                            <button
                                key={tab.id}
                                className={`py-3 text-sm font-display uppercase tracking-wide transition-colors ${activeTab === tab.id ? 'text-amber-400 border-b-2 border-amber-400' : 'text-slate-400 hover:text-white'}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto pt-4">
                    {activeTab === 'log' && (
                        <div className="flex h-full flex-col gap-4 px-1">
                            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                                    <h3 className="text-lg font-display text-white">Resumo da Sessão</h3>
                                    <span className="text-xs uppercase tracking-wide text-slate-400">{stats.requestCount} eventos</span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
                                    <StatCard label="Eventos" value={stats.requestCount} />
                                    <StatCard label="Tokens (In)" value={stats.totalInputTokens.toLocaleString()} />
                                    <StatCard label="Tokens (Out)" value={stats.totalOutputTokens.toLocaleString()} />
                                    <StatCard label="Custo Estimado" value={`$${stats.totalEstimatedCost.toFixed(8)}`} />
                                    <StatCard label="Tempo Médio" value={`${stats.averageResponseTime} ms`} />
                                </div>
                                {Object.keys(stats.statsByTask).length > 0 && (
                                    <div className="space-y-2 rounded-xl border border-zinc-800 px-3 py-2">
                                        <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Uso por tarefa</p>
                                        <div className="text-xs text-slate-400 space-y-1 font-mono">
                                            {Object.keys(stats.statsByTask).map((task) => {
                                                const taskStats = stats.statsByTask[task];
                                                return (
                                                    <div key={task} className="flex items-center justify-between bg-zinc-900/60 rounded-lg px-2 py-1.5">
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
                            </section>

                            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
                                <div className="flex flex-wrap gap-2">
                                    {(Object.keys(FILTER_LABELS) as LogType[]).map((filterKey) => (
                                        <Button
                                            key={filterKey}
                                            size="sm"
                                            variant={filters[filterKey] ? 'secondary' : 'ghost'}
                                            onClick={() => toggleFilter(filterKey)}
                                        >
                                            {FILTER_LABELS[filterKey]}
                                        </Button>
                                    ))}
                                </div>
                                <div className="ml-auto flex items-center gap-2">
                                    <Input
                                        label=""
                                        placeholder="Buscar nos eventos..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="!p-2 text-sm min-w-[200px]"
                                    />
                                    <Button variant="ghost" size="sm" onClick={() => setFilters({ ai: true, db: true, state_change: true, player_action: true, system: true })}>
                                        Limpar filtros
                                    </Button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                                {filteredLogs.length === 0 ? (
                                    <p className="py-10 text-center text-slate-500">Nenhum evento com os filtros atuais.</p>
                                ) : (
                                    filteredLogs.map(entry => (
                                        <LogEntryView key={entry.id} entry={entry} onReplayAction={entry.type === 'player_action' && onReplayAction ? onReplayAction : undefined} />
                                    ))
                                )}
                            </div>

                            <div className="flex justify-end gap-2 border-t border-zinc-900 pt-3">
                                <Button variant="ghost" size="sm" onClick={handleExport}>Exportar Log</Button>
                                <Button variant="ghost" size="sm" onClick={clearLog} className="text-red-400 hover:bg-red-500/10">Limpar Log</Button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'rules' && <RulesEngineTester />}

                    {activeTab === 'raw' && <RawHistoryPanel />}
                </div>
            </div>
        </Drawer>
    );
};

export default DevLogDrawer;

const RawHistoryPanel: React.FC = () => {
    const history = useRawChatStore(state => state.history);
    const systemInstruction = useRawChatStore(state => state.systemInstruction);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredTurns = useMemo(() => {
        if (!searchTerm.trim()) return history;
        const needle = searchTerm.toLowerCase();
        return history.filter(turn => {
            try {
                return JSON.stringify(turn).toLowerCase().includes(needle);
            } catch {
                return false;
            }
        });
    }, [history, searchTerm]);

    return (
        <div className="flex h-full flex-col gap-4 px-1">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-lg font-display text-white">Conversa RAW</h3>
                    <span className="text-xs text-slate-500">{filteredTurns.length} turnos</span>
                </div>
                <Input
                    label=""
                    placeholder="Buscar por termos, ferramentas ou IDs..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="!p-2 text-sm"
                />
            </div>

            <div className="flex-1 overflow-y-auto pr-2">
                {systemInstruction && (
                    <div className="border-l-4 border-purple-700 bg-purple-950/20 p-3 my-2 space-y-2 rounded-xl">
                        <div className="flex items-center gap-2 text-purple-300 font-bold">
                            <Icon name="settings" className="w-5 h-5" />
                            <span>System Instruction</span>
                        </div>
                        <p className="text-slate-300 whitespace-pre-wrap text-sm font-mono">{systemInstruction}</p>
                    </div>
                )}
                {filteredTurns.length === 0 ? (
                    <p className="py-8 text-center text-slate-500">Nenhum registro encontrado para a busca atual.</p>
                ) : (
                    filteredTurns.map((turn, index) => <RawChatTurn key={`${index}-${turn.role}`} turn={turn} />)
                )}
            </div>
        </div>
    );
};
