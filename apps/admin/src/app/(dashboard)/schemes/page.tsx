'use client';

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
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
import { LANGUAGES, SCHEME_CATEGORIES, type Language, type SchemeCategory } from '@krishi/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ErrorAlert } from '@/components/Feedback';
import { PageHeader } from '@/components/PageHeader';
import { EnumSelect } from '@/components/SelectField';
import { ServerGrid, usePagination } from '@/components/ServerGrid';
import { useNotify } from '@/components/SnackbarProvider';
import { adminApi, errorMessage } from '@/lib/api';
import { LANGUAGE_LABELS, formatDate, humanize, languageLabel } from '@/lib/format';
import type { Scheme, SchemeInput } from '@/lib/types';

interface FormState {
  title: string;
  summary: string;
  category: SchemeCategory;
  benefits: string;
  eligibility: string;
  howToApply: string;
  documents: string;
  applyUrl: string;
  helpline: string;
  language: Language;
  state: string;
  isPublished: boolean;
}
type Errors = Partial<Record<keyof FormState, string>>;

function toForm(s: Scheme | null): FormState {
  return {
    title: s?.title ?? '',
    summary: s?.summary ?? '',
    category: s?.category ?? 'INCOME_SUPPORT',
    benefits: s?.benefits ?? '',
    eligibility: s?.eligibility ?? '',
    howToApply: s?.howToApply ?? '',
    documents: s?.documents ?? '',
    applyUrl: s?.applyUrl ?? '',
    helpline: s?.helpline ?? '',
    language: s?.language ?? 'bn',
    state: s?.state ?? '',
    isPublished: s?.isPublished ?? false,
  };
}

const LONG_FIELDS: { key: 'benefits' | 'eligibility' | 'howToApply' | 'documents'; label: string }[] = [
  { key: 'benefits', label: 'Benefits' },
  { key: 'eligibility', label: 'Who can apply' },
  { key: 'howToApply', label: 'How to apply' },
  { key: 'documents', label: 'Documents needed' },
];

