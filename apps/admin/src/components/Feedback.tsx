'use client';

import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import { Alert, Box, Button, Card, CardContent, Grid, Skeleton, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { errorMessage } from '@/lib/api';

export function ErrorAlert({ error, onRetry, title }: { error: unknown; onRetry?: () => void; title?: string }) {
  return (
    <Alert
      severity="error"
      sx={{ mb: 2 }}
      action={
        onRetry ? (
          <Button color="inherit" size="small" onClick={onRetry}>
            Retry
          </Button>
        ) : undefined
      }
    >
      {title && <strong>{title}: </strong>}
      {errorMessage(error)}
    </Alert>
  );
}

export function EmptyState({ title, message, action }: { title: string; message?: ReactNode; action?: ReactNode }) {
  return (
    <Box sx={{ textAlign: 'center', py: 6, px: 2, color: 'text.secondary' }}>
      <InboxOutlinedIcon sx={{ fontSize: 48, opacity: 0.5 }} />
      <Typography variant="subtitle1" sx={{ mt: 1, color: 'text.primary' }}>
        {title}
      </Typography>
      {message && <Typography variant="body2">{message}</Typography>}
      {action && <Box sx={{ mt: 2 }}>{action}</Box>}
    </Box>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Stack spacing={1}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} variant="rounded" height={44} />
      ))}
    </Stack>
  );
}

export function CardGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <Grid container spacing={2}>
      {Array.from({ length: count }, (_, i) => (
        <Grid key={i} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <Card>
            <CardContent>
              <Skeleton width="60%" />
              <Skeleton variant="text" sx={{ fontSize: '2rem' }} width="40%" />
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
