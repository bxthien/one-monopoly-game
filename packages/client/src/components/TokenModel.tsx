import React, { useLayoutEffect, useRef, useState } from 'react';
import type { VesselToken } from '@one-monopoly/shared';
import { TOKEN_CONFIG } from './TokenBadge.js';

function tokenAsset(token: VesselToken, extension: 'webp' | 'glb') {
  return `/models/tokens/${token.toLowerCase().replaceAll('_', '-')}.${extension}`;
}

export const tokenPosterUrl = (token: VesselToken) => tokenAsset(token, 'webp');

let rendererReady: Promise<boolean> | undefined;

async function loadRenderer() {
  if (!window.customElements || !window.WebGL2RenderingContext) return false;
  const probe = document.createElement('canvas').getContext('webgl2');
  if (!probe) return false;
  probe.getExtension('WEBGL_lose_context')?.loseContext();
  await import('@google/model-viewer');
  return true;
}

interface Props {
  token: VesselToken;
  interactive?: boolean;
}

export const TokenModel: React.FC<Props> = ({ token, interactive = false }) => {
  const slot = useRef<HTMLSpanElement>(null);
  const [ready, setReady] = useState(false);
  const { label, desc } = TOKEN_CONFIG[token];

  useLayoutEffect(() => {
    const mount = slot.current!;
    let current = true;
    setReady(false);
    rendererReady ??= loadRenderer().catch(() => false);

    void rendererReady.then((supported) => {
      if (!current || !supported) return;
      const viewer = document.createElement('model-viewer');
      viewer.setAttribute('src', tokenAsset(token, 'glb'));
      viewer.setAttribute('alt', interactive ? `${label}. ${desc}. Kéo hoặc dùng phím mũi tên để xoay.` : label);
      viewer.setAttribute('loading', 'eager');
      viewer.setAttribute('camera-orbit', '30deg 62deg auto');
      viewer.setAttribute('environment-image', 'neutral');
      viewer.setAttribute('shadow-intensity', '0.6');
      viewer.setAttribute('interaction-prompt', 'none');
      if (interactive) {
        viewer.setAttribute('camera-controls', '');
        viewer.setAttribute('disable-pan', '');
        viewer.setAttribute('disable-zoom', '');
        viewer.setAttribute('disable-tap', '');
        viewer.setAttribute('touch-action', 'pan-y');
      }

      viewer.inert = true;
      viewer.addEventListener('load', () => {
        if (!current) return;
        viewer.inert = !interactive;
        setReady(true);
      });
      viewer.addEventListener('error', () => {
        if (!current) return;
        viewer.inert = true;
        setReady(false);
      });
      mount.append(viewer);
    });

    return () => {
      current = false;
      mount.replaceChildren();
    };
  }, [token, interactive, label, desc]);

  return (
    <span className={interactive ? 'token-model token-model-interactive' : 'token-model'}
      data-ready={ready ? '' : undefined} aria-hidden={interactive ? undefined : true}>
      <img src={tokenPosterUrl(token)} alt={interactive ? `${label}. ${desc}.` : ''} draggable={false} />
      <span ref={slot} />
    </span>
  );
};
