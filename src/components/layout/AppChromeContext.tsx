import { createContext, useContext } from 'react';
import type { IconName } from '@/components/ui/Icon';

export type DevLogReplayHandler = (action: string, isOffTopic?: boolean) => void;

export type HeaderAction = {
  icon?: IconName;
  ariaLabel: string;
  onAction: () => void;
  variant?: 'primary' | 'ghost';
};

interface AppChromeContextValue {
  openSettings: () => void;
  openDevLog: () => void;
  setDevLogReplayHandler: (handler: DevLogReplayHandler | null) => void;
  backAction: HeaderAction | null;
  primaryAction: HeaderAction | null;
  registerBackAction: (action: HeaderAction | null) => void;
  registerPrimaryAction: (action: HeaderAction | null) => void;
}

export const AppChromeContext = createContext<AppChromeContextValue | null>(null);

export const useAppChrome = () => {
  const context = useContext(AppChromeContext);
  if (!context) {
    throw new Error('useAppChrome deve ser usado dentro do AppChromeContext.Provider');
  }
  return context;
};
