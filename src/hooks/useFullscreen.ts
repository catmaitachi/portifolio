/**
 * Tela cheia real, via Fullscreen API.
 *
 * O estado é sempre lido do navegador (`fullscreenchange`), não do nosso
 * clique — assim sair com Esc/F11 mantém a UI sincronizada.
 *
 * Se a API não existir ou for recusada (iOS Safari, iframe sem
 * `allow="fullscreen"`), caímos para o modo "preencher a viewport": o
 * visual é o mesmo, só a barra do navegador continua visível.
 */
import { useCallback, useEffect, useState } from 'react';

/** Prefixos usados por Safari/WebKit antigos. */
interface WebkitDocument extends Document {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?(): Promise<void> | void;
}
interface WebkitElement extends HTMLElement {
  webkitRequestFullscreen?(): Promise<void> | void;
}

function currentElement(): Element | null {
  const doc = document as WebkitDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

export interface UseFullscreenResult {
  /** A janela deve ocupar toda a tela (inclui o fallback sem API). */
  fullscreen: boolean;
  /** `true` quando o navegador está de fato em tela cheia. */
  native: boolean;
  toggle(force?: boolean): void;
  exit(): void;
}

export function useFullscreen(): UseFullscreenResult {
  const [native, setNative] = useState(false);
  /** Ligado só quando a API falha — mantém o layout em tela cheia mesmo assim. */
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const sync = () => {
      const active = currentElement() !== null;
      setNative(active);
      // Sair pelo Esc/F11 também precisa desfazer o fallback.
      if (!active) setFallback(false);
    };

    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    sync();

    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
    };
  }, []);

  const enter = useCallback(async () => {
    const target = document.documentElement as WebkitElement;
    const request = target.requestFullscreen ?? target.webkitRequestFullscreen;
    if (!request) {
      setFallback(true);
      return;
    }
    try {
      await request.call(target);
    } catch (cause) {
      console.warn('[fullscreen] pedido recusado — usando preenchimento da viewport', cause);
      setFallback(true);
    }
  }, []);

  const leave = useCallback(async () => {
    setFallback(false);
    if (currentElement() === null) return;
    const doc = document as WebkitDocument;
    const release = doc.exitFullscreen ?? doc.webkitExitFullscreen;
    try {
      await release?.call(doc);
    } catch (cause) {
      console.warn('[fullscreen] não foi possível sair da tela cheia', cause);
    }
  }, []);

  const fullscreen = native || fallback;

  const toggle = useCallback(
    (force?: boolean) => {
      const next = force ?? !fullscreen;
      void (next ? enter() : leave());
    },
    [enter, leave, fullscreen],
  );

  return {
    fullscreen,
    native,
    toggle,
    exit: () => void leave(),
  };
}
