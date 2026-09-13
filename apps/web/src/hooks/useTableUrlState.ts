import { useSearchParams } from 'react-router-dom';
import { useCallback, useMemo } from 'react';

export interface UseTableUrlStateOptions<T extends Record<string, any>> {
  defaultValues: T;
  defaultPageSize?: number;
}

export function useTableUrlState<T extends Record<string, any>>({
  defaultValues,
  defaultPageSize = 20,
}: UseTableUrlStateOptions<T>) {
  const [searchParams, setSearchParams] = useSearchParams();

  // 1. Compute current filter values from searchParams, falling back to defaultValues
  const filters = useMemo(() => {
    const result = { ...defaultValues } as T;
    for (const key of Object.keys(defaultValues)) {
      const paramVal = searchParams.get(key);
      if (paramVal !== null) {
        const defaultVal = defaultValues[key];
        if (typeof defaultVal === 'number') {
          const num = Number(paramVal);
          result[key as keyof T] = (isNaN(num) ? defaultVal : num) as any;
        } else if (typeof defaultVal === 'boolean') {
          result[key as keyof T] = (paramVal === 'true') as any;
        } else {
          result[key as keyof T] = paramVal as any;
        }
      }
    }
    return result;
  }, [searchParams, defaultValues]);

  // 2. Compute 0-based pageIndex for TanStack Table (URL stores 1-based "page")
  const pageIndex = useMemo(() => {
    const page = Number(searchParams.get('page'));
    return !isNaN(page) && page > 0 ? page - 1 : 0;
  }, [searchParams]);

  // 3. Compute pageSize
  const pageSize = useMemo(() => {
    const size = Number(searchParams.get('pageSize'));
    return !isNaN(size) && size > 0 ? size : defaultPageSize;
  }, [searchParams, defaultPageSize]);

  // 4. Update filters: updates params and automatically resets pageIndex to 0 (page 1)
  const setFilters = useCallback(
    (updates: Partial<T>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, val] of Object.entries(updates)) {
            const defaultVal = defaultValues[key];
            if (
              val === undefined ||
              val === null ||
              val === '' ||
              val === defaultVal ||
              val === 'ALL'
            ) {
              next.delete(key);
            } else {
              next.set(key, String(val));
            }
          }
          // Reset page when filter changes
          next.delete('page');
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams, defaultValues]
  );

  // 5. Update pagination (TanStack Table compatible)
  const setPagination = useCallback(
    (updater: any) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        const currentPageIndex = Number(next.get('page') || 1) - 1;
        const currentPageSize = Number(next.get('pageSize') || defaultPageSize);
        const currentPagination = { pageIndex: currentPageIndex, pageSize: currentPageSize };

        const resolved = typeof updater === 'function' ? updater(currentPagination) : updater;

        const newPage = resolved.pageIndex + 1;
        if (newPage <= 1) {
          next.delete('page');
        } else {
          next.set('page', String(newPage));
        }

        if (resolved.pageSize && resolved.pageSize !== defaultPageSize) {
          next.set('pageSize', String(resolved.pageSize));
        } else {
          next.delete('pageSize');
        }

        return next;
      });
    },
    [setSearchParams, defaultPageSize]
  );

  // 6. Reset all filters to default
  const resetFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  return {
    ...filters,
    filters,
    pageIndex,
    pageSize,
    setFilters,
    setPagination,
    resetFilters,
    searchParams,
    setSearchParams,
  };
}
