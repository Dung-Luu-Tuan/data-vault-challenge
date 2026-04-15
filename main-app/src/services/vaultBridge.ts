import type {
  BulkInsertPayload,
  BulkInsertProgress,
  BulkInsertResult,
  DeletePayload,
  DeleteResult,
  QueryPayload,
  QueryResult,
  RequestAction,
  ResponseAction,
  VaultRequest,
  VaultResponse,
  VaultStats
} from '../types/protocol';

export const VAULT_ORIGIN = 'http://localhost:5174';
const DEFAULT_TIMEOUT_MS = 120_000; // 2 min — index build on large datasets can be slow
const BULK_TIMEOUT_MS = 600_000;   // 10 min — IDB on Windows can be slow for 500k records

type ProgressCallback = (progress: BulkInsertProgress) => void;
type BroadcastHandler = (action: ResponseAction, payload: unknown) => void;

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
  onProgress?: ProgressCallback;
}

class VaultBridge {
  private iframeRef: HTMLIFrameElement | null = null;
  private nonce: string = '';
  private ready: boolean = false;
  private readyPromise: Promise<void>;
  private readyResolve!: () => void;
  private pending = new Map<string, PendingRequest>();
  private broadcastHandlers: BroadcastHandler[] = [];

  constructor() {
    this.readyPromise = new Promise((res) => {
      this.readyResolve = res;
    });
    window.addEventListener('message', this.handleMessage);
  }

  attach(iframe: HTMLIFrameElement, nonce: string) {
    this.iframeRef = iframe;
    this.nonce = nonce;
  }

  detach() {
    this.iframeRef = null;
    this.ready = false;
    this.readyPromise = new Promise((res) => {
      this.readyResolve = res;
    });
  }

  onBroadcast(handler: BroadcastHandler) {
    this.broadcastHandlers.push(handler);
    return () => {
      this.broadcastHandlers = this.broadcastHandlers.filter((h) => h !== handler);
    };
  }

  async query(payload: QueryPayload): Promise<QueryResult> {
    return this.send('QUERY', payload) as Promise<QueryResult>;
  }

  async bulkInsert(payload: BulkInsertPayload, onProgress?: ProgressCallback): Promise<BulkInsertResult> {
    return this.send('BULK_INSERT', payload, onProgress) as Promise<BulkInsertResult>;
  }

  async deleteRecords(payload: DeletePayload): Promise<DeleteResult> {
    return this.send('DELETE_RECORDS', payload) as Promise<DeleteResult>;
  }

  async getStats(): Promise<VaultStats> {
    return this.send('GET_STATS', {}) as Promise<VaultStats>;
  }

  async clearAll(): Promise<void> {
    await this.send('CLEAR_ALL', {});
  }

  private async send(
    action: RequestAction,
    payload: unknown,
    onProgress?: ProgressCallback
  ): Promise<unknown> {
    await this.readyPromise;

    if (!this.iframeRef?.contentWindow) {
      throw new Error('Vault iframe is not attached');
    }

    const requestId = crypto.randomUUID();
    const timeout = action === 'BULK_INSERT' ? BULK_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error(`Request ${action}[${requestId}] timed out after ${timeout}ms`));
      }, timeout);

      this.pending.set(requestId, { resolve, reject, timer, onProgress });

      const msg: VaultRequest = {
        requestId,
        action,
        payload,
        nonce: this.nonce,
        timestamp: Date.now(),
      };

      this.iframeRef!.contentWindow!.postMessage(msg, VAULT_ORIGIN);
    });
  }

  private handleMessage = (event: MessageEvent) => {
    if (event.origin !== VAULT_ORIGIN) return;

    const msg = event.data as VaultResponse;
    if (!msg || typeof msg !== 'object' || !msg.action) return;

    const { requestId, action, payload } = msg;

    if (action === 'VAULT_READY') {
      this.ready = true;
      this.readyResolve();
      return;
    }

    if (!requestId || requestId === '__broadcast__' || requestId === '__error__') {
      this.broadcastHandlers.forEach((h) => h(action, payload));
      return;
    }

    const pending = this.pending.get(requestId);
    if (!pending) return;

    if (action === 'BULK_INSERT_PROGRESS') {
      pending.onProgress?.(payload as BulkInsertProgress);
      return;
    }

    clearTimeout(pending.timer);
    this.pending.delete(requestId);

    if (action === 'ERROR') {
      const errPayload = payload as { message: string };
      pending.reject(new Error(errPayload?.message ?? 'Unknown vault error'));
    } else {
      pending.resolve(payload);
    }
  };

  isReady() {
    return this.ready;
  }
}

export const vaultBridge = new VaultBridge();
