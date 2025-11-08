// components/ui/Toggle.tsx
// Um componente de interruptor (toggle switch) estilizado, usado para opções binárias (ligado/desligado).
// É uma substituição visualmente mais agradável para um checkbox.

import React from 'react';

interface ToggleProps {
    /** Label opcional para o estado "desligado" (à esquerda). */
    labelLeft?: string;
    /** Label para o estado "ligado" (à direita). */
    labelRight: string;
    /** O estado atual do interruptor (ligado/desligado). */
    checked?: boolean;
    /** Função chamada quando o estado do interruptor muda. */
    onChange?: (checked: boolean) => void;
}

const Toggle: React.FC<ToggleProps> = ({ labelLeft, labelRight, checked, onChange }) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (onChange) {
            onChange(event.target.checked);
        }
    };

    return (
        // O `label` envolve tudo para que o clique em qualquer lugar (incluindo os textos) acione o input.
        <label className="flex items-center cursor-pointer gap-2 w-fit">
            {labelLeft && <span className={`text-sm font-bold transition-colors ${!checked ? 'text-slate-300' : 'text-zinc-600'}`}>{labelLeft}</span>}
            <input
                type="checkbox"
                checked={checked}
                onChange={handleChange}
                // O input real é visualmente oculto (`sr-only`) e controlado pelo `div` estilizado abaixo.
                className="sr-only peer"
            />
            {/* Este div representa o trilho e o círculo do interruptor, estilizado com classes do Tailwind. */}
            {/* O seletor `peer-checked:` do Tailwind é usado para mudar o estilo quando o input (o "peer") está marcado. */}
            <div className="relative w-11 h-6 bg-zinc-700 rounded-full peer peer-checked:bg-amber-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            <span className={`text-sm font-bold transition-colors ${checked ? 'text-slate-300' : 'text-zinc-600'}`}>{labelRight}</span>
        </label>
    );
};

export default Toggle;
