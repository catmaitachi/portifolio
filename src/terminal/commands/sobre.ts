import { config } from '@/config';
import { formatDuration } from '@/lib/time';
import { compose, fetchCard, muted, text } from '../output';
import type { CommandDefinition, FetchRow } from '../types';

/**
 * Ficha no estilo `neofetch`/`fastfetch`: foto à esquerda, dados à
 * direita. Os rótulos técnicos (OS, Host, Kernel) são iguais em qualquer
 * idioma — só os textuais passam pelo dicionário.
 */
export const sobreCommand: CommandDefinition = {
  name: 'sobre',
  aliases: ['about', 'bio', 'neofetch'],
  summaryKey: 'cmd.sobre.summary',
  category: 'portfólio',
  run({ content, session, t }) {
    const { profile } = content;
    const email = content.contacts.find((contact) => contact.id === 'email');

    const rows: FetchRow[] = [
      { label: 'OS', value: profile.role },
      { label: 'Host', value: profile.location },
      { label: 'Kernel', value: `portfolio-terminal ${config.app.version}` },
      { label: t('cmd.sobre.uptime'), value: formatDuration(Date.now() - session.startedAt) },
      { label: 'Packages', value: t('cmd.sobre.packages', { count: content.projects.length }) },
      { label: 'Terminal', value: t('cmd.sobre.terminal', { name: session.nickname }) },
      ...content.skills.map((group) => ({
        label: group.label,
        value: group.items.join(' · '),
      })),
      ...(email ? [{ label: t('cmd.sobre.contact'), value: email.value }] : []),
      { label: t('cmd.sobre.status'), value: profile.status },
    ];

    return compose(
      fetchCard({
        title: `${profile.handle}@portfolio`,
        avatar: { src: config.owner.avatar, alt: `Foto de ${profile.name}` },
        rows,
      }),
      text(profile.bio),
      ...profile.highlights.map((line) => muted(`› ${line}`)),
    );
  },
};
