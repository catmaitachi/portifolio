import { compose, heading, muted, table } from '../output';
import type { CommandDefinition } from '../types';

export const historicoCommand: CommandDefinition = {
  name: 'historico',
  aliases: ['histórico', 'history'],
  summaryKey: 'cmd.historico.summary',
  category: 'sistema',
  run({ history, t, locale }) {
    const commands = history.filter((line) => line.kind === 'command');
    if (commands.length === 0) {
      return [muted(t('cmd.historico.empty'))];
    }
    const rows = commands.map((line, index) => [
      String(index + 1).padStart(2, '0'),
      line.kind === 'command' ? line.text : '',
      new Date(line.at).toLocaleTimeString(locale),
    ]);
    return compose(
      heading(t('cmd.historico.heading')),
      table(['#', t('cmd.historico.col.command'), t('cmd.historico.col.time')], rows),
    );
  },
};
