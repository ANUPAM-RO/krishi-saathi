'use client';

import AssignmentLateIcon from '@mui/icons-material/AssignmentLate';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import GrassIcon from '@mui/icons-material/Grass';
import LandscapeIcon from '@mui/icons-material/Landscape';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import PeopleIcon from '@mui/icons-material/People';
import StorefrontIcon from '@mui/icons-material/Storefront';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import ThunderstormIcon from '@mui/icons-material/Thunderstorm';
import { Box, Card, CardContent, CardHeader, Grid, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { CardGridSkeleton, EmptyState, ErrorAlert, ListSkeleton } from '@/components/Feedback';
import { PageHeader } from '@/components/PageHeader';
import { adminApi } from '@/lib/api';
import { formatDate, formatNumber } from '@/lib/format';

function StatCard({
  label,
  value,
  icon,
  color = 'primary.main',
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  color?: string;
}) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Box
            sx={{
              bgcolor: color,
              color: '#fff',
              borderRadius: 2,
              width: 44,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary" noWrap>
              {label}
            </Typography>
            <Typography variant="h5" component="div">
              {value}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function BarList({ rows, emptyLabel }: { rows: { key: string; label: string; count: number }[]; emptyLabel: string }) {
  if (rows.length === 0) return <EmptyState title={emptyLabel} />;
  const max = Math.max(...rows.map((r) => r.count), 1);
  return (
    <Stack spacing={1.25}>
      {rows.map((r) => (
        <Box key={r.key}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2">{r.label}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {formatNumber(r.count)}
            </Typography>
          </Stack>
          <Box sx={{ height: 10, bgcolor: '#e8efe3', borderRadius: 5, overflow: 'hidden' }}>
            <Box
              sx={{
                height: '100%',
                width: `${Math.max(2, (r.count / max) * 100)}%`,
                bgcolor: 'primary.main',
                borderRadius: 5,
              }}
            />
          </Box>
        </Box>
      ))}
    </Stack>
  );
}

export default function DashboardPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['stats'], queryFn: adminApi.stats });

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Overview of farmers, crops and activity across the programme" />

      {isError && <ErrorAlert error={error} onRetry={() => refetch()} title="Could not load statistics" />}

      {isLoading ? (
        <CardGridSkeleton count={9} />
      ) : data ? (
        <>
          <Grid container spacing={2}>
            {[
              { label: 'Farmers', value: formatNumber(data.farmers), icon: <PeopleIcon /> },
              { label: 'Farms', value: formatNumber(data.farms), icon: <LandscapeIcon /> },
              { label: 'Active crops', value: formatNumber(data.activeCrops), icon: <GrassIcon /> },
              {
                label: 'Tasks due today',
                value: formatNumber(data.tasksDueToday),
                icon: <EventAvailableIcon />,
                color: '#0277bd',
              },
              {
                label: 'Overdue tasks',
                value: formatNumber(data.overdueTasks),
                icon: <AssignmentLateIcon />,
                color: data.overdueTasks > 0 ? '#c62828' : '#757575',
              },
              {
                label: 'Completed (last 7 days)',
                value: formatNumber(data.completedTasksLast7Days),
                icon: <TaskAltIcon />,
                color: '#388e3c',
              },
              {
                label: 'Notifications (last 7 days)',
                value: formatNumber(data.notificationsLast7Days),
                icon: <NotificationsActiveIcon />,
                color: '#6a1b9a',
              },
              {
                label: 'Active weather alerts',
                value: formatNumber(data.activeWeatherAlerts),
                icon: <ThunderstormIcon />,
                color: data.activeWeatherAlerts > 0 ? '#ef6c00' : '#757575',
              },
              {
                label: 'Latest mandi price',
                value: data.latestMandiPriceDate ? formatDate(data.latestMandiPriceDate) : 'None yet',
                icon: <StorefrontIcon />,
                color: '#f9a825',
              },
            ].map((s) => (
              <Grid key={s.label} size={{ xs: 12, sm: 6, md: 4, lg: 4, xl: 3 }}>
                <StatCard {...s} />
              </Grid>
            ))}
          </Grid>

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ height: '100%' }}>
                <CardHeader title="Farmers by district" slotProps={{ title: { variant: 'h6' } }} />
                <CardContent>
                  <BarList
                    emptyLabel="No farmers yet"
                    rows={[...data.farmersByDistrict]
                      .sort((a, b) => b.count - a.count)
                      .map((r) => ({ key: r.district ?? '__none', label: r.district ?? 'Not set', count: r.count }))}
                  />
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ height: '100%' }}>
                <CardHeader title="Crops planted by type" slotProps={{ title: { variant: 'h6' } }} />
                <CardContent>
                  <BarList
                    emptyLabel="No crops planted yet"
                    rows={[...data.cropsByType]
                      .sort((a, b) => b.count - a.count)
                      .map((r) => ({ key: r.cropId, label: r.name, count: r.count }))}
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      ) : (
        !isError && <ListSkeleton />
      )}
    </>
  );
}
