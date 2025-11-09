import React, { useCallback, useMemo, useState } from 'react';
import ToastContainer from '@/components/ui/ToastContainer';
import GlobalOverlays from '@/components/ui/GlobalOverlays';
import AppHeader from './AppHeader';
import FloatingChromeButtons from './FloatingChromeButtons';
import { AppChromeContext, DevLogReplayHandler, HeaderAction } from './AppChromeContext';

type AppShellProps = {
  children: React.ReactNode;
};

/**
 * AppShell
 * Estrutura persistente responsável por aplicar os tokens Arcana (fundo, tipografia,
 * overlays) e garantir que toasts e botões globais estejam disponíveis em todas as rotas.
 */
const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDevLogOpen, setIsDevLogOpen] = useState(false);
  const [devLogReplayHandler, setDevLogReplayHandler] = useState<DevLogReplayHandler | null>(null);
  const [backAction, setBackAction] = useState<HeaderAction | null>(null);
  const [primaryAction, setPrimaryAction] = useState<HeaderAction | null>(null);

  const openSettings = useCallback(() => setIsSettingsOpen(true), []);
  const openDevLog = useCallback(() => setIsDevLogOpen(true), []);

  const chromeValue = useMemo(
    () => ({
      openSettings,
      openDevLog,
      setDevLogReplayHandler,
      backAction,
      primaryAction,
      registerBackAction: setBackAction,
      registerPrimaryAction: setPrimaryAction,
    }),
    [openSettings, openDevLog, backAction, primaryAction]
  );

  return (
    <AppChromeContext.Provider value={chromeValue}>
      <div className="app-shell relative h-screen min-h-0 overflow-hidden bg-arcana-ink-950 text-arcana-parchment-100">
        {/* Overlays visuais que criam o gradiente Arcana sem interferir na interação. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-arcana-radial opacity-70"
        />

        <div className="relative z-10 flex h-full min-h-0 flex-col">
          <AppHeader />
          <FloatingChromeButtons />
          <main className="flex flex-1 min-h-0 flex-col overflow-hidden">{children}</main>
        </div>

        {/* Elementos globais que devem permanecer disponíveis independente da rota. */}
        <ToastContainer />
        <GlobalOverlays
          isSettingsOpen={isSettingsOpen}
          onCloseSettings={() => setIsSettingsOpen(false)}
          isDevLogOpen={isDevLogOpen}
          onCloseDevLog={() => setIsDevLogOpen(false)}
          devLogReplayHandler={devLogReplayHandler}
        />
      </div>
    </AppChromeContext.Provider>
  );
};

export default AppShell;
