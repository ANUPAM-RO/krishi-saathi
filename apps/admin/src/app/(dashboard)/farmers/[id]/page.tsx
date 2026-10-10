'use client';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  FormControlLabel,
  Grid,
  LinearProgress,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState, ErrorAlert, ListSkeleton } from '@/components/Feedback';
import { PageHeader } from '@/components/PageHeader';
import { useNotify } from '@/components/SnackbarProvider';
import { adminApi, errorMessage } from '@/lib/api';
import { formatDate, formatDateTime, humanize, languageLabel } from '@/lib/format';
import type { FarmerCropStatus } from '@krishi/shared';

const STATUS_COLOR: Record<FarmerCropStatus, 'default' | 'success' | 'info' | 'error'> = {
  PLANNED: 'info',
  ACTIVE: 'success',
  HARVESTED: 'default',
  FAILED: 'error',
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body1">{value || '—'}</Typography>
    </Box>
  );
}

export default function FarmerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const notify = useNotify();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['farmer', id],
    queryFn: () => adminApi.farmer(id),
  });

  const toggle = useMutation({
    mutationFn: (isActive: boolean) => adminApi.updateFarmer(id, { isActive }),
    onSuccess: (user) => {
      notify.success(user.isActive ? 'Farmer activated' : 'Farmer deactivated');
      setConfirmOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['farmer', id] });
      void queryClient.invalidateQueries({ queryKey: ['farmers'] });
    },
    onError: (err) => notify.error(errorMessage(err)),
  });

  const back = (
    <Button component={Link} href="/farmers" startIcon={<ArrowBackIcon />} size="small" sx={{ mb: 1 }}>
      All farmers
    </Button>
  );

  if (isLoading) {
    return (
      <>
        <PageHeader title="Farmer" breadcrumb={back} />
        <ListSkeleton rows={6} />
      </>
    );
  }
  if (isError || !data) {
    return (
      <>
        <PageHeader title="Farmer" breadcrumb={back} />
        <ErrorAlert error={error ?? new Error('Farmer not found')} onRetry={() => refetch()} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        breadcrumb={back}
        title={data.name || data.phone}
        subtitle={`${data.role} · joined ${formatDate(data.createdAt)}`}
        actions={
          <FormControlLabel
            control={
              <Switch
                checked={data.isActive}
                disabled={toggle.isPending}
                onChange={() => (data.isActive ? setConfirmOpen(true) : toggle.mutate(true))}
              />
            }
            label={data.isActive ? 'Account active' : 'Account inactive'}
          />
        }
      />

      <Card sx={{ mb: 3 }}>
        <CardHeader title="Profile" slotProps={{ title: { variant: 'h6' } }} />
        <CardContent>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, md: 3 }}>
              <Field label="Name" value={data.name} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Field label="Phone" value={data.phone} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Field label="Language" value={languageLabel(data.language)} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Field
                label="Status"
                value={
                  <Chip
                    size="small"
                    label={data.isActive ? 'Active' : 'Inactive'}
                    color={data.isActive ? 'success' : 'default'}
                  />
                }
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Field label="Village" value={data.village} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Field label="District" value={data.district} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Field label="State" value={data.state} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Field label="Registered" value={formatDateTime(data.createdAt)} />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Typography variant="h6" sx={{ mb: 1.5 }}>
        Farms ({data.farms.length})
      </Typography>
      {data.farms.length === 0 ? (
        <Card>
          <EmptyState title="No farms yet" message="This farmer has not added any farms in the app." />
        </Card>
      ) : (
        <Stack spacing={2}>
          {data.farms.map((farm) => (
            <Card key={farm.id}>
              <CardHeader
                title={farm.name}
                slotProps={{ title: { variant: 'subtitle1', fontWeight: 600 } }}
                subheader={[
                  `${farm.area} ${humanize(farm.areaUnit)}`,
                  [farm.village, farm.district, farm.state].filter(Boolean).join(', '),
                  farm.soilType ? `${humanize(farm.soilType)} soil` : null,
                  farm.irrigationAvailable ? 'Irrigated' : 'Rain-fed',
                ]
                  .filter(Boolean)
                  .join(' · ')}
              />
              <CardContent sx={{ pt: 0 }}>
                {farm.farmerCrops.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No crops on this farm.
                  </Typography>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Crop</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Area</TableCell>
                          <TableCell>Sown</TableCell>
                          <TableCell>Expected harvest</TableCell>
                          <TableCell sx={{ minWidth: 120 }}>Progress</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {farm.farmerCrops.map((fc) => (
                          <TableRow key={fc.id}>
                            <TableCell>
                              {fc.crop?.name ?? '—'}
                              {fc.crop?.nameBn ? (
                                <Typography component="span" variant="body2" color="text.secondary">
                                  {' '}
                                  ({fc.crop.nameBn})
                                </Typography>
                              ) : null}
                            </TableCell>
                            <TableCell>
                              <Chip size="small" label={humanize(fc.status)} color={STATUS_COLOR[fc.status] ?? 'default'} />
                            </TableCell>
                            <TableCell>
                              {fc.area} {humanize(fc.areaUnit)}
                            </TableCell>
                            <TableCell>{formatDate(fc.sowingDate)}</TableCell>
                            <TableCell>{formatDate(fc.expectedHarvestDate)}</TableCell>
                            <TableCell>
                              {typeof fc.progressPercent === 'number' ? (
                                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                  <LinearProgress
                                    variant="determinate"
                                    value={fc.progressPercent}
                                    sx={{ flex: 1, height: 6, borderRadius: 3 }}
                                  />
                                  <Typography variant="caption">{fc.progressPercent}%</Typography>
                                </Stack>
                              ) : (
                                '—'
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Deactivate this farmer?"
        confirmLabel="Deactivate"
        confirmColor="error"
        pending={toggle.isPending}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => toggle.mutate(false)}
      >
        <Typography variant="body2">
          {data.name || data.phone} will no longer be able to use the app or receive notifications until reactivated.
        </Typography>
      </ConfirmDialog>
    </>
  );
}
