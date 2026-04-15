export type Department =
  | 'Engineering' | 'Marketing' | 'Sales' | 'HR' | 'Finance'
  | 'Operations' | 'Legal' | 'Design' | 'Product' | 'Support';

export interface DataRecord {
  id: string;
  name: string;
  email: string;
  department: Department;
  salary: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

export type RequestAction =
  | 'QUERY'
  | 'BULK_INSERT'
  | 'DELETE_RECORDS'
  | 'GET_STATS'
  | 'CLEAR_ALL'
  | 'BUILD_INDEX';

export type ResponseAction =
  | 'VAULT_READY'
  | 'PONG'
  | 'QUERY_RESULT'
  | 'BULK_INSERT_PROGRESS'
  | 'BULK_INSERT_RESULT'
  | 'DELETE_RESULT'
  | 'STATS_RESULT'
  | 'CLEAR_RESULT'
  | 'INDEX_STATUS'
  | 'ERROR';

export interface QueryFilters {
  search?: string;
  department?: Department | '';
  status?: 'active' | 'inactive' | '';
  salaryMin?: number;
  salaryMax?: number;
}

export interface QuerySort {
  field: keyof DataRecord;
  direction: 'asc' | 'desc';
}

export interface QueryPayload {
  filters: QueryFilters;
  sort: QuerySort;
  page: number;
  pageSize: number;
}

export interface BulkInsertPayload {
  count: number;
}

export interface DeletePayload {
  ids: string[];
}

export interface QueryResult {
  records: DataRecord[];
  total: number;
  page: number;
  pageSize: number;
  queryTime: number;
}

export interface BulkInsertProgress {
  inserted: number;
  total: number;
  percent: number;
}

export interface BulkInsertResult {
  success: boolean;
  inserted: number;
  total: number;
}

export interface DeleteResult {
  success: boolean;
  deleted: number;
  total: number;
}

export interface VaultStats {
  totalRecords: number;
  indexStatus: 'empty' | 'building' | 'ready';
  indexedRecords: number;
}

export interface IndexStatus {
  status: 'empty' | 'building' | 'ready';
  size: number;
}

export interface VaultRequest {
  requestId: string;
  action: RequestAction;
  payload: unknown;
  nonce: string;
  timestamp: number;
}

export interface VaultResponse {
  requestId: string;
  action: ResponseAction;
  payload: unknown;
  timestamp: number;
}
