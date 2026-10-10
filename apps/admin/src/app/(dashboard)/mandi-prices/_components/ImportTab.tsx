'use client';

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DownloadIcon from '@mui/icons-material/Download';
import ErrorIcon from '@mui/icons-material/Error';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import WarningIcon from '@mui/icons-material/Warning';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControlLabel,
  Stack,
  Switch,
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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useNotify } from '@/components/SnackbarProvider';
import { adminApi, errorMessage } from '@/lib/api';
import { formatINR } from '@/lib/format';
import {
  MAX_IMPORT_ROWS,
  OPTIONAL_COLUMNS,
  REQUIRED_COLUMNS,
  parseMandiCsv,
  sampleCsv,
  type ParseResult,
} from '@/lib/mandiCsv';
import { useCrops } from '@/lib/queries';
import type { MandiPriceImportResult, MandiPriceImportRow } from '@/lib/types';

const PREVIEW_LIMIT = 300;

export function ImportTab({ onDone }: { onDone: () => void }) {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const crops = useCrops();
  const fileInput = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [source, setSource] = useState('CSV import');
  const [skipInvalid, setSkipInvalid] = useState(true);
  const [onlyProblems, setOnlyProblems] = useState(false);
  const [result, setResult] = useState<{ res: MandiPriceImportResult; lines: number[] } | null>(null);

  const knownCodes = useMemo(
    () => (crops.data ? new Set(crops.data.map((c) => c.code.toLowerCase())) : null),
    [crops.data],
  );
  // Re-validated when the crop list arrives so unknown crop codes get flagged.
  const parsed: ParseResult | null = useMemo(
    () => (csvText === null ? null : parseMandiCsv(csvText, knownCodes)),
    [csvText, knownCodes],
  );

  const stats = useMemo(() => {
    const rows = parsed?.rows ?? [];
    return {
      total: rows.length,
      valid: rows.filter((r) => r.row).length,
      invalid: rows.filter((r) => !r.row).length,
      warnings: rows.filter((r) => r.warnings.length).length,
    };
  }, [parsed]);

  const importMutation = useMutation({
    mutationFn: ({ rows }: { rows: MandiPriceImportRow[]; lines: number[] }) =>
      adminApi.importMandiPrices(rows, source.trim() || undefined),
    onSuccess: (res, vars) => {
      setResult({ res, lines: vars.lines });
      notify.success(`Import finished: ${res.created} created, ${res.updated} updated, ${res.errors.length} errors`);
      void queryClient.invalidateQueries({ queryKey: ['mandi-prices'] });
      void queryClient.invalidateQueries({ queryKey: ['mandis'] });
      void queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: (err) => notify.error(errorMessage(err)),
  });

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setResult(null);
    setFileName(file.name);
    try {
      setCsvText(await file.text());
    } catch (err) {
      setCsvText(null);
      notify.error(`Could not read file: ${errorMessage(err)}`);
    }
  };

  const downloadSample = () => {
    const codes = (crops.data ?? []).filter((c) => c.isActive).map((c) => c.code);
    const blob = new Blob([sampleCsv(codes)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mandi-prices-template.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setCsvText(null);
    setFileName(null);
    setResult(null);
  };

  const blocked = !parsed || parsed.fileErrors.length > 0 || stats.valid === 0 || (!skipInvalid && stats.invalid > 0);

  const startImport = () => {
    if (!parsed || blocked) return;
    const valid = parsed.rows.filter((r) => r.row);
    importMutation.mutate({ rows: valid.map((r) => r.row!), lines: valid.map((r) => r.line) });
  };

  const previewRows = (parsed?.rows ?? [])
    .filter((r) => !onlyProblems || !r.row || r.warnings.length)
    .slice(0, PREVIEW_LIMIT);

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Import prices from CSV
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Required columns: {REQUIRED_COLUMNS.map((c) => <code key={c}>{c} </code>)}· optional:{' '}
            {OPTIONAL_COLUMNS.map((c) => (
              <code key={c}>{c} </code>
            ))}
            . Dates use YYYY-MM-DD, unit is QUINTAL (default) or KG. Existing prices for the same mandi, crop and date are
            updated, and unknown mandis are created automatically. Up to {MAX_IMPORT_ROWS} rows per file.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
            <input ref={fileInput} type="file" accept=".csv,text/csv" hidden onChange={onFile} />
            <Button variant="contained" startIcon={<UploadFileIcon />} onClick={() => fileInput.current?.click()}>
              Choose CSV file
            </Button>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={downloadSample}>
              Download sample template
            </Button>
            {fileName && (
              <Chip label={fileName} onDelete={reset} variant="outlined" sx={{ maxWidth: 280 }} />
            )}
          </Stack>
        </CardContent>
      </Card>

      {result && (
        <Alert
          severity={result.res.errors.length ? 'warning' : 'success'}
          action={
            <Button color="inherit" size="small" onClick={onDone}>
              View prices
            </Button>
          }
        >
          <AlertTitle>Import complete</AlertTitle>
          {result.res.created} created · {result.res.updated} updated · {result.res.errors.length} rejected by the server
          {result.res.errors.length > 0 && (
            <Box component="ul" sx={{ m: 0, mt: 1, pl: 2.5, maxHeight: 200, overflow: 'auto' }}>
              {result.res.errors.map((e, i) => {
                // Assumption: `row` is the 1-based index into the submitted rows; map it back to the CSV line.
                const csvLine = result.lines[e.row - 1];
                return (
                  <li key={i}>
                    Row {e.row}
                    {csvLine ? ` (CSV row ${csvLine})` : ''}: {e.message}
                  </li>
                );
              })}
            </Box>
          )}
        </Alert>
      )}

      {parsed && (
        <Card>
          <CardContent>
            {parsed.fileErrors.length > 0 && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <AlertTitle>This file cannot be imported</AlertTitle>
                <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                  {parsed.fileErrors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </Box>
              </Alert>
            )}
            {parsed.unknownColumns.length > 0 && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Ignoring unknown column(s): {parsed.unknownColumns.join(', ')}
              </Alert>
            )}

            {parsed.rows.length > 0 && (
              <>
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={2}
                  sx={{ mb: 2, alignItems: { md: 'center' }, justifyContent: 'space-between' }}
                >
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                    <Chip label={`${stats.total} rows`} />
                    <Chip color="success" icon={<CheckCircleIcon />} label={`${stats.valid} valid`} />
                    <Chip
                      color={stats.invalid ? 'error' : 'default'}
                      icon={<ErrorIcon />}
                      label={`${stats.invalid} invalid`}
                    />
                    {stats.warnings > 0 && (
                      <Chip color="warning" icon={<WarningIcon />} label={`${stats.warnings} with warnings`} />
                    )}
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
                    <FormControlLabel
                      control={<Switch checked={onlyProblems} onChange={(e) => setOnlyProblems(e.target.checked)} />}
                      label="Show only problems"
                    />
                    <FormControlLabel
                      control={<Switch checked={skipInvalid} onChange={(e) => setSkipInvalid(e.target.checked)} />}
                      label="Skip invalid rows"
                    />
                  </Stack>
                </Stack>

                <TableContainer sx={{ maxHeight: 480, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Row</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Mandi</TableCell>
                        <TableCell>District / State</TableCell>
                        <TableCell>Crop</TableCell>
                        <TableCell align="right">Price</TableCell>
                        <TableCell align="right">Min</TableCell>
                        <TableCell align="right">Max</TableCell>
                        <TableCell>Unit</TableCell>
                        <TableCell>Date</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {previewRows.map((r) => {
                        const problems = [...r.errors, ...r.warnings];
                        return (
                          <TableRow
                            key={r.line}
                            sx={{ bgcolor: r.row ? (r.warnings.length ? '#fff8e1' : undefined) : '#ffebee' }}
                          >
                            <TableCell>{r.line}</TableCell>
                            <TableCell>
                              {problems.length ? (
                                <Tooltip title={problems.join('; ')}>
                                  <Typography
                                    variant="caption"
                                    color={r.row ? 'warning.dark' : 'error'}
                                    sx={{ display: 'block', maxWidth: 220 }}
                                  >
                                    {problems.join('; ')}
                                  </Typography>
                                </Tooltip>
                              ) : (
                                <CheckCircleIcon color="success" fontSize="small" />
                              )}
                            </TableCell>
                            <TableCell>{r.raw.mandiName}</TableCell>
                            <TableCell>
                              {r.raw.district}
                              {r.raw.state ? ` / ${r.raw.state}` : ''}
                            </TableCell>
                            <TableCell>{r.raw.cropCode}</TableCell>
                            <TableCell align="right">{r.row ? formatINR(r.row.price) : r.raw.price}</TableCell>
                            <TableCell align="right">{r.row?.minPrice !== undefined ? formatINR(r.row.minPrice) : r.raw.minPrice}</TableCell>
                            <TableCell align="right">{r.row?.maxPrice !== undefined ? formatINR(r.row.maxPrice) : r.raw.maxPrice}</TableCell>
                            <TableCell>{r.row?.unit ?? r.raw.unit ?? ''}</TableCell>
                            <TableCell sx={{ whiteSpace: 'nowrap' }}>{r.raw.priceDate}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
                {previewRows.length === PREVIEW_LIMIT && (
                  <Typography variant="caption" color="text.secondary">
                    Showing the first {PREVIEW_LIMIT} rows of the preview. All valid rows will be imported.
                  </Typography>
                )}

                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  sx={{ mt: 2, alignItems: { sm: 'center' }, justifyContent: 'flex-end' }}
                >
                  <TextField
                    label="Source label"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    helperText="Stored with each price"
                    sx={{ minWidth: 220 }}
                  />
                  <Button
                    variant="contained"
                    size="large"
                    disabled={blocked || importMutation.isPending}
                    onClick={startImport}
                  >
                    {importMutation.isPending ? 'Importing…' : `Import ${stats.valid} row${stats.valid === 1 ? '' : 's'}`}
                  </Button>
                </Stack>
                {!skipInvalid && stats.invalid > 0 && (
                  <Typography variant="caption" color="error" sx={{ display: 'block', textAlign: 'right', mt: 1 }}>
                    Fix the invalid rows or turn on &ldquo;Skip invalid rows&rdquo; to continue.
                  </Typography>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}
