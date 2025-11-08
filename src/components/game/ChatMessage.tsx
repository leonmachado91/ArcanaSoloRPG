// components/game/ChatMessage.tsx
// Este componente é responsável por renderizar uma única mensagem de chat.
// Ele possui lógicas de renderização distintas para mensagens do jogador, do mestre,
// e de companheiros, além de lidar com a exibição de imagens, status de "off-topic"
// e controles para geração de imagem e reprodução de áudio.

import React from 'react';
import { Message } from '../../types/chat';
import Icon from '../ui/Icon';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import { useAudioStore } from '@/store/audioStore';
import MarkdownRenderer from '../ui/MarkdownRenderer';

interface ChatMessageProps {
    /** O objeto da mensagem a ser renderizado. */
    message: Message;
    /** O ID do personagem do jogador, para identificação correta do autor. */
    playerId: string;
    /** Função de callback para solicitar a geração de uma imagem para esta mensagem. */
    onGenerateImage: (message: Message) => void;
    /** Função de callback para apagar a mensagem. */
    onDelete: (messageId: string) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, playerId, onGenerateImage, onDelete }) => {
    // Hook para controlar a reprodução de áudio.
    const { playAudio, stopAudio, isLoading, isPlaying, currentMessageId } = useAudioStore();

    // Determina o autor da mensagem para aplicar a estilização correta.
    const isPlayer = message.authorId === playerId;
    const isMaster = message.authorId === 'master';
    const isCompanion = !isPlayer && !isMaster && message.authorId !== 'system';
    const isOff = message.isOffTopic;
    
    // Verifica se o estado de carregamento/reprodução de áudio se refere a ESTA mensagem.
    const isThisMessageLoading = isLoading && currentMessageId === message.id;
    const isThisMessagePlaying = isPlaying && currentMessageId === message.id;

    /**
     * Manipula o clique no botão de áudio: toca se estiver parado, para se estiver tocando.
     */
    const handleAudioClick = () => {
        if (isThisMessagePlaying) {
            stopAudio();
        } else {
            playAudio(message);
        }
    };
    
    // =================================================================================
    // RENDERIZAÇÃO CONDICIONAL: MESTRE
    // Mensagens do mestre têm um estilo de narração centralizado e distinto.
    // =================================================================================
    if (isMaster) {
        if (isOff) {
            // Renderização para mensagens OFF-TOPIC do Mestre, estilizada como um balão de chat
            // para se assemelhar às mensagens de outros personagens.
            return (
                <div className="group relative flex items-start gap-3 max-w-2xl my-6 pr-12">
                    {/* Avatar do Mestre (ícone de d20) */}
                    <div className="w-10 h-10 rounded-full flex-shrink-0 bg-zinc-800 flex items-center justify-center border-2 border-sky-700">
                        <Icon name="d20" className="w-6 h-6 text-sky-400" />
                    </div>
                    
                    <div className="flex-1">
                        <p className="text-sm font-bold mb-1 text-left">
                            Mestre
                        </p>
                        <div className="rounded-lg p-4 bg-sky-950/70 border border-sky-800 text-sky-100">
                            <span className="font-bold text-xs uppercase opacity-70 block mb-1 tracking-wider">
                                OFF
                            </span>
                            <div className="break-words font-body-serif">
                                <MarkdownRenderer>{message.text || ''}</MarkdownRenderer>
                            </div>
                        </div>
                    </div>

                    {/* Botões de Ação, posicionados à direita no hover, como os de um companheiro. */}
                    <div className="absolute top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity right-2">
                        <Button variant="ghost" onClick={handleAudioClick} className="p-2" title="Ouvir Narração">
                            {isThisMessageLoading ? <Spinner className="w-5 h-5" /> : <Icon name={isThisMessagePlaying ? "close" : "audio"} className="w-5 h-5"/>}
                        </Button>
                        <Button variant="ghost" className="p-2 text-red-500/50 hover:text-red-500 hover:bg-red-500/10" onClick={() => onDelete(message.id)} title="Apagar Mensagem">
                            <Icon name="trash" className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            );
        }
        
        // Renderização padrão para narração normal do Mestre
        return (
            <div className="group relative max-w-3xl mx-auto my-6 text-center">
                <div className="inline-block p-4 text-slate-300">
                    <div className="break-words font-body-serif text-lg leading-relaxed">
                        <MarkdownRenderer>{message.text || ''}</MarkdownRenderer>
                    </div>
                    {/* Exibe a imagem se ela existir. */}
                    {message.imageUrl && (
                        <div className="mt-4 pt-3">
                            <img src={message.imageUrl} alt="Cena gerada pela IA" className="rounded-lg w-full h-auto object-cover max-w-md mx-auto" />
                        </div>
                    )}
                    {/* Exibe um spinner enquanto a imagem está sendo gerada. */}
                    {message.isGeneratingImage && (
                        <div className="mt-4 pt-3 flex items-center justify-center gap-2 text-slate-400">
                           <Spinner className="w-4 h-4" />
                           <span>Gerando imagem da cena...</span>
                        </div>
                    )}
                </div>
                {/* Botões de ação específicos para a narração do mestre. */}
                <div className="flex justify-center gap-2 mt-2">
                    <Button 
                        variant="ghost" 
                        onClick={() => onGenerateImage(message)}
                        disabled={!!message.imageUrl || !!message.isGeneratingImage}
                        className="p-2" 
                        title="Gerar Imagem da Cena"
                    >
                        <Icon name="image" className="w-5 h-5"/>
                    </Button>
                    <Button variant="ghost" onClick={handleAudioClick} className="p-2" title="Ouvir Narração">
                        {isThisMessageLoading ? <Spinner className="w-5 h-5" /> : <Icon name={isThisMessagePlaying ? "close" : "audio"} className="w-5 h-5"/>}
                    </Button>
                </div>
                 <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" className="p-1.5 h-auto bg-zinc-800/50 hover:bg-zinc-700/80 rounded-md" onClick={() => onDelete(message.id)} title="Apagar Mensagem">
                        <Icon name="trash" className="w-4 h-4 text-red-400/80 hover:text-red-400" />
                    </Button>
                </div>
            </div>
        );
    }

    // =================================================================================
    // RENDERIZAÇÃO CONDICIONAL: JOGADOR E COMPANHEIROS
    // Usa um layout de balão de chat padrão.
    // =================================================================================
    const companionBubbleClasses = isOff
        ? 'bg-zinc-800/60 border border-zinc-700 text-slate-400' // Estilo para mensagens "off-topic"
        : 'bg-zinc-800 rounded-tl-none text-slate-300';
        
    const playerBubbleClasses = isOff
        ? 'bg-amber-900/50 border border-amber-700 text-amber-200'
        : 'bg-amber-800 rounded-tr-none text-white';

    const bubbleClasses = isPlayer ? playerBubbleClasses : companionBubbleClasses;
    // Adiciona padding (pl-12/pr-12) para criar espaço para os botões de ação que aparecerão no hover.
    const defaultContainerClasses = `group relative flex items-start gap-3 max-w-2xl ${isPlayer ? 'ml-auto flex-row-reverse pl-12' : 'pr-12'}`;

    return (
        <div className={defaultContainerClasses}>
            {/* Avatar do autor da mensagem */}
            <div className="w-10 h-10 rounded-full flex-shrink-0 bg-zinc-800">
                {isPlayer && (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-600 border-2 border-amber-500/50">
                        {message.author?.imageUrl ? (
                            <img src={message.author.imageUrl} alt={message.authorName} className="w-full h-full object-cover rounded-full" />
                        ) : (
                            <Icon name="player" className="w-6 h-6 text-white" />
                        )}
                    </div>
                )}
                {isCompanion && (
                     <div className="w-10 h-10 rounded-full flex items-center justify-center bg-zinc-700 border-2 border-zinc-600">
                        {message.author?.imageUrl ? (
                            <img src={message.author.imageUrl} alt={message.authorName} className="w-full h-full object-cover rounded-full" />
                        ) : (
                            <Icon name="companion" className="w-6 h-6 text-slate-400" />
                        )}
                    </div>
                )}
            </div>
            
            {/* Balão de Mensagem */}
            <div className="flex-1">
                <p className={`text-sm font-bold mb-1 ${isPlayer ? 'text-right' : 'text-left'}`}>
                    {message.authorName}
                </p>
                <div className={`rounded-lg p-4 ${bubbleClasses}`}>
                    {isOff && (
                        <span className="font-bold text-xs uppercase opacity-70 block mb-1 tracking-wider">
                            OFF
                        </span>
                    )}

                    <div className="break-words font-body-serif">
                        <MarkdownRenderer>{message.text || ''}</MarkdownRenderer>
                    </div>

                    {message.imageUrl && (
                        <div className="mt-4 border-t border-white/10 pt-3">
                            <img src={message.imageUrl} alt="Cena gerada pela IA" className="rounded-lg w-full h-auto object-cover" />
                        </div>
                    )}
                    {message.isGeneratingImage && (
                        <div className="mt-4 border-t border-white/10 pt-3 flex items-center justify-center gap-2 text-slate-400">
                           <Spinner className="w-4 h-4" />
                           <span>Gerando imagem da cena...</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Botões de Ação: posicionados absolutamente dentro do padding criado no container principal. */}
            <div className={`absolute top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isPlayer ? 'left-2' : 'right-2'}`}>
                {isCompanion && (
                    <Button variant="ghost" onClick={handleAudioClick} className="p-2" title="Ouvir Narração">
                        {isThisMessageLoading ? <Spinner className="w-5 h-5" /> : <Icon name={isThisMessagePlaying ? "close" : "audio"} className="w-5 h-5"/>}
                    </Button>
                )}
                <Button variant="ghost" className="p-2 text-red-500/50 hover:text-red-500 hover:bg-red-500/10" onClick={() => onDelete(message.id)} title="Apagar Mensagem">
                    <Icon name="trash" className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
};

export default React.memo(ChatMessage);