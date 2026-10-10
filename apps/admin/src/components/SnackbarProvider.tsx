'use client';

import { Alert, type AlertColor, Snackbar } from '@mui/material';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface Toast {
  key: number;
  message: string;
  severity: AlertColor;
}

interface NotifyApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const NotifyContext = createContext<NotifyApi | null>(null);

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<Toast[]>([]);
  const current = queue[0];

  const push = useCallback((message: string, severity: AlertColor) => {
    setQueue((q) => [...q, { key: Date.now() + Math.random(), message, severity }]);
  }, []);

  const api = useMemo<NotifyApi>(
    () => ({
      success: (m) => push(m, 'success'),
      error: (m) => push(m, 'error'),
      info: (m) => push(m, 'info'),
    }),
    [push],
  );

  const close = (_?: unknown, reason?: string) => {
    if (reason === 'clickaway') return;
    setQueue((q) => q.slice(1));
  };

  return (
    <NotifyContext.Provider value={api}>
      {children}
      <Snackbar
        key={current?.key}
        open={Boolean(current)}
        autoHideDuration={current?.severity === 'error' ? 8000 : 4000}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {current ? (
          <Alert onClose={close} severity={current.severity} variant="filled" sx={{ width: '100%' }}>
            {current.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </NotifyContext.Provider>
  );
}

export function useNotify(): NotifyApi {
  const ctx = useContext(NotifyContext);
  if (!ctx) throw new Error('useNotify must be used inside SnackbarProvider');
  return ctx;
}
