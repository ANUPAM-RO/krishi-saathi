'use client';

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { ALERT_SEVERITIES, LANGUAGES, type AlertSeverity, type Language } from '@krishi/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ErrorAlert } from '@/components/Feedback';
import { PageHeader } from '@/components/PageHeader';
import { CropSelect, EnumSelect, SelectField } from '@/components/SelectField';
import { ServerGrid, usePagination } from '@/components/ServerGrid';
import { useNotify } from '@/components/SnackbarProvider';
import { adminApi, errorMessage } from '@/lib/api';
import { LANGUAGE_LABELS, formatDateTime, humanize, languageLabel, toDateTimeLocal } from '@/lib/format';
import { useCrops } from '@/lib/queries';
import type { WeatherAlert, WeatherAlertInput } from '@/lib/types';

const SEVERITY_COLOR: Record<AlertSeverity, 'info' | 'warning' | 'error'> = {
  INFO: 'info',
  WARNING: 'warning',
  SEVERE: 'error',
};

interface FormState {
  severity: AlertSeverity;
  language: Language;
  title: string;
  message: string;
  validFrom: string;
  validTo: string;
  state: string;
  district: string;
  cropId: string;
  notify: boolean;
}
type Errors = Partial<Record<keyof FormState, string>>;

function toForm(a: WeatherAlert | null): FormState {
  if (!a) {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return {
      severity: 'WARNING',
      language: 'bn',
      title: '',
      message: '',
      validFrom: toDateTimeLocal(now.toISOString()),
      validTo: toDateTimeLocal(tomorrow.toISOString()),
      state: 'West Bengal',
      district: '',
      cropId: '',
      notify: true,
    };
  }
  return {
    severity: a.severity,
    language: a.language ?? 'bn',
    title: a.title,
    message: a.message,
    validFrom: toDateTimeLocal(a.validFrom),
    validTo: toDateTimeLocal(a.validTo),
    state: a.state ?? '',
    district: a.district ?? '',
    cropId: a.cropId ?? '',
    notify: false,
  };
}

function validate(f: FormState): Errors {
  const e: Errors = {};
  if (!f.title.trim()) e.title = 'Required';
  if (!f.message.trim()) e.message = 'Required';
  const from = new Date(f.validFrom);
  const to = new Date(f.validTo);
  if (!f.validFrom || Number.isNaN(from.getTime())) e.validFrom = 'Required';
  if (!f.validTo || Number.isNaN(to.getTime())) e.validTo = 'Required';
  if (!e.validFrom && !e.validTo && to <= from) e.validTo = 'Must be after "Valid from"';
  return e;
}

