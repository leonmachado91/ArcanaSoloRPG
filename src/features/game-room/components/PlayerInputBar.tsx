// features/game-room/components/PlayerInputBar.tsx
import React, { useState, useRef, useEffect } from 'react';
import Icon from '@/components/ui/Icon';
import Toggle from '@/components/ui/Toggle';
import Textarea from '@/components/ui/Textarea';

interface PlayerInputBarProps {
    isInputDisabled: boolean;
    isOff: boolean;
    setIsOff: (isOff: boolean) => void;
    onSendMessage: (text: string, isOff: boolean) => void;
}

const PlayerInputBar: React.FC<PlayerInputBarProps> = ({
    isInputDisabled,
    isOff,
    setIsOff,
    onSendMessage,
}) => {
    const [playerInput, setPlayerInput] = useState('');
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Effect to auto-adjust the height of the textarea
    useEffect(() => {
        const textarea = inputRef.current;
        if (textarea) {
            textarea.style.height = 'auto'; // Reset height to recalculate
            const scrollHeight = textarea.scrollHeight;
            const maxHeight = 200; // Limit to prevent infinite growth
            textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
        }
    }, [playerInput]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!playerInput.trim() || isInputDisabled) return;
        onSendMessage(playerInput, isOff);
        setPlayerInput('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
        }
    };

    return (
        <div className="flex-shrink-0 border-t border-zinc-800 bg-[#121212]">
            <form onSubmit={handleSubmit} className="p-4 flex items-start gap-3">
                <Toggle labelLeft="" labelRight='OFF' checked={isOff} onChange={setIsOff} />
                <div className="relative w-full">
                    <textarea 
                        ref={inputRef}
                        rows={1}
                        placeholder={isInputDisabled ? "Aguarde..." : "Descreva sua ação..."}
                        className="w-full max-h-48 bg-zinc-800 border border-transparent focus:border-amber-500 focus:ring-0 rounded-lg py-3 pl-4 pr-14 text-slate-300 focus:outline-none transition-all disabled:opacity-50 resize-none overflow-y-auto"
                        value={playerInput}
                        onChange={(e) => setPlayerInput(e.target.value)}
                        disabled={isInputDisabled}
                        onKeyDown={handleKeyDown}
                    />
                    <button type="submit" disabled={isInputDisabled} className="absolute right-2 bottom-2 p-2 bg-amber-600 rounded-lg hover:bg-amber-500 transition-colors disabled:bg-zinc-600">
                        <Icon name="next" className="w-5 h-5 text-white" />
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PlayerInputBar;