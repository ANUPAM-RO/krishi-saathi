'use client';

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PublishIcon from '@mui/icons-material/Publish';
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
  FormControlLabel,
  Grid,
  IconButton,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { CROP_SEASONS, LANGUAGES, type CropSeason, type Language } from '@krishi/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ErrorAlert } from '@/components/Feedback';
import { PageHeader } from '@/components/PageHeader';
import { CropSelect, EnumSelect } from '@/components/SelectField';
import { ServerGrid, usePagination } from '@/components/ServerGrid';
import { useNotify } from '@/components/SnackbarProvider';
import { adminApi, errorMessage } from '@/lib/api';
import { LANGUAGE_LABELS, formatDate, formatDateTime, humanize, languageLabel } from '@/lib/format';
import type { Advisory, AdvisoryInput } from '@/lib/types';

interface FormState {
  title: string;
  description: string;
  language: Language;
  cropId: string;
  season: CropSeason | '';
  state: string;
  district: string;
}
type Errors = Partial<Record<keyof FormState, string>>;

function toForm(a: Advisory | null): FormState {
  return {
    title: a?.title ?? '',
    description: a?.description ?? '',
    language: a?.language ?? 'bn',
    cropId: a?.crop?.id ?? '',
    season: a?.season ?? '',
    state: a?.state ?? '',
    district: a?.district ?? '',
  };
}

