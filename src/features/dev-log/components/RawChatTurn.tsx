// features/dev-log/components/RawChatTurn.tsx
import React from 'react';
import { Content, Part } from '@google/genai';
import Icon from '@/components/ui/Icon';
import DetailSection from './DetailSection';
import MarkdownRenderer from '@/components/ui/MarkdownRenderer';

interface RawChatTurnProps {
    turn: Content;
}

const renderPart = (part: Part, index: number) => {
    if ('text' in part && part.text) {
        return <MarkdownRenderer key={index}>{part.text}</MarkdownRenderer>;
    }
    if ('functionCall' in part && part.functionCall) {
        return (
            <DetailSection key={index} title={`Chamada de Ferramenta: ${part.functionCall.name}`} colorClass="text-sky-400" defaultOpen>
                {JSON.stringify(part.functionCall.args, null, 2)}
            </DetailSection>
        );
    }
     if ('functionResponse' in part && part.functionResponse) {
        const { name, response } = part.functionResponse;
        const result = response?.result;

        // Verifica se é um resultado da busca de conhecimento e se o conteúdo é uma string
        const isKnowledgeQueryResult = name === 'query_knowledgeBase' && typeof result === 'string';

        return (
            <DetailSection key={index} title={`Resposta da Ferramenta: ${name}`} colorClass="text-emerald-400" defaultOpen>
                {isKnowledgeQueryResult ? (
                    <div className="bg-black/30 p-2 rounded-md font-sans text-slate-300">
                        <MarkdownRenderer>{result}</MarkdownRenderer>
                    </div>
                ) : (
                    // Fallback para outras ferramentas ou resultados que não são strings
                    JSON.stringify(response, null, 2)
                )}
            </DetailSection>
        );
    }
    return <p key={index} className="text-zinc-500 text-xs">[Parte desconhecida ou vazia]</p>;
};


const RawChatTurn: React.FC<RawChatTurnProps> = ({ turn }) => {
    // Verificação de segurança: Garante que o turno e sua propriedade 'parts' sejam válidos antes de renderizar.
    // Isso previne que a UI quebre caso a API da IA retorne um objeto de histórico malformado em algum caso extremo
    // (ex: resposta vazia ou bloqueada).
    if (!turn || !Array.isArray(turn.parts)) {
        return (
            <div className="border-l-4 border-red-700 bg-red-950/20 p-3 my-2 space-y-2">
                <div className="flex items-center gap-2 text-red-300 font-bold">
                    <Icon name="close" className="w-5 h-5" />
                    <span>Erro: Turno de chat malformado</span>
                </div>
                <p className="text-xs text-red-200">O sistema encontrou um registro de chat inválido. Isso pode acontecer se a resposta da IA foi vazia ou bloqueada.</p>
                <DetailSection title="Dados do Turno Inválido" colorClass="text-red-300" defaultOpen>
                    {JSON.stringify(turn, null, 2)}
                </DetailSection>
            </div>
        );
    }
    
    const isUser = turn.role === 'user';
    
    const { icon, color, bgColor, name } = isUser 
        ? { icon: <Icon name="player" className="w-5 h-5" />, color: 'border-amber-700', bgColor: 'bg-amber-900/20', name: 'User' }
        : { icon: <Icon name="d20" className="w-5 h-5" />, color: 'border-sky-800', bgColor: 'bg-sky-950/20', name: 'Model' };

    return (
        <div className={`border-l-4 ${color} ${bgColor} p-3 my-2 space-y-2`}>
            <div className="flex items-center gap-2 text-slate-400 font-bold">
                {icon}
                <span>{name}</span>
            </div>
            {turn.parts.map(renderPart)}
        </div>
    );
};

export default RawChatTurn;