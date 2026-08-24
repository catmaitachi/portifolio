import type { CommandDefinition } from '../types';

export const limparCommand: CommandDefinition = {
  name: 'limpar',
  aliases: ['clear', 'cls'],
  summaryKey: 'cmd.limpar.summary',
  category: 'sistema',
  run({ actions }) {
    actions.clear();
  },
};
