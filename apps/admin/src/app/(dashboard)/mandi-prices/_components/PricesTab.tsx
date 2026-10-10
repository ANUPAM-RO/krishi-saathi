'use client';

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { PRICE_UNITS, type PriceUnit } from '@krishi/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ErrorAlert } from '@/components/Feedback';
import { CropSelect, EnumSelect, MandiSelect } from '@/components/SelectField';
import { ServerGrid, usePagination } from '@/components/ServerGrid';
import { useNotify } from '@/components/SnackbarProvider';
import { adminApi, errorMessage } from '@/lib/api';
import { dateOnly, formatDate, formatDateTime, formatINR, humanize, todayISO } from '@/lib/format';
import type { MandiPrice, MandiPriceInput } from '@/lib/types';

interface FormState {
  mandiId: string;
  cropId: string;
  price: string;
  minPrice: string;
  maxPrice: string;
  unit: PriceUnit;
  priceDate: string;
  source: string;
}

type Errors = Partial<Record<keyof FormState, string>>;

function toForm(p: MandiPrice | null): FormState {
  if (!p) {
    return { mandiId: '', cropId: '', price: '', minPrice: '', maxPrice: '', unit: 'QUINTAL', priceDate: todayISO(), source: '' };
  }
  return {
    mandiId: p.mandi.id,
    cropId: p.crop.id,
    price: String(p.price),
    minPrice: p.minPrice === null ? '' : String(p.minPrice),
    maxPrice: p.maxPrice === null ? '' : String(p.maxPrice),
    unit: p.unit,
    priceDate: dateOnly(p.priceDate),
    source: p.source ?? '',
  };
}

function validate(f: FormState): Errors {
  const e: Errors = {};
  if (!f.mandiId) e.mandiId = 'Required';
  if (!f.cropId) e.cropId = 'Required';
  const price = Number(f.price);
  if (!f.price.trim() || !Number.isFinite(price) || price <= 0) e.price = 'Enter a positive amount';
  const min = f.minPrice.trim() ? Number(f.minPrice) : null;
  const max = f.maxPrice.trim() ? Number(f.maxPrice) : null;
  if (min !== null && (!Number.isFinite(min) || min <= 0)) e.minPrice = 'Must be positive';
  if (max !== null && (!Number.isFinite(max) || max <= 0)) e.maxPrice = 'Must be positive';
  if (!e.minPrice && min !== null && !e.price && min > price) e.minPrice = 'Min cannot exceed modal price';
  if (!e.maxPrice && max !== null && !e.price && max < price) e.maxPrice = 'Max cannot be below modal price';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.priceDate)) e.priceDate = 'Required';
  return e;
}

function PriceDialog({ price, onClose }: { price: MandiPrice | null; onClose: () => void }) {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(() => toForm(price));
  const [errors, setErrors] = useState<Errors>({});

  const save = useMutation({
    mutationFn: (body: MandiPriceInput) =>
      price ? adminApi.updateMandiPrice(price.id, body) : adminApi.createMandiPrice(body),
    onSuccess: () => {
      notify.success(price ? 'Price updated' : 'Price saved');
      void queryClient.invalidateQueries({ queryKey: ['mandi-prices'] });
      void queryClient.invalidateQueries({ queryKey: ['stats'] });
      onClose();
    },
    onError: (err) => notify.error(errorMessage(err)),
  });

  const submit = () => {
    const e = validate(form);
    setErrors(e);
    if (Object.keys(e).length) return;
    save.mutate({
      mandiId: form.mandiId,
      cropId: form.cropId,
      price: Number(form.price),
      minPrice: form.minPrice.trim() ? Number(form.minPrice) : null,
      maxPrice: form.maxPrice.trim() ? Number(form.maxPrice) : null,
      unit: form.unit,
      priceDate: form.priceDate,
      source: form.source.trim() || undefined,
    });
  };

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open onClose={save.isPending ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{price ? 'Edit price' : 'Add price'}</DialogTitle>
      <DialogContent dividers>
        {!price && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            If a price already exists for this mandi, crop and date, it is replaced.
          </Typography>
        )}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <MandiSelect
              fullWidth
              required
              label="Mandi"
              value={form.mandiId}
              onChange={(v) => set('mandiId', v)}
              error={Boolean(errors.mandiId)}
              helperText={errors.mandiId}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CropSelect
              fullWidth
              required
              label="Crop"
              value={form.cropId}
              onChange={(v) => set('cropId', v)}
              error={Boolean(errors.cropId)}
              helperText={errors.cropId}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              required
              type="date"
              label="Price date"
              value={form.priceDate}
              onChange={(e) => set('priceDate', e.target.value)}
              error={Boolean(errors.priceDate)}
              helperText={errors.priceDate}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <EnumSelect
              fullWidth
              label="Unit"
              values={PRICE_UNITS}
              value={form.unit}
              onChange={(v) => set('unit', v as PriceUnit)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              required
              type="number"
              label="Modal price (₹)"
              value={form.price}
              onChange={(e) => set('price', e.target.value)}
              error={Boolean(errors.price)}
              helperText={errors.price}
              slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4 }}>
            <TextField
              fullWidth
              type="number"
              label="Min price (₹)"
              value={form.minPrice}
              onChange={(e) => set('minPrice', e.target.value)}
              error={Boolean(errors.minPrice)}
              helperText={errors.minPrice}
              slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4 }}>
            <TextField
              fullWidth
              type="number"
              label="Max price (₹)"
              value={form.maxPrice}
              onChange={(e) => set('maxPrice', e.target.value)}
              error={Boolean(errors.maxPrice)}
              helperText={errors.maxPrice}
              slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
            />
          </Grid>
          <Grid size={12}>
            <TextField
              fullWidth
              label="Source"
              value={form.source}
              onChange={(e) => set('source', e.target.value)}
              helperText="Optional, e.g. Agmarknet or a field officer's name"
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

