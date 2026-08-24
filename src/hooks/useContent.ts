/**
 * Carrega o conteúdo do portfólio da fonte configurada, com fallback
 * automático para a fonte estática se a remota falhar.
 */
import { useEffect, useMemo, useState } from 'react';
import { resolveContentSource } from '@/data';
import { createStaticSource } from '@/data/sources';
import type { PortfolioContent } from '@/data/types';

export type ContentStatus = 'loading' | 'ready' | 'degraded';

export interface UseContentResult {
  content: PortfolioContent | null;
  status: ContentStatus;
  error: string | null;
}

export function useContent(): UseContentResult {
  const source = useMemo(() => resolveContentSource(), []);
  const [content, setContent] = useState<PortfolioContent | null>(null);
  const [status, setStatus] = useState<ContentStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    source
      .load(controller.signal)
      .then((loaded) => {
        if (!active) return;
        setContent(loaded);
        setStatus('ready');
      })
      .catch(async (cause: unknown) => {
        if (!active) return;
        console.warn('[content] fonte principal falhou, usando seed local', cause);
        const fallback = await createStaticSource().load();
        if (!active) return;
        setContent(fallback);
        setStatus('degraded');
        setError(cause instanceof Error ? cause.message : 'falha ao carregar conteúdo');
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [source]);

  return { content, status, error };
}
