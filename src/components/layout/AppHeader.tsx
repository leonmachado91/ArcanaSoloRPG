import React from 'react';
import Icon from '@/components/ui/Icon';
import { useAppChrome } from './AppChromeContext';

const baseButtonClass =
  'inline-flex h-12 w-12 items-center justify-center rounded-full text-white transition focus:outline-none focus-visible:ring-2';

const variantClasses = {
  ghost:
    'border border-white/20 bg-arcana-ink-900/80 shadow-arcana-card hover:border-white/40 hover:bg-white/10 focus-visible:ring-arcana-aura-300',
  primary: 'bg-amber-600 shadow-2xl hover:bg-amber-500 focus-visible:ring-amber-300',
};

const AppHeader: React.FC = () => {
  const { backAction, primaryAction } = useAppChrome();

  if (!backAction && !primaryAction) {
    return null;
  }

  return (
    <>
      {backAction && (
        <div className="fixed left-4 top-4 z-40">
          <button
            className={`${baseButtonClass} ${variantClasses[backAction.variant ?? 'ghost']}`}
            onClick={backAction.onAction}
            aria-label={backAction.ariaLabel}
          >
            <Icon name={backAction.icon ?? 'back'} className="h-5 w-5" />
          </button>
        </div>
      )}

      {primaryAction && (
        <div className="fixed right-4 top-4 z-40">
          <button
            className={`${baseButtonClass} ${variantClasses[primaryAction.variant ?? 'primary']}`}
            onClick={primaryAction.onAction}
            aria-label={primaryAction.ariaLabel}
          >
            <Icon name={primaryAction.icon ?? 'next'} className="h-5 w-5" />
          </button>
        </div>
      )}
    </>
  );
};

export default AppHeader;
