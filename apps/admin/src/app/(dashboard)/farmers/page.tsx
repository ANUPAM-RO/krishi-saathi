'use client';

import SearchIcon from '@mui/icons-material/Search';
import { Card, CardContent, Chip, InputAdornment, Stack, TextField } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ErrorAlert } from '@/components/Feedback';
import { PageHeader } from '@/components/PageHeader';
import { SelectField } from '@/components/SelectField';
import { ServerGrid, useDebounced, usePagination } from '@/components/ServerGrid';
import { adminApi } from '@/lib/api';
import { formatDate, formatDateTime, languageLabel } from '@/lib/format';
import type { AdminFarmerListItem } from '@/lib/types';

const columns: GridColDef<AdminFarmerListItem>[] = [
  { field: 'name', headerName: 'Name', flex: 1, minWidth: 160, valueGetter: (v: string | null) => v ?? '(no name)' },
  { field: 'phone', headerName: 'Phone', width: 140 },
  { field: 'village', headerName: 'Village', width: 130, valueGetter: (v: string | null) => v ?? '—' },
  { field: 'district', headerName: 'District', width: 130, valueGetter: (v: string | null) => v ?? '—' },
  { field: 'language', headerName: 'Language', width: 140, valueFormatter: (v: string) => languageLabel(v) },
  { field: 'farmCount', headerName: 'Farms', width: 80, type: 'number' },
  { field: 'activeCropCount', headerName: 'Active crops', width: 110, type: 'number' },
  {
    field: 'isActive',
    headerName: 'Status',
    width: 110,
    renderCell: ({ value }) => (
      <Chip size="small" label={value ? 'Active' : 'Inactive'} color={value ? 'success' : 'default'} />
    ),
  },
  {
    field: 'lastLoginAt',
    headerName: 'Last login',
    width: 180,
    valueFormatter: (v: string | null) => (v ? formatDateTime(v) : 'Never'),
  },
  { field: 'createdAt', headerName: 'Joined', width: 120, valueFormatter: (v: string) => formatDate(v) },
];

export default function FarmersPage() {
  const router = useRouter();
  const pagination = usePagination();
  const [search, setSearch] = useState('');
  const [district, setDistrict] = useState('');
  const [active, setActive] = useState('');
  const debouncedSearch = useDebounced(search.trim());
  const debouncedDistrict = useDebounced(district.trim());

  const params = {
    ...pagination.query,
    search: debouncedSearch || undefined,
    district: debouncedDistrict || undefined,
    isActive: active === '' ? undefined : active === 'true',
  };
  const { data, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['farmers', params],
    queryFn: () => adminApi.farmers(params),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader title="Farmers" subtitle="Registered farmers. Click a row to see their profile, farms and crops." />
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              label="Search name or phone"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                pagination.resetPage();
              }}
              sx={{ flex: 2 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TextField
              label="District"
              value={district}
              onChange={(e) => {
                setDistrict(e.target.value);
                pagination.resetPage();
              }}
              sx={{ flex: 1 }}
            />
            <SelectField
              label="Status"
              value={active}
              onChange={(v) => {
                setActive(v);
                pagination.resetPage();
              }}
              emptyLabel="All"
              options={[
                { value: 'true', label: 'Active' },
                { value: 'false', label: 'Inactive' },
              ]}
              sx={{ flex: 1, minWidth: 140 }}
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
        noRowsLabel="No farmers match these filters"
        onRowClick={(p) => router.push(`/farmers/${p.id}`)}
      />
    </>
  );
}
