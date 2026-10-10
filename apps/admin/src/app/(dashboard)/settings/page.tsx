'use client';

import { Box, Card, CardContent, CardHeader, Chip, Grid, Stack, Table, TableBody, TableCell, TableRow, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { CardGridSkeleton, ErrorAlert } from '@/components/Feedback';
import { JsonViewer } from '@/components/JsonViewer';
import { PageHeader } from '@/components/PageHeader';
import { API_URL, adminApi } from '@/lib/api';
import { humanize, languageLabel } from '@/lib/format';
import { useSession } from '@/lib/session';
import type { AdminSettings } from '@/lib/types';

const SECTIONS: { key: keyof AdminSettings; label: string; format?: (v: string) => string }[] = [
  { key: 'languages', label: 'Languages', format: languageLabel },
  { key: 'areaUnits', label: 'Area units' },
  { key: 'soilTypes', label: 'Soil types' },
  { key: 'seasons', label: 'Crop seasons' },
  { key: 'activityTypes', label: 'Activity types' },
  { key: 'expenseCategories', label: 'Expense categories' },
  { key: 'notificationTypes', label: 'Notification types' },
  { key: 'priceUnits', label: 'Price units' },
  { key: 'severities', label: 'Alert severities' },
];

export default function SettingsPage() {
  const session = useSession();
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['settings'], queryFn: adminApi.settings });

  const knownKeys = new Set(SECTIONS.map((s) => s.key as string));
  const extra = data ? Object.fromEntries(Object.entries(data).filter(([k]) => !knownKeys.has(k))) : {};

  return (
    <>
      <PageHeader title="Settings" subtitle="Reference values configured on the server (read-only) and environment information." />

      <Card sx={{ mb: 3 }}>
        <CardHeader title="Environment" slotProps={{ title: { variant: 'h6' } }} />
        <CardContent sx={{ pt: 0 }}>
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell sx={{ width: 220, color: 'text.secondary' }}>API base URL</TableCell>
                <TableCell sx={{ fontFamily: 'monospace' }}>{API_URL}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ color: 'text.secondary' }}>API docs (Swagger)</TableCell>
                <TableCell sx={{ fontFamily: 'monospace' }}>{`${API_URL}/docs`}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ color: 'text.secondary' }}>Build mode</TableCell>
                <TableCell>{process.env.NODE_ENV}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ color: 'text.secondary' }}>Signed in as</TableCell>
                <TableCell>
                  {session ? `${session.user.name ?? '(no name)'} · ${session.user.phone} · ${session.user.role}` : '—'}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Typography variant="h6" sx={{ mb: 1.5 }}>
        Reference values
      </Typography>
      {isError && <ErrorAlert error={error} onRetry={() => refetch()} />}
      {isLoading ? (
        <CardGridSkeleton count={6} />
      ) : data ? (
        <>
          <Grid container spacing={2}>
            {SECTIONS.map(({ key, label, format }) => {
              const values = Array.isArray(data[key]) ? (data[key] as string[]) : [];
              return (
                <Grid key={key as string} size={{ xs: 12, sm: 6, lg: 4 }}>
                  <Card sx={{ height: '100%' }}>
                    <CardHeader
                      title={label}
                      subheader={`${values.length} value${values.length === 1 ? '' : 's'}`}
                      slotProps={{ title: { variant: 'subtitle1', fontWeight: 600 } }}
                    />
                    <CardContent sx={{ pt: 0 }}>
                      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                        {values.length === 0 ? (
                          <Typography variant="body2" color="text.secondary">
                            Not provided
                          </Typography>
                        ) : (
                          values.map((v) => (
                            <ValueChip key={v} label={format ? format(v) : humanize(v)} code={v} />
                          ))
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
          {Object.keys(extra).length > 0 && (
            <Card sx={{ mt: 2 }}>
              <CardHeader title="Other settings" slotProps={{ title: { variant: 'subtitle1', fontWeight: 600 } }} />
              <CardContent sx={{ pt: 0 }}>
                <JsonViewer value={extra} />
              </CardContent>
            </Card>
          )}
        </>
      ) : null}
    </>
  );
}

function ValueChip({ label, code }: { label: string; code: string }) {
  return (
    <Chip
      size="small"
      variant="outlined"
      label={
        <Box component="span">
          {label}
          {label !== code && (
            <Box component="span" sx={{ ml: 0.75, color: 'text.secondary', fontFamily: 'monospace', fontSize: 11 }}>
              {code}
            </Box>
          )}
        </Box>
      }
    />
  );
}
