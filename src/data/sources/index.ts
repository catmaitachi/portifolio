/**
 * Resolvedor de fonte de conteúdo.
 *
 * Para adicionar uma nova origem (Supabase, Notion, CMS…), basta criar o
 * módulo, registrá-lo aqui e adicionar o nome em `CONTENT_SOURCES`
 * (src/config/app.config.ts).
 */
import { config } from '@/config';
import type { ContentSource } from '@/data/source';
import { createHttpSource } from './httpSource';
import { createStaticSource } from './staticSource';

export function resolveContentSource(): ContentSource {
  if (config.content.source === 'http') {
    if (!config.content.apiUrl) {
      console.warn(
        '[content] VITE_CONTENT_SOURCE=http mas VITE_CONTENT_API_URL está vazio — usando fonte estática.',
      );
      return createStaticSource();
    }
    return createHttpSource(config.content.apiUrl);
  }
  return createStaticSource();
}

export { createHttpSource, createStaticSource };
