'use client';

import SendIcon from '@mui/icons-material/Send';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  FormControlLabel,
  Grid,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { LANGUAGES, NOTIFICATION_TYPES, type Language, type NotificationType } from '@krishi/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ErrorAlert } from '@/components/Feedback';
import { PageHeader } from '@/components/PageHeader';
import { CropSelect, EnumSelect } from '@/components/SelectField';
import { ServerGrid, usePagination } from '@/components/ServerGrid';
import { useNotify } from '@/components/SnackbarProvider';
import { adminApi, errorMessage } from '@/lib/api';
import { LANGUAGE_LABELS, formatDateTime, humanize, languageLabel } from '@/lib/format';
import { useCrops } from '@/lib/queries';
import type { AdminNotification, NotificationTarget, SendNotificationInput } from '@/lib/types';

interface FormState {
  type: NotificationType;
  title: string;
  message: string;
  targetMode: 'all' | 'filtered';
  state: string;
  district: string;
  cropId: string;
  language: Language | '';
}

const EMPTY: FormState = {
  type: 'GENERAL',
  title: '',
  message: '',
  targetMode: 'filtered',
  state: 'West Bengal',
  district: '',
  cropId: '',
  language: '',
};

function buildTarget(f: FormState): NotificationTarget {
  if (f.targetMode === 'all') return { all: true };
  const t: NotificationTarget = {};
  if (f.state.trim()) t.state = f.state.trim();
  if (f.district.trim()) t.district = f.district.trim();
  if (f.cropId) t.cropId = f.cropId;
  if (f.language) t.language = f.language;
  return t;
}

const historyColumns: GridColDef<AdminNotification>[] = [
  { field: 'createdAt', headerName: 'Sent', width: 170, valueFormatter: (v: string) => formatDateTime(v) },
  {
    field: 'type',
    headerName: 'Type',
    width: 140,
    renderCell: ({ value }) => <Chip size="small" variant="outlined" label={humanize(value as string)} />,
  },
  {
    field: 'title',
    headerName: 'Notification',
    flex: 2,
    minWidth: 240,
    renderCell: ({ row }) => (
      <Box sx={{ py: 1, lineHeight: 1.35 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {row.title}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'normal' }}>
          {row.message}
        </Typography>
      </Box>
    ),
  },
  {
    field: 'user',
    headerName: 'Recipient',
    width: 180,
    valueGetter: (_v, row) => (row.user ? `${row.user.name ?? '(no name)'} · ${row.user.phone}` : '—'),
  },
  {
    field: 'readAt',
    headerName: 'Read',
    width: 170,
    valueFormatter: (v: string | null) => (v ? formatDateTime(v) : 'Unread'),
  },
];

