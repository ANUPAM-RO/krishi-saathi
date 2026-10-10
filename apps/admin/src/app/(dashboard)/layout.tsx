'use client';

import { Box, CircularProgress } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { AppShell } from '@/components/AppShell';
import { useNotify } from '@/components/SnackbarProvider';
import { authApi, setSessionExpiredHandler } from '@/lib/api';
import { useSession } from '@/lib/session';

/** Client-side route guard + app shell for every authenticated page. */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const notify = useNotify();
  const session = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    if (!session || session.user.role !== 'ADMIN') router.replace('/login');
  }, [mounted, session, router]);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      queryClient.clear();
      notify.info('Your session has expired. Please sign in again.');
      router.replace('/login');
    });
    return () => setSessionExpiredHandler(null);
  }, [queryClient, notify, router]);

  const logout = useCallback(async () => {
    await authApi.logout();
    queryClient.clear();
    router.replace('/login');
  }, [queryClient, router]);

  if (!mounted || !session || session.user.role !== 'ADMIN') {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress aria-label="Loading" />
      </Box>
    );
  }

  return (
    <AppShell user={session.user} onLogout={logout}>
      {children}
    </AppShell>
  );
}
