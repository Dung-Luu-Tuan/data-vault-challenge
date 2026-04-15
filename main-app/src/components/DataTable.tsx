import { useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { DataRecord, QuerySort } from '../types/protocol';

interface Props {
  records: DataRecord[];
  total: number;
  loading: boolean;
  sort: QuerySort;
  onSort: (sort: QuerySort) => void;
  onDelete: (ids: string[]) => void;
  page: number;
  pageSize: number;
  onPage: (p: number) => void;
  queryTime: number;
}

const COLUMNS: { key: keyof DataRecord; label: string; width: string }[] = [
  { key: 'name', label: 'Name', width: '18%' },
  { key: 'email', label: 'Email', width: '22%' },
  { key: 'department', label: 'Department', width: '13%' },
  { key: 'salary', label: 'Salary', width: '11%' },
  { key: 'status', label: 'Status', width: '9%' },
  { key: 'createdAt', label: 'Created', width: '12%' },
];

const ROW_HEIGHT = 48;

export function DataTable({
  records,
  total,
  loading,
  sort,
  onSort,
  onDelete,
  page,
  pageSize,
  onPage,
  queryTime,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: records.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  const totalPages = Math.ceil(total / pageSize);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === records.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(records.map((r) => r.id)));
    }
  }

  function handleSort(field: keyof DataRecord) {
    onSort({
      field,
      direction: sort.field === field && sort.direction === 'asc' ? 'desc' : 'asc',
    });
  }

  function handleDeleteSelected() {
    if (selected.size === 0) return;
    onDelete(Array.from(selected));
    setSelected(new Set());
  }

  const sortIcon = (field: keyof DataRecord) => {
    if (sort.field !== field) return <span className="sort-icon neutral">↕</span>;
    return (
      <span className="sort-icon active">
        {sort.direction === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  const formatSalary = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="data-table-wrapper">
      <div className="table-toolbar">
        <div className="table-meta">
          {loading ? (
            <span className="loading-badge">Querying…</span>
          ) : (
            <>
              <span className="total-badge">{total.toLocaleString()} records</span>
              {queryTime > 0 && (
                <span className="query-time">{queryTime}ms</span>
              )}
            </>
          )}
        </div>

        <div className="table-actions">
          {selected.size > 0 && (
            <button className="btn btn-danger btn-sm" onClick={handleDeleteSelected}>
              Delete {selected.size} selected
            </button>
          )}
        </div>

        <div className="pagination">
          <button
            className="btn btn-ghost btn-sm"
            disabled={page === 0}
            onClick={() => onPage(page - 1)}
          >
            ‹ Prev
          </button>
          <span className="page-info">
            Page {page + 1} / {totalPages || 1}
          </span>
          <button
            className="btn btn-ghost btn-sm"
            disabled={page >= totalPages - 1}
            onClick={() => onPage(page + 1)}
          >
            Next ›
          </button>
        </div>
      </div>

      <div className="table-header">
        <div className="col-checkbox">
          <input
            type="checkbox"
            checked={selected.size > 0 && selected.size === records.length}
            onChange={toggleAll}
            aria-label="Select all"
          />
        </div>
        {COLUMNS.map(({ key, label, width }) => (
          <div
            key={key}
            className="col-header"
            style={{ width }}
            onClick={() => handleSort(key)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleSort(key)}
          >
            {label} {sortIcon(key)}
          </div>
        ))}
      </div>

      <div
        ref={parentRef}
        className="table-scroll"
        style={{ height: '520px', overflowY: 'auto' }}
      >
        {records.length === 0 && !loading ? (
          <div className="empty-state">
            <span>No records found</span>
          </div>
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((vItem) => {
              const record = records[vItem.index];
              if (!record) return null;
              const isSelected = selected.has(record.id);

              return (
                <div
                  key={vItem.key}
                  className={`table-row${isSelected ? ' selected' : ''}`}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${vItem.size}px`,
                    transform: `translateY(${vItem.start}px)`,
                  }}
                >
                  <div className="col-checkbox">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(record.id)}
                      aria-label={`Select ${record.name}`}
                    />
                  </div>
                  <div className="col-cell" style={{ width: '18%' }} title={record.name}>
                    {record.name}
                  </div>
                  <div className="col-cell col-email" style={{ width: '22%' }} title={record.email}>
                    {record.email}
                  </div>
                  <div className="col-cell" style={{ width: '13%' }}>
                    <span className="dept-tag">
                      {record.department}
                    </span>
                  </div>
                  <div className="col-cell col-salary" style={{ width: '11%' }}>
                    {formatSalary(record.salary)}
                  </div>
                  <div className="col-cell" style={{ width: '9%' }}>
                    <span className={`status-badge status-${record.status}`}>
                      {record.status}
                    </span>
                  </div>
                  <div className="col-cell col-date" style={{ width: '12%' }}>
                    {record.createdAt}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
