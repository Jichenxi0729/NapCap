import { useState, useMemo, useCallback, useRef, useEffect } from 'react';

interface UsePaginationOptions<T> {
  data: T[];
  pageSize?: number;
}

interface UsePaginationReturn<T> {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  pageData: T[];
  hasNextPage: boolean;
  hasPrevPage: boolean;
  goToPage: (page: number) => void;
  goNext: () => void;
  goPrev: () => void;
  reset: () => void;
  loadMoreRef: (node: HTMLDivElement | null) => void;
}

export function usePagination<T>({
  data,
  pageSize = 24,
}: UsePaginationOptions<T>): UsePaginationReturn<T> {
  const [currentPage, setCurrentPage] = useState(1);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(data.length / pageSize)),
    [data.length, pageSize],
  );

  const safeCurrentPage = useMemo(
    () => Math.min(currentPage, totalPages),
    [currentPage, totalPages],
  );

  const pageData = useMemo(() => {
    const end = safeCurrentPage * pageSize;
    return data.slice(0, end);
  }, [data, safeCurrentPage, pageSize]);

  const hasNextPage = safeCurrentPage < totalPages;
  const hasPrevPage = safeCurrentPage > 1;

  const goToPage = useCallback(
    (page: number) => {
      setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    },
    [totalPages],
  );

  const goNext = useCallback(() => {
    if (hasNextPage) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [hasNextPage]);

  const goPrev = useCallback(() => {
    if (hasPrevPage) {
      setCurrentPage((prev) => prev - 1);
    }
  }, [hasPrevPage]);

  const reset = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const loadMore = useCallback(() => {
    if (hasNextPage) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [hasNextPage]);

  const loadMoreRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      if (node) {
        sentinelRef.current = node;
        observerRef.current = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting && hasNextPage) {
              loadMore();
            }
          },
          { rootMargin: '200px' },
        );
        observerRef.current.observe(node);
      }
    },
    [hasNextPage, loadMore],
  );

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (safeCurrentPage !== currentPage) {
      setCurrentPage(safeCurrentPage);
    }
  }, [safeCurrentPage]);

  return {
    currentPage: safeCurrentPage,
    pageSize,
    totalPages,
    totalItems: data.length,
    pageData,
    hasNextPage,
    hasPrevPage,
    goToPage,
    goNext,
    goPrev,
    reset,
    loadMoreRef,
  };
}