export default function NotificationsPage() {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const crops = useCrops();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<'title' | 'message' | 'target', string>>>({});
  const [confirming, setConfirming] = useState(false);
  const [lastResult, setLastResult] = useState<number | null>(null);

  const pagination = usePagination();
  const [typeFilter, setTypeFilter] = useState('');
  const params = { ...pagination.query, type: typeFilter || undefined };
  const history = useQuery({
    queryKey: ['admin-notifications', params],
    queryFn: () => adminApi.notifications(params),
    placeholderData: keepPreviousData,
  });

  const send = useMutation({
    mutationFn: (body: SendNotificationInput) => adminApi.sendNotification(body),
    onSuccess: (res) => {
      notify.success(`Sent to ${res.recipients} farmer${res.recipients === 1 ? '' : 's'}`);
      setLastResult(res.recipients);
      setConfirming(false);
      setForm((f) => ({ ...f, title: '', message: '' }));
      void queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: (err) => notify.error(errorMessage(err)),
  });

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const review = () => {
    const e: typeof errors = {};
    if (!form.title.trim()) e.title = 'Required';
    if (!form.message.trim()) e.message = 'Required';
    if (form.targetMode === 'filtered' && Object.keys(buildTarget(form)).length === 0) {
      e.target = 'Choose at least one filter, or select "All farmers"';
    }
    setErrors(e);
    if (Object.keys(e).length) return;
    setConfirming(true);
  };

  const targetSummary = (() => {
    if (form.targetMode === 'all') return ['All active farmers'];
    const parts: string[] = [];
    if (form.state.trim()) parts.push(`State: ${form.state.trim()}`);
    if (form.district.trim()) parts.push(`District: ${form.district.trim()}`);
    if (form.cropId) parts.push(`Growing: ${crops.data?.find((c) => c.id === form.cropId)?.name ?? 'selected crop'}`);
    if (form.language) parts.push(`Language: ${languageLabel(form.language)}`);
    return parts;
  })();

  return (
    <>
      <PageHeader title="Notifications" subtitle="Send a push and in-app message to farmers, and review what was sent." />

      <Card sx={{ mb: 3 }}>
        <CardHeader title="Compose" slotProps={{ title: { variant: 'h6' } }} />
        <CardContent sx={{ pt: 0 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Stack spacing={2}>
                <EnumSelect
                  fullWidth
                  label="Type"
                  values={NOTIFICATION_TYPES}
                  value={form.type}
                  onChange={(v) => set('type', v as NotificationType)}
                />
                <TextField
                  fullWidth
                  required
                  label="Title"
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  error={Boolean(errors.title)}
                  helperText={errors.title ?? 'Write in the language your audience reads'}
                  slotProps={{ htmlInput: { maxLength: 200 } }}
                />
                <TextField
                  fullWidth
                  required
                  multiline
                  minRows={4}
                  label="Message"
                  value={form.message}
                  onChange={(e) => set('message', e.target.value)}
                  error={Boolean(errors.message)}
                  helperText={errors.message ?? `${form.message.length} characters`}
                />
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Typography variant="subtitle2" gutterBottom>
                Recipients
              </Typography>
              <RadioGroup
                value={form.targetMode}
                onChange={(e) => set('targetMode', e.target.value as FormState['targetMode'])}
              >
                <FormControlLabel value="all" control={<Radio />} label="All farmers" />
                <FormControlLabel value="filtered" control={<Radio />} label="Farmers matching filters" />
              </RadioGroup>
              {form.targetMode === 'filtered' && (
                <Stack spacing={2} sx={{ mt: 1 }}>
                  <TextField label="State" value={form.state} onChange={(e) => set('state', e.target.value)} />
                  <TextField label="District" value={form.district} onChange={(e) => set('district', e.target.value)} />
                  <CropSelect
                    label="Growing crop"
                    value={form.cropId}
                    onChange={(v) => set('cropId', v)}
                    emptyLabel="Any crop"
                  />
                  <EnumSelect
                    label="App language"
                    values={LANGUAGES}
                    labels={LANGUAGE_LABELS}
                    value={form.language}
                    onChange={(v) => set('language', v as Language | '')}
                    emptyLabel="Any language"
                  />
                </Stack>
              )}
              {errors.target && (
                <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                  {errors.target}
                </Typography>
              )}
            </Grid>
          </Grid>
          <Stack direction="row" spacing={2} sx={{ mt: 2, justifyContent: 'flex-end', alignItems: 'center' }}>
            {lastResult !== null && (
              <Typography variant="body2" color="success.main">
                Last message reached {lastResult} farmer{lastResult === 1 ? '' : 's'}.
              </Typography>
            )}
            <Button variant="contained" startIcon={<SendIcon />} onClick={review} disabled={send.isPending}>
              Review & send
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ mb: 2, justifyContent: 'space-between', alignItems: { sm: 'center' } }}
      >
        <Typography variant="h6">Sent history</Typography>
        <EnumSelect
          label="Type"
          values={NOTIFICATION_TYPES}
          value={typeFilter}
          onChange={(v) => {
            setTypeFilter(v);
            pagination.resetPage();
          }}
          emptyLabel="All types"
          sx={{ minWidth: 200 }}
        />
      </Stack>
      {history.isError && <ErrorAlert error={history.error} onRetry={() => history.refetch()} />}
      <ServerGrid
        rows={history.data?.items ?? []}
        columns={historyColumns}
        rowCount={history.data?.total ?? 0}
        loading={history.isFetching}
        paginationModel={pagination.model}
        onPaginationModelChange={pagination.setModel}
        noRowsLabel="No notifications sent yet"
        getRowHeight={() => 'auto'}
      />

      <ConfirmDialog
        open={confirming}
        title="Send this notification?"
        confirmLabel="Send now"
        pending={send.isPending}
        onClose={() => setConfirming(false)}
        onConfirm={() =>
          send.mutate({ type: form.type, title: form.title.trim(), message: form.message.trim(), target: buildTarget(form) })
        }
      >
        <Stack spacing={1.5}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              {humanize(form.type)}
            </Typography>
            <Typography variant="subtitle2">{form.title}</Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {form.message}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Recipients
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1, mt: 0.5 }}>
              {targetSummary.map((t) => (
                <Chip key={t} size="small" label={t} color={form.targetMode === 'all' ? 'warning' : 'default'} />
              ))}
            </Stack>
          </Box>
          <Typography variant="caption" color="text.secondary">
            Sent notifications cannot be recalled.
          </Typography>
        </Stack>
      </ConfirmDialog>
    </>
  );
}