function AlertDialog({
  alert,
  onClose,
  onCreated,
}: {
  alert: WeatherAlert | null;
  onClose: () => void;
  onCreated: (notified: number, title: string) => void;
}) {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(() => toForm(alert));
  const [errors, setErrors] = useState<Errors>({});

  const save = useMutation({
    mutationFn: async (body: WeatherAlertInput) => {
      if (alert) {
        const { notify: _ignored, ...rest } = body;
        void _ignored;
        await adminApi.updateWeatherAlert(alert.id, rest);
        return null;
      }
      return adminApi.createWeatherAlert(body);
    },
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['weather-alerts'] });
      void queryClient.invalidateQueries({ queryKey: ['stats'] });
      if (res) {
        notify.success(`Alert created. ${res.notified} farmer${res.notified === 1 ? '' : 's'} notified.`);
        onCreated(res.notified, res.alert.title);
      } else {
        notify.success('Alert updated');
      }
      onClose();
    },
    onError: (err) => notify.error(errorMessage(err)),
  });

  const submit = () => {
    const e = validate(form);
    setErrors(e);
    if (Object.keys(e).length) return;
    save.mutate({
      severity: form.severity,
      language: form.language,
      title: form.title.trim(),
      message: form.message.trim(),
      validFrom: new Date(form.validFrom).toISOString(),
      validTo: new Date(form.validTo).toISOString(),
      state: form.state.trim() || null,
      district: form.district.trim() || null,
      cropId: form.cropId || null,
      notify: form.notify,
    });
  };

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open onClose={save.isPending ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>{alert ? 'Edit weather alert' : 'New weather alert'}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <EnumSelect
              fullWidth
              required
              label="Severity"
              values={ALERT_SEVERITIES}
              value={form.severity}
              onChange={(v) => set('severity', v as AlertSeverity)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <EnumSelect
              fullWidth
              required
              label="Language"
              values={LANGUAGES}
              labels={LANGUAGE_LABELS}
              value={form.language}
              onChange={(v) => set('language', v as Language)}
              helperText="Write the title and message in this language"
            />
          </Grid>
          <Grid size={12}>
            <TextField
              fullWidth
              required
              label="Title"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              error={Boolean(errors.title)}
              helperText={errors.title}
              slotProps={{ htmlInput: { lang: form.language, maxLength: 200 } }}
            />
          </Grid>
          <Grid size={12}>
            <TextField
              fullWidth
              required
              multiline
              minRows={3}
              label="Message"
              value={form.message}
              onChange={(e) => set('message', e.target.value)}
              error={Boolean(errors.message)}
              helperText={errors.message}
              slotProps={{ htmlInput: { lang: form.language } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              required
              type="datetime-local"
              label="Valid from"
              value={form.validFrom}
              onChange={(e) => set('validFrom', e.target.value)}
              error={Boolean(errors.validFrom)}
              helperText={errors.validFrom}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              required
              type="datetime-local"
              label="Valid to"
              value={form.validTo}
              onChange={(e) => set('validTo', e.target.value)}
              error={Boolean(errors.validTo)}
              helperText={errors.validTo}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              label="State"
              value={form.state}
              onChange={(e) => set('state', e.target.value)}
              helperText="Blank = all states"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              label="District"
              value={form.district}
              onChange={(e) => set('district', e.target.value)}
              helperText="Blank = whole state"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <CropSelect
              fullWidth
              label="Crop"
              value={form.cropId}
              onChange={(v) => set('cropId', v)}
              emptyLabel="All crops"
            />
          </Grid>
          {!alert && (
            <Grid size={12}>
              <FormControlLabel
                control={<Checkbox checked={form.notify} onChange={(e) => set('notify', e.target.checked)} />}
                label="Notify matching farmers now (push notification)"
              />
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={save.isPending}>
          Cancel
        </Button>
        <Button variant="contained" onClick={submit} disabled={save.isPending}>
          {save.isPending ? 'Saving…' : alert ? 'Save changes' : form.notify ? 'Create & notify' : 'Create alert'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function WeatherAlertsPage() {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const crops = useCrops();
  const pagination = usePagination();
  const [activeFilter, setActiveFilter] = useState('true');
  const [dialog, setDialog] = useState<{ alert: WeatherAlert | null; key: number } | null>(null);
  const [deleting, setDeleting] = useState<WeatherAlert | null>(null);
  const [lastCreated, setLastCreated] = useState<{ notified: number; title: string } | null>(null);

  const params = { ...pagination.query, active: activeFilter === 'true' ? true : undefined };
  const { data, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['weather-alerts', params],
    queryFn: () => adminApi.weatherAlerts(params),
    placeholderData: keepPreviousData,
  });

  const remove = useMutation({
    mutationFn: (a: WeatherAlert) => adminApi.deleteWeatherAlert(a.id),
    onSuccess: () => {
      notify.success('Alert deleted');
      setDeleting(null);
      void queryClient.invalidateQueries({ queryKey: ['weather-alerts'] });
      void queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: (err) => notify.error(errorMessage(err)),
  });

  const cropName = (id: string | null) => {
    if (!id) return 'All crops';
    return crops.data?.find((c) => c.id === id)?.name ?? '—';
  };

  const columns: GridColDef<WeatherAlert>[] = [
    {
      field: 'severity',
      headerName: 'Severity',
      width: 110,
      renderCell: ({ row }) => (
        <Chip size="small" label={humanize(row.severity)} color={SEVERITY_COLOR[row.severity] ?? 'default'} />
      ),
    },
    {
      field: 'title',
      headerName: 'Alert',
      flex: 2,
      minWidth: 220,
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
    { field: 'language', headerName: 'Language', width: 130, valueFormatter: (v?: string) => languageLabel(v) },
    {
      field: 'region',
      headerName: 'Region',
      width: 160,
      sortable: false,
      valueGetter: (_v, row) => [row.district, row.state].filter(Boolean).join(', ') || 'Everywhere',
    },
    {
      field: 'cropId',
      headerName: 'Crop',
      width: 120,
      valueGetter: (_v, row) => row.crop?.name ?? cropName(row.cropId),
    },
    { field: 'validFrom', headerName: 'Valid from', width: 170, valueFormatter: (v: string) => formatDateTime(v) },
    { field: 'validTo', headerName: 'Valid to', width: 170, valueFormatter: (v: string) => formatDateTime(v) },
    {
      field: 'actions',
      headerName: '',
      width: 96,
      sortable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" sx={{ height: '100%', alignItems: 'center' }}>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => setDialog({ alert: row, key: Date.now() })}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={() => setDeleting(row)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Weather Alerts"
        subtitle="Region- and crop-specific weather warnings shown in the farmer app's forecast."
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ alert: null, key: Date.now() })}>
            New alert
          </Button>
        }
      />

      {lastCreated && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setLastCreated(null)}>
          &ldquo;{lastCreated.title}&rdquo; was created and <strong>{lastCreated.notified}</strong> farmer
          {lastCreated.notified === 1 ? ' was' : 's were'} notified.
        </Alert>
      )}

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <SelectField
            label="Show"
            value={activeFilter}
            onChange={(v) => {
              setActiveFilter(v);
              pagination.resetPage();
            }}
            options={[
              { value: 'true', label: 'Active now' },
              { value: 'all', label: 'All alerts' },
            ]}
            sx={{ minWidth: 200 }}
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
        noRowsLabel={activeFilter === 'true' ? 'No active weather alerts' : 'No weather alerts yet'}
        getRowHeight={() => 'auto'}
      />

      {dialog && (
        <AlertDialog
          key={dialog.key}
          alert={dialog.alert}
          onClose={() => setDialog(null)}
          onCreated={(notified, title) => setLastCreated({ notified, title })}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this alert?"
        confirmLabel="Delete"
        confirmColor="error"
        pending={remove.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting)}
      >
        <Typography variant="body2">
          &ldquo;{deleting?.title}&rdquo; will no longer be shown to farmers. Notifications already sent are not recalled.
        </Typography>
      </ConfirmDialog>
    </>
  );
}
