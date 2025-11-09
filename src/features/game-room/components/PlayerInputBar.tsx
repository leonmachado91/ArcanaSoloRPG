// features/game-room/components/PlayerInputBar.tsx
import React, { useState, useRef, useEffect } from 'react';
import Icon from '@/components/ui/Icon';

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
            <form onSubmit={handleSubmit} className="p-4 flex items-center gap-3">
                <div
                    className={`flex w-full items-center gap-3 rounded-3xl border px-4 py-2 transition-colors focus-within:border-amber-400 focus-within:ring-1 focus-within:ring-amber-400/50 ${
                        isOff
                            ? 'border-amber-400/70 bg-amber-900/15 shadow-[0_0_12px_rgba(251,191,36,0.25)]'
                            : 'border-zinc-800 bg-zinc-900/70'
                    }`}
                >
                    <button
                        type="button"
                        onClick={() => setIsOff(!isOff)}
                        aria-pressed={isOff}
                        title="Alternar modo OFF"
                        className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-transparent transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/80"
                    >
                        <Icon
                            name="sword"
                            className={`w-5 h-5 ${isOff ? 'text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.45)]' : 'text-slate-400'}`}
                        />
                    </button>
                    <textarea
                        ref={inputRef}
                        rows={1}
                        placeholder={isInputDisabled ? 'Aguarde...' : 'Descreva sua ação...'}
                        className="flex-1 max-h-48 bg-transparent text-slate-300 placeholder:text-slate-500 focus:outline-none disabled:opacity-50 resize-none leading-relaxed py-2"
                        value={playerInput}
                        onChange={(e) => setPlayerInput(e.target.value)}
                        disabled={isInputDisabled}
                        onKeyDown={handleKeyDown}
                    />
                </div>
                <button
                    type="submit"
                    disabled={isInputDisabled}
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-600 text-white transition-colors hover:bg-amber-500 disabled:bg-zinc-600"
                >
                    <Icon name="next" className="w-5 h-5" />
                </button>
            </form>
        </div>
    );
};

export default PlayerInputBar;
