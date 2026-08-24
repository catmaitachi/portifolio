/**
 * Fonte estática: monta o conteúdo a partir do arquivo de seed, aplicando
 * por cima as sobrescritas vindas do `.env` (identidade e contatos).
 *
 * É a fonte padrão e serve de fallback quando a fonte remota falha.
 */
import { config } from '@/config';
import type { ContactLink, PortfolioContent } from '@/data/types';
import type { ContentSource } from '@/data/source';
import {
  contactsSeed,
  experienceSeed,
  highlightsSeed,
  projectsSeed,
  skillsSeed,
} from '@/content/seed/portfolio.seed';

/** Transforma um valor bruto de contato em rótulo curto + URL navegável. */
function normalizeContact(id: string, value: string): ContactLink {
  if (id === 'email') {
    const email = value.replace(/^mailto:/, '');
    return { id, label: 'email', value: email, url: `mailto:${email}` };
  }
  const hasProtocol = /^https?:\/\//i.test(value);
  const url = hasProtocol ? value : `https://${value}`;
  const pretty = url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
  return { id, label: id, value: pretty, url };
}

function applyContactOverrides(base: ContactLink[]): ContactLink[] {
  const merged = new Map(base.map((contact) => [contact.id, contact]));
  for (const [id, value] of Object.entries(config.contactOverrides)) {
    merged.set(id, normalizeContact(id, value));
  }
  return [...merged.values()];
}

export function createStaticSource(): ContentSource {
  return {
    id: 'static:seed+env',
    async load(): Promise<PortfolioContent> {
      return {
        profile: {
          name: config.owner.name,
          handle: config.owner.handle,
          role: config.owner.role,
          location: config.owner.location,
          status: config.owner.status,
          bio: config.owner.bio,
          highlights: highlightsSeed,
        },
        projects: projectsSeed,
        skills: skillsSeed,
        contacts: applyContactOverrides(contactsSeed),
        experience: experienceSeed,
        meta: {
          source: 'static:seed+env',
          fetchedAt: new Date().toISOString(),
          revision: config.app.version,
        },
      };
    },
  };
}
