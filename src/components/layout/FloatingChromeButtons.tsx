import React, { useState, FocusEvent } from 'react';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import { useAppChrome } from './AppChromeContext';

const FloatingChromeButtons: React.FC = () => {
  const { openDevLog, openSettings } = useAppChrome();
  const [isActive, setIsActive] = useState(false);

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      setIsActive(false);
    }
  };

  return (
    <div
      className="fixed bottom-6 right-6 z-40 h-24 w-16"
      onMouseEnter={() => setIsActive(true)}
      onMouseLeave={() => setIsActive(false)}
      onFocusCapture={() => setIsActive(true)}
      onBlurCapture={handleBlur}
    >
      <div
        className={`flex flex-col items-center gap-3 transition-all duration-200 ${
          isActive ? 'opacity-100 translate-y-0 pointer-events-auto' : 'pointer-events-none opacity-0 translate-y-2'
        }`}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full bg-transparent text-white hover:text-arcana-ember-400 focus-visible:ring-2 focus-visible:ring-arcana-ember-400/60"
          onClick={openDevLog}
          aria-label="Abrir Dev Log"
        >
          <Icon name="code" className="h-6 w-6 drop-shadow-[0_0_6px_rgba(234,138,26,0.45)]" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full bg-transparent text-white hover:text-arcana-aura-300 focus-visible:ring-2 focus-visible:ring-arcana-aura-300/60"
          onClick={openSettings}
          aria-label="Abrir Configurações"
        >
          <Icon name="settings" className="h-6 w-6 drop-shadow-[0_0_6px_rgba(111,155,255,0.45)]" />
        </Button>
      </div>
    </div>
  );
};

export default FloatingChromeButtons;
