import { useCallback, useEffect, useRef, useState } from 'react';
import { vaultBridge } from '../services/vaultBridge';
import type {
  DataRecord,
  QueryFilters,
  QuerySort,
  VaultStats,
  BulkInsertProgress,
  IndexStatus,
  ResponseAction,
} from '../types/protocol';

export interface VaultState {
  records: DataRecord[];
  total: number;
  queryTime: number;
  loading: boolean;
  error: string | null;
  stats: VaultStats | null;
  indexStatus: IndexStatus | null;
  bulkProgress: BulkInsertProgress | null;
  isBulkRunning: boolean;
  isClearRunning: boolean;
  vaultReady: boolean;
}

export interface VaultActions {
  setFilters: (f: Partial<QueryFilters>) => void;
  setSort: (s: QuerySort) => void;
  setPage: (p: number) => void;
  setPageSize: (s: number) => void;
  bulkInsert: (count: number) => Promise<void>;
  deleteRecords: (ids: string[]) => Promise<void>;
  clearAll: () => Promise<void>;
  refreshStats: () => void;
  filters: QueryFilters;
  sort: QuerySort;
  page: number;
  pageSize: number;
}

const DEFAULT_SORT: QuerySort = { field: 'createdAt', direction: 'desc' };
const DEFAULT_FILTERS: QueryFilters = {};

export function useVault(): VaultState & VaultActions {
  const [records, setRecords] = useState<DataRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [queryTime, setQueryTime] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<VaultStats | null>(null);
  const [indexStatus, setIndexStatus] = useState<IndexStatus | null>(null);
  const [bulkProgress, setBulkProgress] = useState<BulkInsertProgress | null>(null);
  const [isBulkRunning, setIsBulkRunning] = useState(false);
  const [isClearRunning, setIsClearRunning] = useState(false);
  const [vaultReady, setVaultReady] = useState(false);

  const [filters, setFiltersState] = useState<QueryFilters>(DEFAULT_FILTERS);
  const [sort, setSortState] = useState<QuerySort>(DEFAULT_SORT);
  const [page, setPageState] = useState(0);
  const [pageSize, setPageSizeState] = useState(50);

  const querySeqRef = useRef(0);

  useEffect(() => {
    const unsubscribe = vaultBridge.onBroadcast((action: ResponseAction, payload: unknown) => {
      if (action === 'INDEX_STATUS') {
        setIndexStatus(payload as IndexStatus);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.origin !== 'http://localhost:5174') return;
      if (e.data?.action === 'VAULT_READY') {
        setVaultReady(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const executeQuery = useCallback(
    async (f: QueryFilters, s: QuerySort, p: number, ps: number) => {
      if (!vaultBridge.isReady()) return;

      const seq = ++querySeqRef.current;
      setLoading(true);
      setError(null);

      try {
        const result = await vaultBridge.query({ filters: f, sort: s, page: p, pageSize: ps });
        if (seq !== querySeqRef.current) return;
        setRecords(result.records);
        setTotal(result.total);
        setQueryTime(result.queryTime);
      } catch (err) {
        if (seq !== querySeqRef.current) return;
        setError(err instanceof Error ? err.message : 'Query failed');
      } finally {
        if (seq === querySeqRef.current) setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    executeQuery(filters, sort, page, pageSize);
  }, [filters, sort, page, pageSize, executeQuery, vaultReady]);

  const refreshStats = useCallback(async () => {
    if (!vaultBridge.isReady()) return;
    try {
      const s = await vaultBridge.getStats();
      setStats(s);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    if (vaultReady) refreshStats();
  }, [vaultReady, refreshStats]);

  const setFilters = useCallback((partial: Partial<QueryFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...partial }));
    setPageState(0);
  }, []);

  const setSort = useCallback((s: QuerySort) => {
    setSortState(s);
    setPageState(0);
  }, []);

  const setPage = useCallback((p: number) => setPageState(p), []);
  const setPageSize = useCallback((s: number) => {
    setPageSizeState(s);
    setPageState(0);
  }, []);

  const bulkInsert = useCallback(
    async (count: number) => {
      setIsBulkRunning(true);
      setBulkProgress({ inserted: 0, total: count, percent: 0 });
      setError(null);

      try {
        await vaultBridge.bulkInsert({ count }, (progress) => {
          setBulkProgress(progress);
        });
        setBulkProgress(null);
        await executeQuery(filters, sort, page, pageSize);
        await refreshStats();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Bulk insert failed');
        setBulkProgress(null);
      } finally {
        setIsBulkRunning(false);
      }
    },
    [filters, sort, page, pageSize, executeQuery, refreshStats]
  );

  const deleteRecords = useCallback(
    async (ids: string[]) => {
      setError(null);
      try {
        await vaultBridge.deleteRecords({ ids });
        await executeQuery(filters, sort, page, pageSize);
        await refreshStats();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Delete failed');
      }
    },
    [filters, sort, page, pageSize, executeQuery, refreshStats]
  );

  const clearAll = useCallback(async () => {
    setError(null);
    setIsClearRunning(true);
    try {
      await vaultBridge.clearAll();
      setPageState(0);
      await executeQuery(filters, sort, 0, pageSize);
      await refreshStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Clear failed');
    } finally {
      setIsClearRunning(false);
    }
  }, [filters, sort, pageSize, executeQuery, refreshStats]);

  return {
    records,
    total,
    queryTime,
    loading,
    error,
    stats,
    indexStatus,
    bulkProgress,
    isBulkRunning,
    isClearRunning,
    vaultReady,
    setFilters,
    setSort,
    setPage,
    setPageSize,
    bulkInsert,
    deleteRecords,
    clearAll,
    refreshStats,
    filters,
    sort,
    page,
    pageSize,
  };
}
