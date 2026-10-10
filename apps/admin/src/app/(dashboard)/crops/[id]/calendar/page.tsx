'use client';

import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  ACTIVITY_TYPES,
  calculateExpectedHarvestDate,
  generateActivitySchedule,
  type ActivityType,
} from '@krishi/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState, ErrorAlert, ListSkeleton } from '@/components/Feedback';
import { EMPTY_LOCALIZED, LocalizedFields, type LocalizedValue } from '@/components/LocalizedFields';
import { PageHeader } from '@/components/PageHeader';
import { EnumSelect } from '@/components/SelectField';
import { useNotify } from '@/components/SnackbarProvider';
import { adminApi, errorMessage } from '@/lib/api';
import { dayOffsetLabel, formatDate, humanize, todayISO } from '@/lib/format';
import { useCrops } from '@/lib/queries';
import type { CalendarTemplate, CalendarTemplateInput } from '@/lib/types';

const TYPE_COLORS: Record<ActivityType, string> = {
  LAND_PREPARATION: '#8d6e63',
  SOWING: '#2e7d32',
  TRANSPLANTING: '#558b2f',
  IRRIGATION: '#0277bd',
  FERTILIZER: '#6a1b9a',
  WEEDING: '#9e9d24',
  PEST_CONTROL: '#c62828',
  HARVEST: '#f9a825',
  OTHER: '#757575',
};

function TypeChip({ type }: { type: ActivityType }) {
  return (
    <Chip
      size="small"
      label={humanize(type)}
      sx={{ bgcolor: TYPE_COLORS[type] ?? '#757575', color: '#fff', fontWeight: 500 }}
    />
  );
}

function sortTemplates(list: CalendarTemplate[]): CalendarTemplate[] {
  return [...list].sort((a, b) => a.dayOffset - b.dayOffset || a.sortOrder - b.sortOrder);
}

// ---------- Add / edit dialog ----------

interface FormState {
  activityType: ActivityType | '';
  dayOffset: string;
  title: LocalizedValue;
  description: LocalizedValue;
  sortOrder: string;
}

type Errors = Partial<Record<'activityType' | 'dayOffset' | 'sortOrder' | 'en' | 'hi' | 'bn', string>>;

function toForm(t: CalendarTemplate | null): FormState {
  if (!t) {
    return { activityType: '', dayOffset: '0', title: EMPTY_LOCALIZED, description: EMPTY_LOCALIZED, sortOrder: '0' };
  }
  return {
    activityType: t.activityType,
    dayOffset: String(t.dayOffset),
    title: { en: t.title, hi: t.titleHi, bn: t.titleBn },
    description: { en: t.description ?? '', hi: t.descriptionHi ?? '', bn: t.descriptionBn ?? '' },
    sortOrder: String(t.sortOrder ?? 0),
  };
}

function validate(f: FormState): Errors {
  const e: Errors = {};
  if (!f.activityType) e.activityType = 'Required';
  if (!/^-?\d+$/.test(f.dayOffset.trim())) e.dayOffset = 'Whole number of days (negative = before sowing)';
  if (f.sortOrder.trim() && !/^-?\d+$/.test(f.sortOrder.trim())) e.sortOrder = 'Whole number';
  if (!f.title.en.trim()) e.en = 'Required';
  if (!f.title.hi.trim()) e.hi = 'Required';
  if (!f.title.bn.trim()) e.bn = 'Required';
  return e;
}

