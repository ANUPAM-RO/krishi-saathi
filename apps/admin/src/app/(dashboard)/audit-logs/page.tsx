'use client';

import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ErrorAlert } from '@/components/Feedback';
import { JsonViewer } from '@/components/JsonViewer';
import { PageHeader } from '@/components/PageHeader';
import { SelectField } from '@/components/SelectField';
import { ServerGrid, usePagination } from '@/components/ServerGrid';
import { adminApi } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import type { AuditLog } from '@/lib/types';

// Entities the API audits (docs/API.md). The API's exact entity strings are assumed to be these model names.
const ENTITIES = [
  { value: 'crop', label: 'Crops' },
  { value: 'crop_calendar_template', label: 'Calendar templates' },
  { value: 'mandi', label: 'Mandis' },
  { value: 'mandi_price', label: 'Mandi prices' },
  { value: 'crop_advisory', label: 'Advisories' },
  { value: 'weather_alert', label: 'Weather alerts' },
  { value: 'user', label: 'Farmer accounts' },
  { value: 'notification', label: 'Notifications' },
];

function summarizeChanges(changes: unknown): string {
  if (changes === null || changes === undefined) return '—';
  if (typeof changes !== 'object') return String(changes);
  const keys = Object.keys(changes as Record<string, unknown>);
  if (keys.length === 0) return '—';
  return keys.slice(0, 5).join(', ') + (keys.length > 5 ? ` +${keys.length - 5}` : '');
}

export default function AuditLogsPage() {
  const pagination = usePagination();
  const [entity, setEntity] = useState('');
  const [viewing, setViewing] = useState<AuditLog | null>(null);

  const params = { ...pagination.query, entity: entity || undefined };
  const { data, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => adminApi.auditLogs(params),
    placeholderData: keepPreviousData,
  });

  const columns: GridColDef<AuditLog>[] = [
    { field: 'createdAt', headerName: 'When', width: 180, valueFormatter: (v: string) => formatDateTime(v) },
    {
      field: 'action',
      headerName: 'Action',
      width: 190,
      renderCell: ({ value }) => <Chip size="small" variant="outlined" label={value as string} />,
    },
    { field: 'entity', headerName: 'Entity', width: 170 },
    {
      field: 'entityId',
      headerName: 'Entity ID',
      width: 140,
      renderCell: ({ value }) =>
        value ? (
          <Tooltip title={value as string}>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12 }} noWrap>
              {(value as string).slice(0, 8)}…
            </Typography>
          </Tooltip>
        ) : (
          '—'
        ),
    },
    {
      field: 'actor',
      headerName: 'By',
      width: 180,
      valueGetter: (_v, row) => (row.actor ? `${row.actor.name ?? '(no name)'} · ${row.actor.phone}` : 'System'),
    },
    {
      field: 'changes',
      headerName: 'Changes',
      flex: 1,
      minWidth: 200,
      sortable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', height: '100%', minWidth: 0 }}>
          <IconButton size="small" onClick={() => setViewing(row)} aria-label="View changes">
            <VisibilityIcon fontSize="small" />
          </IconButton>
          <Typography variant="body2" color="text.secondary" noWrap>
            {summarizeChanges(row.changes)}
          </Typography>
        </Stack>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Audit Log"
        subtitle="Admin changes to crops, calendars, mandis, prices, advisories, alerts and farmer accounts."
      />
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <SelectField
            label="Entity"
            value={entity}
            onChange={(v) => {
              setEntity(v);
              pagination.resetPage();
            }}
            emptyLabel="All entities"
            options={ENTITIES}
            sx={{ minWidth: 240 }}
          />
        </CardContent>
      </Card>

      {isError && <ErrorAlert error={error} onRetry={() => refetch()} />}

      <ServerGrid
        rows={data?.items ?? []}
        columns={columns}
        rowCount={data?.total ?? 0}
        loading={isFetching}
        paginationModel={pagination.model}
        onPaginationModelChange={pagination.setModel}
        noRowsLabel="No audit entries"
        onRowClick={(p) => setViewing(p.row)}
      />

      <Dialog open={Boolean(viewing)} onClose={() => setViewing(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          {viewing?.action}
          <Typography variant="body2" color="text.secondary">
            {viewing?.entity} {viewing?.entityId ?? ''} · {formatDateTime(viewing?.createdAt)} ·{' '}
            {viewing?.actor ? `${viewing.actor.name ?? viewing.actor.phone}` : 'System'}
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          {viewing?.changes === null || viewing?.changes === undefined ? (
            <Box sx={{ color: 'text.secondary' }}>No change details were recorded.</Box>
          ) : (
            <JsonViewer value={viewing.changes} maxHeight={520} />
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => viewing && void navigator.clipboard?.writeText(JSON.stringify(viewing.changes, null, 2))}
          >
            Copy JSON
          </Button>
          <Button variant="contained" onClick={() => setViewing(null)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