function AdvisoryDialog({ advisory, onClose }: { advisory: Advisory | null; onClose: () => void }) {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(() => toForm(advisory));
  const [errors, setErrors] = useState<Errors>({});

  const save = useMutation({
    mutationFn: (body: AdvisoryInput) =>
      advisory ? adminApi.updateAdvisory(advisory.id, body) : adminApi.createAdvisory(body),
    onSuccess: () => {
      notify.success(advisory ? 'Advisory updated' : 'Draft advisory created. Publish it to show it to farmers.');
      void queryClient.invalidateQueries({ queryKey: ['advisories'] });
      onClose();
    },
    onError: (err) => notify.error(errorMessage(err)),
  });

  const submit = () => {
    const e: Errors = {};
    if (!form.title.trim()) e.title = 'Required';
    if (!form.description.trim()) e.description = 'Required';
    setErrors(e);
    if (Object.keys(e).length) return;
    save.mutate({
      title: form.title.trim(),
      description: form.description.trim(),
      language: form.language,
      cropId: form.cropId || null,
      season: form.season || null,
      state: form.state.trim() || null,
      district: form.district.trim() || null,
    });
  };

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open onClose={save.isPending ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>{advisory ? 'Edit advisory' : 'New advisory'}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <EnumSelect
              fullWidth
              required
              label="Language"
              values={LANGUAGES}
              labels={LANGUAGE_LABELS}
              value={form.language}
              onChange={(v) => set('language', v as Language)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <CropSelect fullWidth label="Crop" value={form.cropId} onChange={(v) => set('cropId', v)} emptyLabel="General (all crops)" />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <EnumSelect
              fullWidth
              label="Season"
              values={CROP_SEASONS}
              value={form.season}
              onChange={(v) => set('season', v as CropSeason | '')}
              emptyLabel="Any season"
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
              helperText={errors.title ?? `Written in ${languageLabel(form.language)}`}
              slotProps={{ htmlInput: { lang: form.language } }}
            />
          </Grid>
          <Grid size={12}>
            <TextField
              fullWidth
              required
              multiline
              minRows={5}
              label="Advice"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              error={Boolean(errors.description)}
              helperText={errors.description}
              slotProps={{ htmlInput: { lang: form.language } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="State"
              value={form.state}
              onChange={(e) => set('state', e.target.value)}
              helperText="Optional; blank = all regions"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="District"
              value={form.district}
              onChange={(e) => set('district', e.target.value)}
              helperText="Optional"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={save.isPending}>
          Cancel
        </Button>
        <Button variant="contained" onClick={submit} disabled={save.isPending}>
          {save.isPending ? 'Saving…' : advisory ? 'Save changes' : 'Save draft'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function AdvisoriesPage() {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const pagination = usePagination();
  const [cropId, setCropId] = useState('');
  const [language, setLanguage] = useState('');
  const [dialog, setDialog] = useState<{ advisory: Advisory | null; key: number } | null>(null);
  const [deleting, setDeleting] = useState<Advisory | null>(null);
  const [publishing, setPublishing] = useState<Advisory | null>(null);
  const [notifyOnPublish, setNotifyOnPublish] = useState(true);

  const params = { ...pagination.query, cropId: cropId || undefined, language: language || undefined };
  const { data, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['advisories', params],
    queryFn: () => adminApi.advisories(params),
    placeholderData: keepPreviousData,
  });

  const remove = useMutation({
    mutationFn: (a: Advisory) => adminApi.deleteAdvisory(a.id),
    onSuccess: () => {
      notify.success('Advisory deleted');
      setDeleting(null);
      void queryClient.invalidateQueries({ queryKey: ['advisories'] });
    },
    onError: (err) => notify.error(errorMessage(err)),
  });

  const publish = useMutation({
    mutationFn: ({ a, notifyFarmers }: { a: Advisory; notifyFarmers: boolean }) =>
      adminApi.publishAdvisory(a.id, notifyFarmers),
    onSuccess: (res, vars) => {
      notify.success(
        vars.notifyFarmers
          ? `Published. ${res.notified} farmer${res.notified === 1 ? '' : 's'} notified.`
          : 'Published (no notifications sent).',
      );
      setPublishing(null);
      void queryClient.invalidateQueries({ queryKey: ['advisories'] });
      void queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: (err) => notify.error(errorMessage(err)),
  });

  const columns: GridColDef<Advisory>[] = [
    {
      field: 'title',
      headerName: 'Advisory',
      flex: 2,
      minWidth: 240,
      renderCell: ({ row }) => (
        <Box sx={{ py: 1, lineHeight: 1.35 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {row.title}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              whiteSpace: 'normal',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {row.description}
          </Typography>
        </Box>
      ),
    },
    { field: 'language', headerName: 'Language', width: 130, valueFormatter: (v: string) => languageLabel(v) },
    { field: 'crop', headerName: 'Crop', width: 120, valueGetter: (_v, row) => row.crop?.name ?? 'All crops' },
    { field: 'season', headerName: 'Season', width: 100, valueFormatter: (v: string | null) => (v ? humanize(v) : 'Any') },
    {
      field: 'region',
      headerName: 'Region',
      width: 150,
      sortable: false,
      valueGetter: (_v, row) => [row.district, row.state].filter(Boolean).join(', ') || 'All regions',
    },
    {
      field: 'isPublished',
      headerName: 'Status',
      width: 150,
      renderCell: ({ row }) =>
        row.isPublished ? (
          <Tooltip title={row.publishedAt ? `Published ${formatDateTime(row.publishedAt)}` : 'Published'}>
            <Chip size="small" color="success" label={`Published${row.publishedAt ? ` ${formatDate(row.publishedAt)}` : ''}`} />
          </Tooltip>
        ) : (
          <Chip size="small" label="Draft" variant="outlined" />
        ),
    },
    {
      field: 'actions',
      headerName: '',
      width: 130,
      sortable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" sx={{ height: '100%', alignItems: 'center' }}>
          {!row.isPublished && (
            <Tooltip title="Publish">
              <IconButton
                size="small"
                color="primary"
                onClick={() => {
                  setNotifyOnPublish(true);
                  setPublishing(row);
                }}
              >
                <PublishIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => setDialog({ advisory: row, key: Date.now() })}>
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
        title="Advisories"
        subtitle="Crop advice written in one language. Drafts are hidden until published."
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ advisory: null, key: Date.now() })}>
            New advisory
          </Button>
        }
      />
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <CropSelect
              label="Crop"
              value={cropId}
              onChange={(v) => {
                setCropId(v);
                pagination.resetPage();
              }}
              emptyLabel="All crops"
              sx={{ minWidth: 200 }}
            />
            <EnumSelect
              label="Language"
              values={LANGUAGES}
              labels={LANGUAGE_LABELS}
              value={language}
              onChange={(v) => {
                setLanguage(v);
                pagination.resetPage();
              }}
              emptyLabel="All languages"
              sx={{ minWidth: 200 }}
            />
          </Stack>
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
        noRowsLabel="No advisories yet"
        getRowHeight={() => 'auto'}
      />

      {dialog && <AdvisoryDialog key={dialog.key} advisory={dialog.advisory} onClose={() => setDialog(null)} />}

      <ConfirmDialog
        open={Boolean(publishing)}
        title="Publish advisory?"
        confirmLabel={notifyOnPublish ? 'Publish & notify' : 'Publish'}
        pending={publish.isPending}
        onClose={() => setPublishing(null)}
        onConfirm={() => publishing && publish.mutate({ a: publishing, notifyFarmers: notifyOnPublish })}
      >
        <Typography variant="body2" sx={{ mb: 1 }}>
          &ldquo;{publishing?.title}&rdquo; will become visible to farmers in the app.
        </Typography>
        <FormControlLabel
          control={<Switch checked={notifyOnPublish} onChange={(e) => setNotifyOnPublish(e.target.checked)} />}
          label="Also notify matching farmers"
        />
        <Typography variant="caption" color="text.secondary" component="div">
          Matching farmers grow this crop, use {publishing ? languageLabel(publishing.language) : 'this language'} and
          live in the advisory&apos;s region.
        </Typography>
      </ConfirmDialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this advisory?"
        confirmLabel="Delete"
        confirmColor="error"
        pending={remove.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting)}
      >
        <Typography variant="body2">&ldquo;{deleting?.title}&rdquo; will be permanently removed.</Typography>
      </ConfirmDialog>
    </>
  );
}
