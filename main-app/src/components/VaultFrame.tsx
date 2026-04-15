import { useEffect, useRef } from 'react';
import { vaultBridge, VAULT_ORIGIN } from '../services/vaultBridge';

const VAULT_URL = `${VAULT_ORIGIN}/index.html`;

export function VaultFrame() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const nonceRef = useRef<string>(crypto.randomUUID());

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    vaultBridge.attach(iframe, nonceRef.current);

    return () => {
      vaultBridge.detach();
    };
  }, []);

  return (
    <iframe
      ref={iframeRef}
      src={`${VAULT_URL}#${nonceRef.current}`}
      sandbox="allow-scripts allow-same-origin"
      title="Data Vault (Secure Storage)"
      aria-hidden="true"
      style={{
        position: 'absolute',
        width: 0,
        height: 0,
        border: 'none',
        opacity: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
