import type { CommandDefinition } from '../types';

export const sairCommand: CommandDefinition = {
  name: 'sair',
  aliases: ['exit', 'quit', 'logout'],
  summaryKey: 'cmd.sair.summary',
  category: 'sistema',
  run({ actions }) {
    actions.requestClose();
  },
};
