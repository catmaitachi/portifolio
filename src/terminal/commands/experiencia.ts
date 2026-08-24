import { compose, heading, list, muted } from '../output';
import type { CommandDefinition } from '../types';

export const experienciaCommand: CommandDefinition = {
  name: 'experiencia',
  aliases: ['experiência', 'xp', 'cv'],
  summaryKey: 'cmd.experiencia.summary',
  category: 'portfólio',
  run({ content, t }) {
    if (content.experience.length === 0) {
      return [muted(t('cmd.experiencia.empty'))];
    }
    return compose(
      heading(t('cmd.experiencia.heading')),
      list(
        content.experience.map((entry) => ({
          index: entry.period,
          title: entry.company,
          description: entry.description,
          meta: entry.role,
        })),
      ),
    );
  },
};
