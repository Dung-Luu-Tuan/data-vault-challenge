import { useState } from 'react';
import type { BulkInsertProgress, VaultStats, IndexStatus } from '../types/protocol';

interface Props {
  onBulkInsert: (count: number) => void;
  onClearAll: () => void;
  isBulkRunning: boolean;
  isClearRunning: boolean;
  bulkProgress: BulkInsertProgress | null;
  stats: VaultStats | null;
  indexStatus: IndexStatus | null;
}

const PRESETS = [10_000, 50_000, 100_000, 500_000];

export function BulkActions({
  onBulkInsert,
  onClearAll,
  isBulkRunning,
  isClearRunning,
  bulkProgress,
  stats,
  indexStatus,
}: Props) {
  const [customCount, setCustomCount] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  function handleInsert(count: number) {
    if (isBulkRunning) return;
    onBulkInsert(count);
    setCustomCount('');
  }

  function handleCustomInsert() {
    const n = parseInt(customCount, 10);
    if (!isNaN(n) && n > 0) handleInsert(n);
  }

  const displayStatus = indexStatus ?? (stats ? { status: stats.indexStatus, size: stats.indexedRecords } : null);

  return (
    <div className="bulk-panel">
      <div className="stats-bar">
        <div className="stat">
          <span className="stat-value">{stats?.totalRecords?.toLocaleString() ?? '–'}</span>
          <span className="stat-label">Total records</span>
        </div>
        <div className="stat">
          <span className={`stat-value index-status-${displayStatus?.status ?? 'empty'}`}>
            {displayStatus?.status === 'building' ? 'Indexing…' : displayStatus?.status === 'ready' ? 'Ready' : '–'}
          </span>
          <span className="stat-label">Index</span>
        </div>
      </div>

      {isBulkRunning && bulkProgress && (
        <div className="progress-container">
          <div className="progress-header">
            <span>Inserting {bulkProgress.total.toLocaleString()} records…</span>
            <span>{bulkProgress.percent}%</span>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${bulkProgress.percent}%` }}
            />
          </div>
          <div className="progress-footer">
            {bulkProgress.inserted.toLocaleString()} / {bulkProgress.total.toLocaleString()} inserted
          </div>
        </div>
      )}

      <div className="bulk-section">
        <span className="bulk-label">Bulk Insert</span>
        <div className="bulk-buttons">
          {PRESETS.map((n) => (
            <button
              key={n}
              className="btn btn-primary btn-sm"
              disabled={isBulkRunning}
              onClick={() => handleInsert(n)}
            >
              +{n.toLocaleString()}
            </button>
          ))}
          <div className="custom-insert">
            <input
              type="number"
              className="filter-input custom-count-input"
              placeholder="Custom…"
              value={customCount}
              min={1}
              max={1_000_000}
              onChange={(e) => setCustomCount(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCustomInsert()}
              disabled={isBulkRunning}
              aria-label="Custom record count"
            />
            <button
              className="btn btn-primary btn-sm"
              disabled={isBulkRunning || !customCount}
              onClick={handleCustomInsert}
            >
              Insert
            </button>
          </div>
        </div>
      </div>

      <div className="danger-zone">
        {isClearRunning ? (
          <button className="btn btn-danger btn-sm" disabled>
            <span className="btn-spinner" /> Clearing…
          </button>
        ) : !showConfirm ? (
          <button
            className="btn btn-danger btn-sm"
            disabled={isBulkRunning}
            onClick={() => setShowConfirm(true)}
          >
            Clear all data
          </button>
        ) : (
          <div className="confirm-bar">
            <span>Are you sure? This will delete all records.</span>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => { onClearAll(); setShowConfirm(false); }}
            >
              Yes, clear
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowConfirm(false)}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
