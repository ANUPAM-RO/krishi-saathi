'use client';

import { Box } from '@mui/material';
import {
  DataGrid,
  type DataGridProps,
  type GridColDef,
  type GridPaginationModel,
  type GridValidRowModel,
} from '@mui/x-data-grid';
import { useEffect, useState } from 'react';

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

/** Grid pagination state (0-based) plus the 1-based `page`/`pageSize` the API expects. */
export function usePagination(initialPageSize = 20) {
  const [model, setModel] = useState<GridPaginationModel>({ page: 0, pageSize: initialPageSize });
  return {
    model,
    setModel,
    resetPage: () => setModel((m) => (m.page === 0 ? m : { ...m, page: 0 })),
    query: { page: model.page + 1, pageSize: model.pageSize },
  };
}

export function useDebounced<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

interface ServerGridProps<R extends GridValidRowModel> {
  rows: R[];
  columns: GridColDef<R>[];
  rowCount: number;
  loading: boolean;
  paginationModel: GridPaginationModel;
  onPaginationModelChange: (m: GridPaginationModel) => void;
  noRowsLabel?: string;
  onRowClick?: DataGridProps<R>['onRowClick'];
  getRowHeight?: DataGridProps<R>['getRowHeight'];
}

/** DataGrid with server-side pagination, skeleton loading and an empty-state label. */
export function ServerGrid<R extends GridValidRowModel>({
  rows,
  columns,
  rowCount,
  loading,
  paginationModel,
  onPaginationModelChange,
  noRowsLabel = 'No records found',
  onRowClick,
  getRowHeight,
}: ServerGridProps<R>) {
  return (
    <Box sx={{ width: '100%', overflowX: 'auto' }}>
      <DataGrid<R>
        autoHeight
        rows={rows}
        columns={columns}
        rowCount={rowCount}
        loading={loading}
        paginationMode="server"
        paginationModel={paginationModel}
        onPaginationModelChange={onPaginationModelChange}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        disableRowSelectionOnClick
        disableColumnFilter
        sortingMode="server"
        disableColumnSorting
        onRowClick={onRowClick}
        getRowHeight={getRowHeight}
        localeText={{ noRowsLabel }}
        slotProps={{ loadingOverlay: { variant: 'skeleton', noRowsVariant: 'skeleton' } }}
        sx={{
          minHeight: 300,
          ...(onRowClick ? { '& .MuiDataGrid-row': { cursor: 'pointer' } } : {}),
        }}
      />
    </Box>
  );
}

/** Client-side paged DataGrid for small, fully-loaded lists (crops, mandis). */
export function ClientGrid<R extends GridValidRowModel>({
  rows,
  columns,
  loading,
  noRowsLabel = 'No records found',
  onRowClick,
}: {
  rows: R[];
  columns: GridColDef<R>[];
  loading: boolean;
  noRowsLabel?: string;
  onRowClick?: DataGridProps<R>['onRowClick'];
}) {
  return (
    <Box sx={{ width: '100%' }}>
      <DataGrid<R>
        autoHeight
        rows={rows}
        columns={columns}
        loading={loading}
        initialState={{ pagination: { paginationModel: { page: 0, pageSize: 20 } } }}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        disableRowSelectionOnClick
        onRowClick={onRowClick}
        localeText={{ noRowsLabel }}
        slotProps={{ loadingOverlay: { variant: 'skeleton', noRowsVariant: 'skeleton' } }}
        sx={{ minHeight: 300 }}
      />
    </Box>
  );
}
