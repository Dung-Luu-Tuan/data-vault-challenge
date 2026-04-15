const ALLOWED_ORIGIN = 'http://localhost:5173';

let _nonce = null;

function initSecurity() {
  const hash = location.hash;
  if (hash && hash.length > 1) {
    _nonce = decodeURIComponent(hash.slice(1));
  }
}

function validateMessage(event) {
  if (event.origin !== ALLOWED_ORIGIN) {
    return { valid: false, error: `Rejected origin: ${event.origin}` };
  }

  const msg = event.data;
  if (!msg || typeof msg !== 'object') {
    return { valid: false, error: 'Malformed message: not an object' };
  }

  for (const field of ['requestId', 'action', 'nonce', 'timestamp']) {
    if (!(field in msg)) {
      return { valid: false, error: `Missing field: ${field}` };
    }
  }

  if (_nonce && msg.nonce !== _nonce) {
    return { valid: false, error: 'Invalid nonce' };
  }

  const age = Date.now() - msg.timestamp;
  if (age > 30_000) {
    return { valid: false, error: `Stale message: age=${age}ms` };
  }

  return { valid: true };
}

function buildResponse(requestId, action, payload) {
  return { requestId, action, payload, timestamp: Date.now() };
}

function replyToParent(requestId, action, payload) {
  parent.postMessage(buildResponse(requestId, action, payload), ALLOWED_ORIGIN);
}
