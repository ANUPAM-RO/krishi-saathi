'use client';

import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
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
  Switch,
  TextField,
  Tooltip,
} from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ErrorAlert } from '@/components/Feedback';
import { ClientGrid } from '@/components/ServerGrid';
import { useNotify } from '@/components/SnackbarProvider';
import { adminApi, errorMessage } from '@/lib/api';
import { useMandis } from '@/lib/queries';
import type { Mandi, MandiInput } from '@/lib/types';

interface FormState {
  name: string;
  district: string;
  state: string;
  latitude: string;
  longitude: string;
  isActive: boolean;
}
type Errors = Partial<Record<keyof FormState, string>>;

function toForm(m: Mandi | null): FormState {
  return {
    name: m?.name ?? '',
    district: m?.district ?? '',
    state: m?.state ?? 'West Bengal',
    latitude: m?.latitude === null || m?.latitude === undefined ? '' : String(m.latitude),
    longitude: m?.longitude === null || m?.longitude === undefined ? '' : String(m.longitude),
    isActive: m?.isActive ?? true,
  };
}

function validate(f: FormState): Errors {
  const e: Errors = {};
  if (!f.name.trim()) e.name = 'Required';
  if (!f.district.trim()) e.district = 'Required';
  if (!f.state.trim()) e.state = 'Required';
  if (f.latitude.trim()) {
    const v = Number(f.latitude);
    if (!Number.isFinite(v) || v < -90 || v > 90) e.latitude = 'Between -90 and 90';
  }
  if (f.longitude.trim()) {
    const v = Number(f.longitude);
    if (!Number.isFinite(v) || v < -180 || v > 180) e.longitude = 'Between -180 and 180';
  }
  if (Boolean(f.latitude.trim()) !== Boolean(f.longitude.trim())) {
    e[f.latitude.trim() ? 'longitude' : 'latitude'] = 'Enter both latitude and longitude';
  }
  return e;
}

function MandiDialog({ mandi, onClose }: { mandi: Mandi | null; onClose: () => void }) {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(() => toForm(mandi));
  const [errors, setErrors] = useState<Errors>({});

  const save = useMutation({
    mutationFn: (body: MandiInput) => (mandi ? adminApi.updateMandi(mandi.id, body) : adminApi.createMandi(body)),
    onSuccess: (m) => {
      notify.success(mandi ? `Saved ${m.name}` : `Created ${m.name}`);
      void queryClient.invalidateQueries({ queryKey: ['mandis'] });
      onClose();
    },
    onError: (err) => notify.error(errorMessage(err)),
  });

  const submit = () => {
    const e = validate(form);
    setErrors(e);
    if (Object.keys(e).length) return;
    save.mutate({
      name: form.name.trim(),
      district: form.district.trim(),
      state: form.state.trim(),
      latitude: form.latitude.trim() ? Number(form.latitude) : null,
      longitude: form.longitude.trim() ? Number(form.longitude) : null,
      isActive: form.isActive,
    });
  };

  const field = (k: 'name' | 'district' | 'state' | 'latitude' | 'longitude', label: string, required = false) => (
    <TextField
      fullWidth
      required={required}
      label={label}
      value={form[k]}
      onChange={(e) => setForm({ ...form, [k]: e.target.value })}
      error={Boolean(errors[k])}
      helperText={errors[k]}
      type={k === 'latitude' || k === 'longitude' ? 'number' : 'text'}
      slotProps={k === 'latitude' || k === 'longitude' ? { htmlInput: { step: 'any' } } : undefined}
    />
  );

  return (
    <Dialog open onClose={save.isPending ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{mandi ? 'Edit mandi' : 'New mandi'}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid size={12}>{field('name', 'Mandi name', true)}</Grid>
          <Grid size={{ xs: 12, sm: 6 }}>{field('district', 'District', true)}</Grid>
          <Grid size={{ xs: 12, sm: 6 }}>{field('state', 'State', true)}</Grid>
          <Grid size={{ xs: 6 }}>{field('latitude', 'Latitude')}</Grid>
          <Grid size={{ xs: 6 }}>{field('longitude', 'Longitude')}</Grid>
          <Grid size={12}>
            <FormControlLabel
              control={
                <Switch checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              }
              label={form.isActive ? 'Active' : 'Inactive'}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={save.isPending}>
          Cancel
        </Button>
        <Button variant="contained" onClick={submit} disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function MandisTab() {
  const { data, isLoading, isFetching, isError, error, refetch } = useMandis();
  const [dialog, setDialog] = useState<{ mandi: Mandi | null; key: number } | null>(null);

  const columns: GridColDef<Mandi>[] = [
    { field: 'name', headerName: 'Mandi', flex: 1, minWidth: 180 },
    { field: 'district', headerName: 'District', flex: 1, minWidth: 140 },
    { field: 'state', headerName: 'State', width: 140 },
    {
      field: 'location',
      headerName: 'Location',
      width: 170,
      sortable: false,
      valueGetter: (_v, row) =>
        row.latitude !== null && row.longitude !== null ? `${row.latitude}, ${row.longitude}` : '—',
    },
    {
      field: 'isActive',
      headerName: 'Status',
      width: 100,
      renderCell: ({ value }) =>
        value === false ? <Chip size="small" label="Inactive" /> : <Chip size="small" color="success" label="Active" />,
    },
    {
      field: 'actions',
      headerName: '',
      width: 60,
      sortable: false,
      renderCell: ({ row }) => (
        <Tooltip title="Edit">
          <IconButton size="small" onClick={() => setDialog({ mandi: row, key: Date.now() })}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ mandi: null, key: Date.now() })}>
          New mandi
        </Button>
      </Box>
      {isError && <ErrorAlert error={error} onRetry={() => refetch()} />}
      <ClientGrid
        rows={data ?? []}
        columns={columns}
        loading={isLoading || isFetching}
        noRowsLabel="No mandis yet. Add one, or import prices to create them automatically."
      />
      {dialog && <MandiDialog key={dialog.key} mandi={dialog.mandi} onClose={() => setDialog(null)} />}
    </>
  );
}
