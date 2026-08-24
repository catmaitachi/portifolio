import { muted } from '../output';
import type { CommandDefinition } from '../types';

export const sudoCommand: CommandDefinition = {
  name: 'sudo',
  summaryKey: 'cmd.sudo.summary',
  hidden: true,
  category: 'easter egg',
  run({ session, t }) {
    return [muted(t('cmd.sudo.output', { name: session.nickname }))];
  },
};
