import type { CommandDefinition } from '../types';

export const voltarCommand: CommandDefinition = {
  name: 'voltar',
  aliases: ['back', 'reset'],
  summaryKey: 'cmd.voltar.summary',
  category: 'sistema',
  run({ actions }) {
    actions.back();
  },
};
