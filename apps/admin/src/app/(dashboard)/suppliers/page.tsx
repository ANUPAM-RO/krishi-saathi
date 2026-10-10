'use client';

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import VerifiedIcon from '@mui/icons-material/Verified';
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
  MenuItem,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { SUPPLIER_CATEGORIES, type SupplierCategory } from '@krishi/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ErrorAlert } from '@/components/Feedback';
import { PageHeader } from '@/components/PageHeader';
import { EnumSelect } from '@/components/SelectField';
import { ServerGrid, usePagination } from '@/components/ServerGrid';
import { useNotify } from '@/components/SnackbarProvider';
import { adminApi, errorMessage } from '@/lib/api';
import { humanize } from '@/lib/format';
import type { Supplier, SupplierInput } from '@/lib/types';

interface FormState {
  name: string;
  categories: SupplierCategory[];
  contactPerson: string;
  phone: string;
  address: string;
  village: string;
  district: string;
  state: string;
  latitude: string;
  longitude: string;
  description: string;
  isVerified: boolean;
  isActive: boolean;
}
type Errors = Partial<Record<keyof FormState, string>>;

function toForm(s: Supplier | null): FormState {
  return {
    name: s?.name ?? '',
    categories: s?.categories ?? [],
    contactPerson: s?.contactPerson ?? '',
    phone: s?.phone ?? '',
    address: s?.address ?? '',
    village: s?.village ?? '',
    district: s?.district ?? '',
    state: s?.state ?? 'West Bengal',
    latitude: s?.latitude?.toString() ?? '',
    longitude: s?.longitude?.toString() ?? '',
    description: s?.description ?? '',
    isVerified: s?.isVerified ?? false,
    isActive: s?.isActive ?? true,
  };
}

function parseCoord(v: string, max: number): number | null | 'invalid' {
  if (!v.trim()) return null;
  const n = Number(v);
  return Number.isFinite(n) && Math.abs(n) <= max ? n : 'invalid';
}

