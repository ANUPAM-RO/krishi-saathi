'use client';

import { Grid, TextField } from '@mui/material';

export interface LocalizedValue {
  en: string;
  hi: string;
  bn: string;
}

export const EMPTY_LOCALIZED: LocalizedValue = { en: '', hi: '', bn: '' };

const LANGS: { key: keyof LocalizedValue; label: string }[] = [
  { key: 'en', label: 'English' },
  { key: 'hi', label: 'Hindi (हिन्दी)' },
  { key: 'bn', label: 'Bengali (বাংলা)' },
];

/** English / Hindi / Bengali inputs side by side (stacked on small screens). */
export function LocalizedFields({
  label,
  value,
  onChange,
  required = false,
  multiline = false,
  errors,
}: {
  label: string;
  value: LocalizedValue;
  onChange: (value: LocalizedValue) => void;
  required?: boolean;
  multiline?: boolean;
  errors?: Partial<Record<keyof LocalizedValue, string>>;
}) {
  return (
    <Grid container spacing={1.5}>
      {LANGS.map(({ key, label: langLabel }) => (
        <Grid key={key} size={{ xs: 12, md: 4 }}>
          <TextField
            fullWidth
            label={`${label} (${langLabel})`}
            value={value[key]}
            onChange={(e) => onChange({ ...value, [key]: e.target.value })}
            required={required}
            multiline={multiline}
            minRows={multiline ? 3 : undefined}
            error={Boolean(errors?.[key])}
            helperText={errors?.[key]}
            slotProps={{ htmlInput: { lang: key } }}
          />
        </Grid>
      ))}
    </Grid>
  );
}
