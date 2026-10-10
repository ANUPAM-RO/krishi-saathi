'use client';

import { MenuItem, TextField, type TextFieldProps } from '@mui/material';
import { humanize } from '@/lib/format';
import { useCrops, useMandis } from '@/lib/queries';

export interface Option {
  value: string;
  label: string;
}

type BaseProps = Omit<TextFieldProps, 'select' | 'onChange' | 'value' | 'children'> & {
  value: string;
  onChange: (value: string) => void;
  /** Adds a first option with value "" (e.g. "All" for filters, "None" for optional fields). */
  emptyLabel?: string;
};

export function SelectField({ value, onChange, options, emptyLabel, ...rest }: BaseProps & { options: Option[] }) {
  return (
    <TextField select value={value} onChange={(e) => onChange(e.target.value)} {...rest}>
      {emptyLabel !== undefined && (
        <MenuItem value="">
          <em>{emptyLabel}</em>
        </MenuItem>
      )}
      {options.map((o) => (
        <MenuItem key={o.value} value={o.value}>
          {o.label}
        </MenuItem>
      ))}
    </TextField>
  );
}

/** Select over a shared enum (e.g. CROP_SEASONS), labels humanized unless a label map is given. */
export function EnumSelect({
  values,
  labels,
  ...rest
}: BaseProps & { values: readonly string[]; labels?: Record<string, string> }) {
  return <SelectField options={values.map((v) => ({ value: v, label: labels?.[v] ?? humanize(v) }))} {...rest} />;
}

export function CropSelect({ includeInactive = true, ...rest }: BaseProps & { includeInactive?: boolean }) {
  const { data, isLoading, isError } = useCrops();
  const crops = (data ?? []).filter((c) => includeInactive || c.isActive || c.id === rest.value);
  return (
    <SelectField
      {...rest}
      options={crops.map((c) => ({ value: c.id, label: `${c.name} (${c.code})${c.isActive ? '' : ' - inactive'}` }))}
      helperText={isError ? 'Could not load crops' : isLoading ? 'Loading crops…' : rest.helperText}
    />
  );
}

export function MandiSelect(props: BaseProps) {
  const { data, isLoading, isError } = useMandis();
  return (
    <SelectField
      {...props}
      options={(data ?? []).map((m) => ({ value: m.id, label: `${m.name}, ${m.district}` }))}
      helperText={isError ? 'Could not load mandis' : isLoading ? 'Loading mandis…' : props.helperText}
    />
  );
}