export function PricesTab() {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const pagination = usePagination();
  const [cropId, setCropId] = useState('');
  const [mandiId, setMandiId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [dialog, setDialog] = useState<{ price: MandiPrice | null; key: number } | null>(null);
  const [deleting, setDeleting] = useState<MandiPrice | null>(null);

  const rangeInvalid = Boolean(from && to && from > to);
  const params = {
    ...pagination.query,
    cropId: cropId || undefined,
    mandiId: mandiId || undefined,
    from: rangeInvalid ? undefined : from || undefined,
    to: rangeInvalid ? undefined : to || undefined,
  };
  const { data, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['mandi-prices', params],
    queryFn: () => adminApi.mandiPrices(params),
    placeholderData: keepPreviousData,
  });

  const remove = useMutation({
    mutationFn: (p: MandiPrice) => adminApi.deleteMandiPrice(p.id),
    onSuccess: () => {
      notify.success('Price deleted');
      setDeleting(null);
      void queryClient.invalidateQueries({ queryKey: ['mandi-prices'] });
    },
    onError: (err) => notify.error(errorMessage(err)),
  });

  const filterChange = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    pagination.resetPage();
  };

  const columns: GridColDef<MandiPrice>[] = [
    { field: 'priceDate', headerName: 'Date', width: 120, valueFormatter: (v: string) => formatDate(v) },
    {
      field: 'crop',
      headerName: 'Crop',
      flex: 1,
      minWidth: 140,
      valueGetter: (_v, row) => `${row.crop.name} (${row.crop.code})`,
    },
    {
      field: 'mandi',
      headerName: 'Mandi',
      flex: 1,
      minWidth: 170,
      valueGetter: (_v, row) => `${row.mandi.name}, ${row.mandi.district}`,
    },
    {
      field: 'price',
      headerName: 'Modal price',
      width: 120,
      type: 'number',
      valueFormatter: (v: number) => formatINR(v),
    },
    { field: 'minPrice', headerName: 'Min', width: 110, type: 'number', valueFormatter: (v: number | null) => formatINR(v) },
    { field: 'maxPrice', headerName: 'Max', width: 110, type: 'number', valueFormatter: (v: number | null) => formatINR(v) },
    { field: 'unit', headerName: 'Per', width: 90, valueFormatter: (v: string) => humanize(v) },
    { field: 'source', headerName: 'Source', width: 120, valueGetter: (v: string | null) => v || '—' },
    { field: 'updatedAt', headerName: 'Updated', width: 170, valueFormatter: (v: string) => formatDateTime(v) },
    {
      field: 'actions',
      headerName: '',
      width: 96,
      sortable: false,
      renderCell: ({ row }) => (
        <Stack direction="row">
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => setDialog({ price: row, key: Date.now() })}>
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
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { md: 'flex-start' } }}>
            <CropSelect label="Crop" value={cropId} onChange={filterChange(setCropId)} emptyLabel="All crops" sx={{ flex: 1, minWidth: 160 }} />
            <MandiSelect label="Mandi" value={mandiId} onChange={filterChange(setMandiId)} emptyLabel="All mandis" sx={{ flex: 1, minWidth: 160 }} />
            <TextField
              type="date"
              label="From"
              value={from}
              onChange={(e) => filterChange(setFrom)(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              error={rangeInvalid}
            />
            <TextField
              type="date"
              label="To"
              value={to}
              onChange={(e) => filterChange(setTo)(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              error={rangeInvalid}
              helperText={rangeInvalid ? '"To" must be on or after "From"' : undefined}
            />
            <Box sx={{ flexShrink: 0 }}>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ price: null, key: Date.now() })}>
                Add price
              </Button>
            </Box>
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
        noRowsLabel="No prices match these filters"
      />

      {dialog && <PriceDialog key={dialog.key} price={dialog.price} onClose={() => setDialog(null)} />}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this price?"
        confirmLabel="Delete"
        confirmColor="error"
        pending={remove.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting)}
      >
        {deleting && (
          <Typography variant="body2">
            {deleting.crop.name} at {deleting.mandi.name} on {formatDate(deleting.priceDate)}: {formatINR(deleting.price)}
          </Typography>
        )}
      </ConfirmDialog>
    </>
  );
}
