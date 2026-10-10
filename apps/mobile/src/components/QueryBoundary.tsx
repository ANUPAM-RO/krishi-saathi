import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { errorMessage } from '@/lib/errors';
import { useOnline } from '@/lib/useOnline';
import { EmptyState, ErrorState, LoadingState, OfflineState, type EmptyStateProps } from './States';

export interface QueryBoundaryProps<T> {
  query: UseQueryResult<T>;
  children: (data: T) => ReactNode;
  /** Return true when the data should show the empty state. */
  isEmpty?: (data: T) => boolean;
  empty?: EmptyStateProps;
  loadingMessage?: string;
  /** Override the error text (e.g. weather 503). */
  errorText?: (error: unknown) => string | undefined;
}

/**
 * Renders loading / offline / error (with retry) / empty / data for one query.
 * Cached data always wins, so offline screens keep showing the last saved info.
 */
export function QueryBoundary<T>({ query, children, isEmpty, empty, loadingMessage, errorText }: QueryBoundaryProps<T>) {
  const { t } = useTranslation();
  const online = useOnline();
  const retry = () => void query.refetch();

  if (query.data !== undefined) {
    if (isEmpty?.(query.data)) return <EmptyState {...empty} />;
    return <>{children(query.data)}</>;
  }
  if (query.isPending && (query.fetchStatus === 'paused' || !online)) return <OfflineState onRetry={retry} />;
  if (query.isPending) return <LoadingState message={loadingMessage} />;
  if (!online) return <OfflineState onRetry={retry} />;
  return (
    <ErrorState
      message={errorText?.(query.error) ?? errorMessage(query.error, t)}
      onRetry={retry}
      retrying={query.isFetching}
    />
  );
}