function SchemeDialog({ scheme, onClose }: { scheme: Scheme | null; onClose: () => void }) {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(() => toForm(scheme));
  const [errors, setErrors] = useState<Errors>({});

  const save = useMutation({
    mutationFn: (body: SchemeInput) => (scheme ? adminApi.updateScheme(scheme.id, body) : adminApi.createScheme(body)),
    onSuccess: (_res, body) => {
      notify.success(
        scheme ? 'Scheme updated' : body.isPublished ? 'Scheme published' : 'Draft saved. Publish it to show it to farmers.',
      );
      void queryClient.invalidateQueries({ queryKey: ['schemes'] });
      onClose();
    },
    onError: (err) => notify.error(errorMessage(err)),
  });

  const submit = () => {
    const e: Errors = {};
    if (!form.title.trim()) e.title = 'Required';
    if (!form.summary.trim()) e.summary = 'Required';
    if (form.applyUrl.trim() && !/^https?:\/\/\S+\.\S+/.test(form.applyUrl.trim())) e.applyUrl = 'Must start with https://';
    setErrors(e);
    if (Object.keys(e).length) return;
    save.mutate({
      title: form.title.trim(),
      summary: form.summary.trim(),
      category: form.category,
      benefits: form.benefits.trim() || null,
      eligibility: form.eligibility.trim() || null,
      howToApply: form.howToApply.trim() || null,
      documents: form.documents.trim() || null,
      applyUrl: form.applyUrl.trim() || null,
      helpline: form.helpline.trim() || null,
      language: form.language,
      state: form.state.trim() || null,
      isPublished: form.isPublished,
    });
  };

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));
  const langInput = { htmlInput: { lang: form.language } };

  return (
    <Dialog open onClose={save.isPending ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>{scheme ? 'Edit scheme' : 'New scheme'}</DialogTitle>
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
            <EnumSelect
              fullWidth
              required
              label="Type"
              values={SCHEME_CATEGORIES}
              value={form.category}
              onChange={(v) => set('category', v as SchemeCategory)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              label="State"
              value={form.state}
              onChange={(e) => set('state', e.target.value)}
              helperText="Blank = central scheme (all states)"
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
              slotProps={langInput}
            />
          </Grid>
          <Grid size={12}>
            <TextField
              fullWidth
              required
              multiline
              minRows={2}
              label="Summary"
              value={form.summary}
              onChange={(e) => set('summary', e.target.value)}
              error={Boolean(errors.summary)}
              helperText={errors.summary ?? 'One or two simple sentences shown in the list'}
              slotProps={langInput}
            />
          </Grid>
          {LONG_FIELDS.map((f) => (
            <Grid key={f.key} size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                multiline
                minRows={3}
                label={f.label}
                value={form[f.key]}
                onChange={(e) => set(f.key, e.target.value)}
                slotProps={langInput}
              />
            </Grid>
          ))}
          <Grid size={{ xs: 12, sm: 8 }}>
            <TextField
              fullWidth
              label="Official website"
              value={form.applyUrl}
              onChange={(e) => set('applyUrl', e.target.value)}
              error={Boolean(errors.applyUrl)}
              helperText={errors.applyUrl ?? 'Opens from the app, e.g. https://pmkisan.gov.in'}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth label="Helpline" value={form.helpline} onChange={(e) => set('helpline', e.target.value)} />
          </Grid>
          <Grid size={12}>
            <FormControlLabel
              control={<Switch checked={form.isPublished} onChange={(e) => set('isPublished', e.target.checked)} />}
              label="Published (visible to farmers)"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={save.isPending}>
          Cancel
        </Button>
        <Button variant="contained" onClick={submit} disabled={save.isPending}>
          {save.isPending ? 'Saving…' : scheme ? 'Save changes' : form.isPublished ? 'Publish' : 'Save draft'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function SchemesPage() {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const pagination = usePagination();
  const [category, setCategory] = useState('');
  const [language, setLanguage] = useState('');
  const [dialog, setDialog] = useState<{ scheme: Scheme | null; key: number } | null>(null);
  const [deleting, setDeleting] = useState<Scheme | null>(null);

  const params = { ...pagination.query, category: category || undefined, language: language || undefined };
  const { data, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['schemes', params],
    queryFn: () => adminApi.schemes(params),
    placeholderData: keepPreviousData,
  });

  const remove = useMutation({
    mutationFn: (s: Scheme) => adminApi.deleteScheme(s.id),
    onSuccess: () => {
      notify.success('Scheme deleted');
      setDeleting(null);
      void queryClient.invalidateQueries({ queryKey: ['schemes'] });
    },
    onError: (err) => notify.error(errorMessage(err)),
  });

  const columns: GridColDef<Scheme>[] = [
    {
      field: 'title',
      headerName: 'Scheme',
      flex: 2,
      minWidth: 260,
      renderCell: ({ row }) => (
        <Box sx={{ py: 1, lineHeight: 1.35 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {row.title}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ whiteSpace: 'normal', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
          >
            {row.summary}
          </Typography>
        </Box>
      ),
    },
    { field: 'category', headerName: 'Type', width: 140, valueFormatter: (v: string) => humanize(v) },
    { field: 'language', headerName: 'Language', width: 120, valueFormatter: (v: string) => languageLabel(v) },
    { field: 'state', headerName: 'Region', width: 140, valueFormatter: (v: string | null) => v ?? 'All India' },
    {
      field: 'isPublished',
      headerName: 'Status',
      width: 150,
      renderCell: ({ row }) =>
        row.isPublished ? (
          <Chip size="small" color="success" label={`Published${row.publishedAt ? ` ${formatDate(row.publishedAt)}` : ''}`} />
        ) : (
          <Chip size="small" label="Draft" variant="outlined" />
        ),
    },
    {
      field: 'actions',
      headerName: '',
      width: 100,
      sortable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" sx={{ height: '100%', alignItems: 'center' }}>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => setDialog({ scheme: row, key: Date.now() })}>
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
        title="Government Schemes"
        subtitle="Scheme information written in one language. Farmers see central schemes and their own state's schemes."
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ scheme: null, key: Date.now() })}>
            New scheme
          </Button>
        }
      />
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <EnumSelect
              label="Type"
              values={SCHEME_CATEGORIES}
              value={category}
              onChange={(v) => {
                setCategory(v);
                pagination.resetPage();
              }}
              emptyLabel="All types"
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
        noRowsLabel="No schemes yet"
        getRowHeight={() => 'auto'}
      />

      {dialog && <SchemeDialog key={dialog.key} scheme={dialog.scheme} onClose={() => setDialog(null)} />}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this scheme?"
        confirmLabel="Delete"
        confirmColor="error"
        pending={remove.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting)}
      >
        <Typography variant="body2">
          &ldquo;{deleting?.title}&rdquo; will be permanently removed. To hide it, edit it and turn off
          &ldquo;Published&rdquo; instead.
        </Typography>
      </ConfirmDialog>
    </>
  );
}
