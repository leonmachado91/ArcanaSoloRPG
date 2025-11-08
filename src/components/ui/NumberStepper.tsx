// components/ui/NumberStepper.tsx
// Um componente de UI para incrementar e decrementar um valor numérico,
// comumente usado em formulários para selecionar quantidades.

import React from 'react';

interface NumberStepperProps {
    /** O texto do label exibido acima do stepper. */
    label: string;
    /** O valor numérico atual. */
    value: number;
    /** Função chamada quando o valor é alterado. */
    onChange: (newValue: number) => void;
    /** O valor mínimo permitido. */
    min?: number;
    /** O valor máximo permitido. */
    max?: number;
    /** Se verdadeiro, desabilita os botões de controle. */
    disabled?: boolean;
}

const NumberStepper: React.FC<NumberStepperProps> = ({ label, value, onChange, min = 0, max = 5, disabled = false }) => {
    // Garante que o valor não ultrapasse o máximo definido.
    const increment = () => onChange(Math.min(max, value + 1));
    // Garante que o valor não seja menor que o mínimo definido.
    const decrement = () => onChange(Math.max(min, value - 1));

    return (
        <div>
            <label className="block text-sm font-medium text-slate-300 mb-2 text-center">{label}</label>
            <div className="flex items-center justify-center gap-4">
                <button onClick={decrement} disabled={disabled || value <= min} className="w-10 h-10 flex items-center justify-center bg-zinc-700 rounded-full text-xl hover:bg-zinc-600 disabled:opacity-50 transition-colors">-</button>
                <span className="text-4xl font-display w-16 text-center">{value}</span>
                <button onClick={increment} disabled={disabled || value >= max} className="w-10 h-10 flex items-center justify-center bg-zinc-700 rounded-full text-xl hover:bg-zinc-600 disabled:opacity-50 transition-colors">+</button>
            </div>
        </div>
    );
};

export default NumberStepper;
