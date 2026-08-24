import { formatDuration } from '@/lib/time';
import { compose, keyValue, muted } from '../output';
import type { CommandDefinition } from '../types';

export const whoamiCommand: CommandDefinition = {
  name: 'whoami',
  aliases: ['eu', 'sessao', 'sessão'],
  summaryKey: 'cmd.whoami.summary',
  category: 'sistema',
  run({ session, history, t }) {
    const executed = history.filter((line) => line.kind === 'command').length;
    return compose(
      keyValue([
        { key: t('cmd.whoami.nick'), value: session.nickname },
        {
          key: t('cmd.whoami.origin'),
          value: t(
            session.origin === 'random' ? 'cmd.whoami.origin.random' : 'cmd.whoami.origin.typed',
          ),
        },
        { key: t('cmd.whoami.session'), value: formatDuration(Date.now() - session.startedAt) },
        { key: t('cmd.whoami.commands'), value: String(executed) },
      ]),
      muted(t('cmd.whoami.footer')),
    );
  },
};
