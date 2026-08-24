/**
 * Fonte remota: busca o conteúdo em `VITE_CONTENT_API_URL`.
 *
 * É o caminho pronto para o banco de dados — a API só precisa devolver um
 * JSON no formato de `PortfolioContent` (campos ausentes caem no seed).
 * Em caso de erro, o resolvedor faz fallback para a fonte estática.
 */
import { config } from '@/config';
import type { PortfolioContent } from '@/data/types';
import { ContentSourceError, type ContentSource } from '@/data/source';
import { createStaticSource } from './staticSource';

type PartialContent = Partial<PortfolioContent>;

/** Mescla a resposta remota com o seed, campo a campo. */
function merge(remote: PartialContent, fallback: PortfolioContent, endpoint: string): PortfolioContent {
  return {
    profile: { ...fallback.profile, ...(remote.profile ?? {}) },
    projects: remote.projects?.length ? remote.projects : fallback.projects,
    skills: remote.skills?.length ? remote.skills : fallback.skills,
    contacts: remote.contacts?.length ? remote.contacts : fallback.contacts,
    experience: remote.experience?.length ? remote.experience : fallback.experience,
    meta: {
      source: `http:${endpoint}`,
      fetchedAt: new Date().toISOString(),
      revision: remote.meta?.revision,
    },
  };
}

export function createHttpSource(endpoint: string): ContentSource {
  const id = `http:${endpoint}`;
  return {
    id,
    async load(signal?: AbortSignal): Promise<PortfolioContent> {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), config.content.timeoutMs);
      signal?.addEventListener('abort', () => controller.abort(), { once: true });

      try {
        const response = await fetch(endpoint, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) {
          throw new ContentSourceError(`HTTP ${response.status} ao buscar conteúdo`, id);
        }
        const payload = (await response.json()) as PartialContent;
        const fallback = await createStaticSource().load();
        return merge(payload, fallback, endpoint);
      } catch (error) {
        if (error instanceof ContentSourceError) throw error;
        throw new ContentSourceError('falha ao consultar a API de conteúdo', id, error);
      } finally {
        window.clearTimeout(timeout);
      }
    },
  };
}
