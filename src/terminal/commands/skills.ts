import { compose, heading, tags } from '../output';
import type { CommandDefinition } from '../types';

export const skillsCommand: CommandDefinition = {
  name: 'skills',
  aliases: ['stack', 'ferramentas'],
  summaryKey: 'cmd.skills.summary',
  category: 'portfólio',
  run({ content, t }) {
    return compose(
      heading(t('cmd.skills.heading')),
      ...content.skills.map((group) => tags(group.items, group.label)),
    );
  },
};