function SupplierDialog({ supplier, onClose }: { supplier: Supplier | null; onClose: () => void }) {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(() => toForm(supplier));
  const [errors, setErrors] = useState<Errors>({});

  const save = useMutation({
    mutationFn: (body: SupplierInput) =>
      supplier ? adminApi.updateSupplier(supplier.id, body) : adminApi.createSupplier(body),
    onSuccess: () => {
      notify.success(supplier ? 'Supplier updated' : 'Supplier added');
      void queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      onClose();
    },
    onError: (err) => notify.error(errorMessage(err)),
  });

  const submit = () => {
    const e: Errors = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!form.categories.length) e.categories = 'Pick at least one';
    if (!form.district.trim()) e.district = 'Required';
    if (!form.state.trim()) e.state = 'Required';
    if (form.phone.trim() && !/^\+?[0-9 -]{8,16}$/.test(form.phone.trim())) e.phone = 'Digits only, e.g. +91 98765 43210';
    const latitude = parseCoord(form.latitude, 90);
    const longitude = parseCoord(form.longitude, 180);
    if (latitude === 'invalid') e.latitude = 'Between -90 and 90';
    if (longitude === 'invalid') e.longitude = 'Between -180 and 180';
    if ((latitude === null) !== (longitude === null)) e.longitude = 'Enter both latitude and longitude';
    setErrors(e);
    if (Object.keys(e).length || latitude === 'invalid' || longitude === 'invalid') return;
    save.mutate({
      name: form.name.trim(),
      categories: form.categories,
      contactPerson: form.contactPerson.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      village: form.village.trim() || null,
      district: form.district.trim(),
      state: form.state.trim(),
      latitude,
      longitude,
      description: form.description.trim() || null,
      isVerified: form.isVerified,
      isActive: form.isActive,
    });
  };

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open onClose={save.isPending ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>{supplier ? 'Edit supplier' : 'New supplier'}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 7 }}>
            <TextField
              fullWidth
              required
              label="Business name"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              error={Boolean(errors.name)}
              helperText={errors.name}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 5 }}>
            <TextField
              select
              fullWidth
              required
              label="Offers"
              value={form.categories}
              onChange={(e) => {
                const v = e.target.value as unknown as SupplierCategory[] | string;
                set('categories', (typeof v === 'string' ? v.split(',') : v) as SupplierCategory[]);
              }}
              error={Boolean(errors.categories)}
              helperText={errors.categories}
              slotProps={{
                select: {
                  multiple: true,
                  renderValue: (v) => (v as string[]).map(humanize).join(', '),
                },
              }}
            >
              {SUPPLIER_CATEGORIES.map((c) => (
                <MenuItem key={c} value={c}>
                  {humanize(c)}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Phone"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              error={Boolean(errors.phone)}
              helperText={errors.phone ?? 'Farmers can call this number from the app'}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Contact person"
              value={form.contactPerson}
              onChange={(e) => set('contactPerson', e.target.value)}
            />
          </Grid>
          <Grid size={12}>
            <TextField fullWidth label="Address" value={form.address} onChange={(e) => set('address', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth label="Village / town" value={form.village} onChange={(e) => set('village', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              required
              label="District"
              value={form.district}
              onChange={(e) => set('district', e.target.value)}
              error={Boolean(errors.district)}
              helperText={errors.district}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              required
              label="State"
              value={form.state}
              onChange={(e) => set('state', e.target.value)}
              error={Boolean(errors.state)}
              helperText={errors.state}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Latitude"
              value={form.latitude}
              onChange={(e) => set('latitude', e.target.value)}
              error={Boolean(errors.latitude)}
              helperText={errors.latitude ?? 'Needed for "nearby" sorting, e.g. 23.2324'}
              slotProps={{ htmlInput: { inputMode: 'decimal' } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Longitude"
              value={form.longitude}
              onChange={(e) => set('longitude', e.target.value)}
              error={Boolean(errors.longitude)}
              helperText={errors.longitude ?? 'Without coordinates the supplier is only shown in its district'}
              slotProps={{ htmlInput: { inputMode: 'decimal' } }}
            />
          </Grid>
          <Grid size={12}>
            <TextField
              fullWidth
              multiline
              minRows={2}
              label="What they offer"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              helperText="Short note shown to farmers, e.g. brands, hire rates, repair service"
            />
          </Grid>
          <Grid size={12}>
            <Stack direction="row" spacing={3}>
              <FormControlLabel
                control={<Switch checked={form.isVerified} onChange={(e) => set('isVerified', e.target.checked)} />}
                label="Verified by our team"
              />
              <FormControlLabel
                control={<Switch checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} />}
                label="Show in app"
              />
            </Stack>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={save.isPending}>
          Cancel
        </Button>
        <Button variant="contained" onClick={submit} disabled={save.isPending}>
          {save.isPending ? 'Saving…' : supplier ? 'Save changes' : 'Add supplier'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function SuppliersPage() {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const pagination = usePagination();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [district, setDistrict] = useState('');
  const [dialog, setDialog] = useState<{ supplier: Supplier | null; key: number } | null>(null);
  const [deleting, setDeleting] = useState<Supplier | null>(null);

  const params = {
    ...pagination.query,
    search: search.trim() || undefined,
    category: category || undefined,
    district: district.trim() || undefined,
  };
  const { data, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['suppliers', params],
    queryFn: () => adminApi.suppliers(params),
    placeholderData: keepPreviousData,
  });

  const remove = useMutation({
    mutationFn: (s: Supplier) => adminApi.deleteSupplier(s.id),
    onSuccess: () => {
      notify.success('Supplier deleted');
      setDeleting(null);
      void queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
    onError: (err) => notify.error(errorMessage(err)),
  });

  const columns: GridColDef<Supplier>[] = [
    {
      field: 'name',
      headerName: 'Supplier',
      flex: 2,
      minWidth: 240,
      renderCell: ({ row }) => (
        <Box sx={{ py: 1, lineHeight: 1.35 }}>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {row.name}
            </Typography>
            {row.isVerified && (
              <Tooltip title="Verified">
                <VerifiedIcon color="primary" sx={{ fontSize: 16 }} />
              </Tooltip>
            )}
          </Stack>
          {row.description && (
            <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'normal' }}>
              {row.description}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      field: 'categories',
      headerName: 'Offers',
      width: 220,
      sortable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5, py: 1 }}>
          {row.categories.map((c) => (
            <Chip key={c} size="small" label={humanize(c)} />
          ))}
        </Stack>
      ),
    },
    { field: 'phone', headerName: 'Phone', width: 150, valueFormatter: (v: string | null) => v ?? '—' },
    {
      field: 'location',
      headerName: 'Location',
      width: 200,
      sortable: false,
      valueGetter: (_v, row) => [row.village, row.district].filter(Boolean).join(', '),
    },
    {
      field: 'mapped',
      headerName: 'On map',
      width: 90,
      sortable: false,
      valueGetter: (_v, row) => (row.latitude != null && row.longitude != null ? 'Yes' : 'No'),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      sortable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={0.5} sx={{ height: '100%', alignItems: 'center' }}>
          {row.isActive ? <Chip size="small" color="success" label="Shown" /> : <Chip size="small" variant="outlined" label="Hidden" />}
          {row.source === 'sample-seed' && <Chip size="small" color="warning" label="Sample" />}
        </Stack>
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
            <IconButton size="small" onClick={() => setDialog({ supplier: row, key: Date.now() })}>
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
        title="Suppliers"
        subtitle="Tractor, pump, fertilizer, seed and pesticide suppliers shown to farmers by distance."
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ supplier: null, key: Date.now() })}>
            New supplier
          </Button>
        }
      />
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Search name, phone or village"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                pagination.resetPage();
              }}
              sx={{ minWidth: 260 }}
            />
            <EnumSelect
              label="Offers"
              values={SUPPLIER_CATEGORIES}
              value={category}
              onChange={(v) => {
                setCategory(v);
                pagination.resetPage();
              }}
              emptyLabel="All"
              sx={{ minWidth: 180 }}
            />
            <TextField
              label="District"
              value={district}
              onChange={(e) => {
                setDistrict(e.target.value);
                pagination.resetPage();
              }}
              sx={{ minWidth: 180 }}
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
        noRowsLabel="No suppliers yet"
        getRowHeight={() => 'auto'}
      />

      {dialog && <SupplierDialog key={dialog.key} supplier={dialog.supplier} onClose={() => setDialog(null)} />}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this supplier?"
        confirmLabel="Delete"
        confirmColor="error"
        pending={remove.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting)}
      >
        <Typography variant="body2">
          &ldquo;{deleting?.name}&rdquo; will be permanently removed. To hide it temporarily, edit it and turn off
          &ldquo;Show in app&rdquo; instead.
        </Typography>
      </ConfirmDialog>
    </>
  );
}
