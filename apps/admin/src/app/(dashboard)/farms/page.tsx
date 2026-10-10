'use client';

import SearchIcon from '@mui/icons-material/Search';
import { Box, Card, CardContent, InputAdornment, Link as MuiLink, Stack, TextField, Typography } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { ErrorAlert } from '@/components/Feedback';
import { PageHeader } from '@/components/PageHeader';
import { ServerGrid, useDebounced, usePagination } from '@/components/ServerGrid';
import { adminApi } from '@/lib/api';
import { formatDate, humanize } from '@/lib/format';
import type { AdminFarm } from '@/lib/types';

const columns: GridColDef<AdminFarm>[] = [
  { field: 'name', headerName: 'Farm', flex: 1, minWidth: 150 },
  {
    field: 'user',
    headerName: 'Owner',
    flex: 1,
    minWidth: 180,
    sortable: false,
    renderCell: ({ row }) => (
      <Box sx={{ lineHeight: 1.3, py: 0.5 }}>
        <MuiLink component={Link} href={`/farmers/${row.user.id}`} onClick={(e) => e.stopPropagation()}>
          {row.user.name || '(no name)'}
        </MuiLink>
        <Typography variant="caption" color="text.secondary" component="div">
          {row.user.phone}
        </Typography>
      </Box>
    ),
  },
  {
    field: 'area',
    headerName: 'Area',
    width: 120,
    valueGetter: (_v, row) => `${row.area} ${humanize(row.areaUnit)}`,
  },
  { field: 'village', headerName: 'Village', width: 130, valueGetter: (v: string | null) => v ?? '—' },
  { field: 'district', headerName: 'District', width: 130, valueGetter: (v: string | null) => v ?? '—' },
  { field: 'soilType', headerName: 'Soil', width: 110, valueFormatter: (v: string | null) => humanize(v) },
  {
    field: 'irrigationAvailable',
    headerName: 'Irrigation',
    width: 100,
    valueFormatter: (v: boolean) => (v ? 'Yes' : 'No'),
  },
  { field: 'cropCount', headerName: 'Crops', width: 80, type: 'number' },
  { field: 'createdAt', headerName: 'Added', width: 120, valueFormatter: (v: string) => formatDate(v) },
];

export default function FarmsPage() {
  const pagination = usePagination();
  const [search, setSearch] = useState('');
  const [district, setDistrict] = useState('');
  const debouncedSearch = useDebounced(search.trim());
  const debouncedDistrict = useDebounced(district.trim());

  const params = {
    ...pagination.query,
    search: debouncedSearch || undefined,
    district: debouncedDistrict || undefined,
  };
  const { data, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['farms', params],
    queryFn: () => adminApi.farms(params),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader title="Farms" subtitle="All farms registered by farmers, with owner details." />
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              label="Search farm, owner name or phone"
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
        noRowsLabel="No farms match these filters"
        getRowHeight={() => 'auto'}
      />
    </>
  );
}
