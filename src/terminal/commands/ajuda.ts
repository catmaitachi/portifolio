import { compose, divider, heading, muted, table } from '../output';
import type { CommandDefinition } from '../types';

export const ajudaCommand: CommandDefinition = {
  name: 'ajuda',
  aliases: ['help', '?'],
  summaryKey: 'cmd.ajuda.summary',
  usage: 'ajuda [comando]',
  category: 'sistema',
  complete: ({ registry }) => registry.names(),
  run({ args, registry, t }) {
    const target = args[0];

    if (target) {
      const command = registry.get(target);
      if (!command) {
        return [muted(t('cmd.ajuda.noHelp', { name: target }))];
      }
      return compose(
        heading(command.name, command.category),
        muted(t(command.summaryKey)),
        command.usage ? muted(t('cmd.ajuda.usage', { usage: command.usage })) : null,
        command.aliases?.length
          ? muted(t('cmd.ajuda.aliases', { aliases: command.aliases.join(', ') }))
          : null,
      );
    }

    const rows = registry
      .visible()
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
      .map((command) => [command.name, t(command.summaryKey)]);

    return compose(
      heading(t('cmd.ajuda.heading')),
      table([t('cmd.ajuda.col.command'), t('cmd.ajuda.col.description')], rows),
      divider(),
      muted(t('cmd.ajuda.footer')),
    );
  },
};
