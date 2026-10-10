'use client';

import { createTheme } from '@mui/material/styles';
import type {} from '@mui/x-data-grid/themeAugmentation';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#2e7d32', light: '#60ad5e', dark: '#1b5e20', contrastText: '#ffffff' },
    secondary: { main: '#f9a825', contrastText: '#1f1f1f' },
    background: { default: '#f4f7f1', paper: '#ffffff' },
    success: { main: '#388e3c' },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily:
      'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", "Noto Sans Bengali", "Noto Sans Devanagari", sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { textTransform: 'none' } } },
    MuiCard: { defaultProps: { variant: 'outlined' } },
    MuiPaper: { styleOverrides: { outlined: { borderColor: '#dfe7d8' } } },
    MuiTextField: { defaultProps: { size: 'small' } },
    MuiFormControl: { defaultProps: { size: 'small' } },
    MuiDataGrid: {
      styleOverrides: {
        root: { backgroundColor: '#ffffff', border: '1px solid #dfe7d8' },
        columnHeaders: { backgroundColor: '#eef4ea' },
      },
    },
  },
});
