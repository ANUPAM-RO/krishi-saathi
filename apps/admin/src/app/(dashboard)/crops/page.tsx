'use client';

import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import EventNoteIcon from '@mui/icons-material/EventNote';
import {
  Box,
  Button,
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
import { CROP_SEASONS, type CropSeason } from '@krishi/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { ErrorAlert } from '@/components/Feedback';
import { LocalizedFields, type LocalizedValue } from '@/components/LocalizedFields';
import { PageHeader } from '@/components/PageHeader';
import { EnumSelect } from '@/components/SelectField';
import { ClientGrid } from '@/components/ServerGrid';
import { useNotify } from '@/components/SnackbarProvider';
import { adminApi, errorMessage } from '@/lib/api';
import { humanize } from '@/lib/format';
import { useCrops } from '@/lib/queries';
import type { AdminCrop, CropInput } from '@/lib/types';

interface FormState {
  code: string;
  name: LocalizedValue;
  localName: string;
  season: CropSeason | '';
  durationDays: string;
  defaultYieldPerAcre: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  code: '',
  name: { en: '', hi: '', bn: '' },
  localName: '',
  season: '',
  durationDays: '',
  defaultYieldPerAcre: '',
  isActive: true,
};

function toForm(c: AdminCrop): FormState {
  return {
    code: c.code,
    name: { en: c.name, hi: c.nameHi, bn: c.nameBn },
    localName: c.localName ?? '',
    season: c.season,
    durationDays: String(c.durationDays),
    defaultYieldPerAcre: c.defaultYieldPerAcre === null ? '' : String(c.defaultYieldPerAcre),
    isActive: c.isActive,
  };
}

type Errors = Partial<Record<'code' | 'season' | 'durationDays' | 'defaultYieldPerAcre' | 'en' | 'hi' | 'bn', string>>;

function validate(f: FormState): Errors {
  const e: Errors = {};
  if (!f.code.trim()) e.code = 'Required';
  else if (!/^[A-Za-z0-9_-]+$/.test(f.code.trim())) e.code = 'Use letters, digits, - and _ only (no spaces)';
  if (!f.name.en.trim()) e.en = 'Required';
  if (!f.name.hi.trim()) e.hi = 'Required';
  if (!f.name.bn.trim()) e.bn = 'Required';
  if (!f.season) e.season = 'Required';
  const d = Number(f.durationDays);
  if (!f.durationDays.trim() || !Number.isInteger(d) || d <= 0) e.durationDays = 'Enter a positive whole number of days';
  if (f.defaultYieldPerAcre.trim()) {
    const y = Number(f.defaultYieldPerAcre);
    if (!Number.isFinite(y) || y <= 0) e.defaultYieldPerAcre = 'Must be a positive number';
  }
  return e;
}

function CropDialog({ crop, open, onClose }: { crop: AdminCrop | null; open: boolean; onClose: () => void }) {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(crop ? toForm(crop) : EMPTY_FORM);
  const [errors, setErrors] = useState<Errors>({});

  const save = useMutation({
    mutationFn: (body: CropInput) => (crop ? adminApi.updateCrop(crop.id, body) : adminApi.createCrop(body)),
    onSuccess: (c) => {
      notify.success(crop ? `Saved ${c.name}` : `Created ${c.name}`);
      void queryClient.invalidateQueries({ queryKey: ['crops'] });
      onClose();
    },
    onError: (err) => notify.error(errorMessage(err)),
  });

  const submit = () => {
    const e = validate(form);
    setErrors(e);
    if (Object.keys(e).length) return;
    save.mutate({
      code: form.code.trim(),
      name: form.name.en.trim(),
      nameHi: form.name.hi.trim(),
      nameBn: form.name.bn.trim(),
      localName: form.localName.trim() || null,
      season: form.season as CropSeason,
      durationDays: Number(form.durationDays),
      defaultYieldPerAcre: form.defaultYieldPerAcre.trim() ? Number(form.defaultYieldPerAcre) : null,
      isActive: form.isActive,
    });
  };

  return (
    <Dialog open={open} onClose={save.isPending ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>{crop ? `Edit crop: ${crop.name}` : 'New crop'}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                required
                label="Code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                error={Boolean(errors.code)}
                helperText={errors.code ?? 'Unique; used by the CSV price import'}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <EnumSelect
                fullWidth
                required
                label="Season"
                values={CROP_SEASONS}
                value={form.season}
                onChange={(v) => setForm({ ...form, season: v as CropSeason })}
                error={Boolean(errors.season)}
                helperText={errors.season}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label="Local name"
                value={form.localName}
                onChange={(e) => setForm({ ...form, localName: e.target.value })}
                helperText="Optional, e.g. Aman dhan"
              />
            </Grid>
          </Grid>
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Crop name
            </Typography>
            <LocalizedFields
              label="Name"
              required
              value={form.name}
              onChange={(name) => setForm({ ...form, name })}
              errors={{ en: errors.en, hi: errors.hi, bn: errors.bn }}
            />
          </Box>
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                required
                type="number"
                label="Duration (days)"
                value={form.durationDays}
                onChange={(e) => setForm({ ...form, durationDays: e.target.value })}
                error={Boolean(errors.durationDays)}
                helperText={errors.durationDays ?? 'Sowing to harvest'}
                slotProps={{ htmlInput: { min: 1, step: 1 } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                type="number"
                label="Default yield per acre (quintal)"
                value={form.defaultYieldPerAcre}
                onChange={(e) => setForm({ ...form, defaultYieldPerAcre: e.target.value })}
                error={Boolean(errors.defaultYieldPerAcre)}
                helperText={errors.defaultYieldPerAcre ?? 'Optional, used for profit estimates'}
                slotProps={{ htmlInput: { min: 0, step: 0.1 } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }} sx={{ display: 'flex', alignItems: 'center' }}>
              <FormControlLabel
                control={
                  <Switch checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                }
                label={form.isActive ? 'Active (visible to farmers)' : 'Inactive (hidden)'}
              />
            </Grid>
          </Grid>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={save.isPending}>
          Cancel
        </Button>
        <Button variant="contained" onClick={submit} disabled={save.isPending}>
          {save.isPending ? 'Saving…' : crop ? 'Save changes' : 'Create crop'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function CropsPage() {
  const { data, isLoading, isFetching, isError, error, refetch } = useCrops();
  const [editing, setEditing] = useState<AdminCrop | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);

  const openDialog = (crop: AdminCrop | null) => {
    setEditing(crop);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  };

  const columns: GridColDef<AdminCrop>[] = [
    { field: 'code', headerName: 'Code', width: 140 },
    { field: 'name', headerName: 'English', flex: 1, minWidth: 130 },
    { field: 'nameHi', headerName: 'Hindi', flex: 1, minWidth: 110 },
    { field: 'nameBn', headerName: 'Bengali', flex: 1, minWidth: 110 },
    { field: 'localName', headerName: 'Local name', width: 130, valueGetter: (v: string | null) => v ?? '—' },
    { field: 'season', headerName: 'Season', width: 110, valueFormatter: (v: string) => humanize(v) },
    { field: 'durationDays', headerName: 'Days', width: 80, type: 'number' },
    {
      field: 'defaultYieldPerAcre',
      headerName: 'Yield q/acre',
      width: 110,
      type: 'number',
      valueFormatter: (v: number | null) => (v === null || v === undefined ? '—' : String(v)),
    },
    { field: 'templateCount', headerName: 'Calendar items', width: 120, type: 'number' },
    {
      field: 'isActive',
      headerName: 'Status',
      width: 100,
      renderCell: ({ value }) => (
        <Chip size="small" label={value ? 'Active' : 'Inactive'} color={value ? 'success' : 'default'} />
      ),
    },
    {
      field: 'actions',
      headerName: '',
      width: 100,
      sortable: false,
      filterable: false,
      renderCell: ({ row }) => (
        <Stack direction="row">
          <Tooltip title="Edit crop">
            <IconButton size="small" onClick={() => openDialog(row)} aria-label={`Edit ${row.name}`}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Crop calendar">
            <IconButton
              size="small"
              component={Link}
              href={`/crops/${row.id}/calendar`}
              aria-label={`Calendar for ${row.name}`}
            >
              <EventNoteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Crop Master"
        subtitle="Crops available to farmers, with names in English, Hindi and Bengali. Inactive crops are hidden from the app."
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => openDialog(null)}>
            New crop
          </Button>
        }
      />
      {isError && <ErrorAlert error={error} onRetry={() => refetch()} />}
      <ClientGrid
        rows={data ?? []}
        columns={columns}
        loading={isLoading || isFetching}
        noRowsLabel="No crops yet. Create the first one."
      />
      {dialogOpen && (
        <CropDialog key={dialogKey} crop={editing} open={dialogOpen} onClose={() => setDialogOpen(false)} />
      )}
    </>
  );
}
