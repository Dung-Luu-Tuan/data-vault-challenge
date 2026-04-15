import './App.css';
import { VaultFrame } from './components/VaultFrame';
import { DataTable } from './components/DataTable';
import { SearchBar } from './components/SearchBar';
import { FilterPanel } from './components/FilterPanel';
import { BulkActions } from './components/BulkActions';
import { useVault } from './hooks/useVault';

export default function App() {
  const vault = useVault();

  function resetFilters() {
    vault.setFilters({
      search: '',
      department: '',
      status: '',
      salaryMin: undefined,
      salaryMax: undefined,
    });
  }

  return (
    <>
      <VaultFrame />

      <div className="app-shell">
        <header className="app-header">
          <div className="header-brand">
            <span className="brand-icon">⬡</span>
            <div>
              <h1 className="brand-title">Data Vault</h1>
              <p className="brand-sub">High-performance isolated data layer</p>
            </div>
          </div>
          <div className="header-status">
            <div className={`vault-indicator ${vault.vaultReady ? 'ready' : 'connecting'}`}>
              <span className="indicator-dot" />
              <span>{vault.vaultReady ? 'Vault connected' : 'Connecting…'}</span>
            </div>
          </div>
        </header>

        <main className="app-main">
          <aside className="sidebar">
            <BulkActions
              onBulkInsert={vault.bulkInsert}
              onClearAll={vault.clearAll}
              isBulkRunning={vault.isBulkRunning}
              isClearRunning={vault.isClearRunning}
              bulkProgress={vault.bulkProgress}
              stats={vault.stats}
              indexStatus={vault.indexStatus}
            />
          </aside>

          <section className="content">
            <div className="toolbar">
              <SearchBar
                value={vault.filters.search ?? ''}
                onChange={(v) => vault.setFilters({ search: v })}
              />
              <FilterPanel
                filters={vault.filters}
                onChange={vault.setFilters}
                onReset={resetFilters}
              />
            </div>

            {vault.error && (
              <div className="error-banner" role="alert">
                <span>⚠ {vault.error}</span>
                <button onClick={() => vault.setFilters({})}>Dismiss</button>
              </div>
            )}

            <DataTable
              records={vault.records}
              total={vault.total}
              loading={vault.loading}
              sort={vault.sort}
              onSort={vault.setSort}
              onDelete={vault.deleteRecords}
              page={vault.page}
              pageSize={vault.pageSize}
              onPage={vault.setPage}
              queryTime={vault.queryTime}
            />
          </section>
        </main>
      </div>
    </>
  );
}