function TemplateDialog({
  cropId,
  template,
  durationDays,
  onClose,
}: {
  cropId: string;
  template: CalendarTemplate | null;
  durationDays?: number;
  onClose: () => void;
}) {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(() => toForm(template));
  const [errors, setErrors] = useState<Errors>({});

  const save = useMutation({
    mutationFn: (body: CalendarTemplateInput) =>
      template ? adminApi.updateTemplate(template.id, body) : adminApi.createTemplate(cropId, body),
    onSuccess: () => {
      notify.success(template ? 'Activity updated' : 'Activity added');
      void queryClient.invalidateQueries({ queryKey: ['calendar', cropId] });
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
      activityType: form.activityType as ActivityType,
      dayOffset: parseInt(form.dayOffset, 10),
      title: form.title.en.trim(),
      titleHi: form.title.hi.trim(),
      titleBn: form.title.bn.trim(),
      description: form.description.en.trim() || undefined,
      descriptionHi: form.description.hi.trim() || undefined,
      descriptionBn: form.description.bn.trim() || undefined,
      sortOrder: form.sortOrder.trim() ? parseInt(form.sortOrder, 10) : 0,
    });
  };

  const offsetPreview = /^-?\d+$/.test(form.dayOffset.trim()) ? dayOffsetLabel(parseInt(form.dayOffset, 10)) : '';
  const offsetWarning =
    durationDays && /^-?\d+$/.test(form.dayOffset.trim()) && parseInt(form.dayOffset, 10) > durationDays
      ? `Note: after the crop's ${durationDays}-day duration`
      : '';

  return (
    <Dialog open onClose={save.isPending ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>{template ? 'Edit calendar activity' : 'Add calendar activity'}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, sm: 5 }}>
              <EnumSelect
                fullWidth
                required
                label="Activity type"
                values={ACTIVITY_TYPES}
                value={form.activityType}
                onChange={(v) => setForm({ ...form, activityType: v as ActivityType })}
                error={Boolean(errors.activityType)}
                helperText={errors.activityType}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <TextField
                fullWidth
                required
                type="number"
                label="Day offset from sowing"
                value={form.dayOffset}
                onChange={(e) => setForm({ ...form, dayOffset: e.target.value })}
                error={Boolean(errors.dayOffset)}
                helperText={errors.dayOffset ?? (offsetWarning || offsetPreview)}
                slotProps={{ htmlInput: { step: 1 } }}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField
                fullWidth
                type="number"
                label="Sort order"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                error={Boolean(errors.sortOrder)}
                helperText={errors.sortOrder ?? 'Tie-break on the same day'}
                slotProps={{ htmlInput: { step: 1 } }}
              />
            </Grid>
          </Grid>
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Title
            </Typography>
            <LocalizedFields
              label="Title"
              required
              value={form.title}
              onChange={(title) => setForm({ ...form, title })}
              errors={{ en: errors.en, hi: errors.hi, bn: errors.bn }}
            />
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Description (optional)
            </Typography>
            <LocalizedFields
              label="Description"
              multiline
              value={form.description}
              onChange={(description) => setForm({ ...form, description })}
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={save.isPending}>
          Cancel
        </Button>
        <Button variant="contained" onClick={submit} disabled={save.isPending}>
          {save.isPending ? 'Saving…' : template ? 'Save changes' : 'Add activity'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ---------- Preview timeline ----------

function PreviewTimeline({ templates, durationDays }: { templates: CalendarTemplate[]; durationDays?: number }) {
  const [sowingDate, setSowingDate] = useState(todayISO());
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(sowingDate);
  const schedule = useMemo(
    () => (valid ? generateActivitySchedule(sowingDate, templates) : []),
    [sowingDate, templates, valid],
  );
  let harvest: Date | null = null;
  if (valid && durationDays && durationDays > 0) {
    try {
      harvest = calculateExpectedHarvestDate(sowingDate, durationDays);
    } catch {
      harvest = null;
    }
  }

  return (
    <Card>
      <CardHeader
        title="Schedule preview"
        subheader="What a farmer would see for a sample sowing date"
        slotProps={{ title: { variant: 'h6' } }}
      />
      <CardContent sx={{ pt: 0 }}>
        <TextField
          type="date"
          label="Sample sowing date"
          value={sowingDate}
          onChange={(e) => setSowingDate(e.target.value)}
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ mb: 2 }}
        />
        {schedule.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {valid ? 'No activities to preview.' : 'Pick a valid date.'}
          </Typography>
        ) : (
          <Box sx={{ position: 'relative', pl: 3 }}>
            <Box sx={{ position: 'absolute', left: 8, top: 6, bottom: 6, width: 2, bgcolor: 'divider' }} />
            {schedule.map((item) => (
              <Box key={item.id} sx={{ position: 'relative', mb: 2 }}>
                <Box
                  sx={{
                    position: 'absolute',
                    left: -21,
                    top: 4,
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    bgcolor: TYPE_COLORS[item.activityType] ?? 'grey.500',
                    border: '2px solid #fff',
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  {formatDate(item.scheduledDate)} · {dayOffsetLabel(item.dayOffset)}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {item.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" component="div">
                  {item.titleBn} · {item.titleHi}
                </Typography>
              </Box>
            ))}
            {harvest && (
              <Box sx={{ position: 'relative' }}>
                <Box
                  sx={{
                    position: 'absolute',
                    left: -21,
                    top: 4,
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    bgcolor: 'secondary.main',
                    border: '2px solid #fff',
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  {formatDate(harvest)} · Day {durationDays}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Expected harvest (crop duration)
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

// ---------- Page ----------

export default function CropCalendarPage() {
  const { id } = useParams<{ id: string }>();
  const notify = useNotify();
  const queryClient = useQueryClient();
  const crops = useCrops();
  const crop = crops.data?.find((c) => c.id === id);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['calendar', id],
    queryFn: () => adminApi.calendar(id),
  });
  const templates = useMemo(() => sortTemplates(data ?? []), [data]);

  const [dialog, setDialog] = useState<{ template: CalendarTemplate | null; key: number } | null>(null);
  const [deleting, setDeleting] = useState<CalendarTemplate | null>(null);

  const remove = useMutation({
    mutationFn: (t: CalendarTemplate) => adminApi.deleteTemplate(t.id),
    onSuccess: () => {
      notify.success('Activity deleted');
      setDeleting(null);
      void queryClient.invalidateQueries({ queryKey: ['calendar', id] });
      void queryClient.invalidateQueries({ queryKey: ['crops'] });
    },
    onError: (err) => notify.error(errorMessage(err)),
  });

  return (
    <>
      <PageHeader
        breadcrumb={
          <Button component={Link} href="/crops" startIcon={<ArrowBackIcon />} size="small" sx={{ mb: 1 }}>
            Crop master
          </Button>
        }
        title={crop ? `${crop.name} calendar` : 'Crop calendar'}
        subtitle={
          crop
            ? `${crop.nameBn} · ${crop.nameHi} · ${humanize(crop.season)} · ${crop.durationDays} days. Activities are generated for each farmer from this template when they add the crop.`
            : 'Template activities, scheduled relative to the sowing date.'
        }
        actions={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialog({ template: null, key: Date.now() })}
          >
            Add activity
          </Button>
        }
      />

      {isError && <ErrorAlert error={error} onRetry={() => refetch()} />}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card>
            {isLoading ? (
              <CardContent>
                <ListSkeleton rows={6} />
              </CardContent>
            ) : templates.length === 0 ? (
              <EmptyState
                title="No calendar activities yet"
                message="Add land preparation, sowing, fertilizer, irrigation and harvest steps."
              />
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>When</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Title (EN / HI / BN)</TableCell>
                      <TableCell align="right">Sort</TableCell>
                      <TableCell align="right" />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {templates.map((t) => (
                      <TableRow key={t.id} hover>
                        <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{dayOffsetLabel(t.dayOffset)}</TableCell>
                        <TableCell>
                          <TypeChip type={t.activityType} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {t.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" component="div">
                            {t.titleHi} · {t.titleBn}
                          </Typography>
                          {t.description && (
                            <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
                              {t.description}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">{t.sortOrder}</TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => setDialog({ template: t, key: Date.now() })}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => setDeleting(t)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Card>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <PreviewTimeline templates={templates} durationDays={crop?.durationDays} />
        </Grid>
      </Grid>

      {dialog && (
        <TemplateDialog
          key={dialog.key}
          cropId={id}
          template={dialog.template}
          durationDays={crop?.durationDays}
          onClose={() => setDialog(null)}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this activity?"
        confirmLabel="Delete"
        confirmColor="error"
        pending={remove.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting)}
      >
        <Typography variant="body2">
          &ldquo;{deleting?.title}&rdquo; ({deleting ? dayOffsetLabel(deleting.dayOffset) : ''}) will be removed from the
          template for future plantings.
        </Typography>
      </ConfirmDialog>
    </>
  );
}
