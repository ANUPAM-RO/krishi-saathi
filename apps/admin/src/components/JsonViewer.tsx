import { Box } from '@mui/material';

export function JsonViewer({ value, maxHeight = 400 }: { value: unknown; maxHeight?: number }) {
  let text: string;
  try {
    text = value === undefined ? 'undefined' : JSON.stringify(value, null, 2);
  } catch {
    text = String(value);
  }
  return (
    <Box
      component="pre"
      sx={{
        m: 0,
        p: 1.5,
        bgcolor: '#1e2a1e',
        color: '#d7f5d0',
        borderRadius: 1,
        fontSize: 12.5,
        fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
        overflow: 'auto',
        maxHeight,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {text}
    </Box>
  );
}
