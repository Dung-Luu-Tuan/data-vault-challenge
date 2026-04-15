import type { QueryFilters, Department } from '../types/protocol';

const DEPARTMENTS: Department[] = [
  'Engineering', 'Marketing', 'Sales', 'HR', 'Finance',
  'Operations', 'Legal', 'Design', 'Product', 'Support',
];

interface Props {
  filters: QueryFilters;
  onChange: (partial: Partial<QueryFilters>) => void;
  onReset: () => void;
}

export function FilterPanel({ filters, onChange, onReset }: Props) {
  const hasFilters =
    !!filters.department || !!filters.status ||
    filters.salaryMin != null || filters.salaryMax != null;

  return (
    <div className="filter-panel">
      <div className="filter-group">
        <label className="filter-label" htmlFor="filter-dept">Department</label>
        <select
          id="filter-dept"
          className="filter-select"
          value={filters.department ?? ''}
          onChange={(e) => onChange({ department: e.target.value as Department | '' })}
        >
          <option value="">All departments</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label className="filter-label" htmlFor="filter-status">Status</label>
        <select
          id="filter-status"
          className="filter-select"
          value={filters.status ?? ''}
          onChange={(e) => onChange({ status: e.target.value as 'active' | 'inactive' | '' })}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="filter-group filter-salary">
        <label className="filter-label">Salary range</label>
        <div className="salary-inputs">
          <input
            type="number"
            className="filter-input"
            placeholder="Min"
            value={filters.salaryMin ?? ''}
            min={0}
            step={5000}
            onChange={(e) =>
              onChange({ salaryMin: e.target.value ? Number(e.target.value) : undefined })
            }
            aria-label="Minimum salary"
          />
          <span className="salary-sep">-</span>
          <input
            type="number"
            className="filter-input"
            placeholder="Max"
            value={filters.salaryMax ?? ''}
            min={0}
            step={5000}
            onChange={(e) =>
              onChange({ salaryMax: e.target.value ? Number(e.target.value) : undefined })
            }
            aria-label="Maximum salary"
          />
        </div>
      </div>

      {hasFilters && (
        <button className="btn btn-ghost btn-sm filter-reset" onClick={onReset}>
          X Reset filters
        </button>
      )}
    </div>
  );
}
