initSecurity();

const worker = new Worker('worker.js');

worker.onmessage = (e) => {
  const { requestId, action, payload } = e.data;
  replyToParent(requestId ?? '__broadcast__', action, payload);
};

worker.onerror = (e) => {
  console.error('[DataVault Worker Error]', e.message);
  replyToParent('__error__', 'ERROR', { message: e.message });
};

window.addEventListener('message', (event) => {
  const { valid, error } = validateMessage(event);

  if (!valid) {
    console.warn('[DataVault Security]', error);
    return;
  }

  const { requestId, action, payload } = event.data;
  worker.postMessage({ requestId, action, payload });
});

function announceReady() {
  const nonce = location.hash.slice(1);
  parent.postMessage(
    { requestId: '__init__', action: 'VAULT_READY', payload: { nonce }, timestamp: Date.now() },
    'http://localhost:5173'
  );
}

announceReady();
