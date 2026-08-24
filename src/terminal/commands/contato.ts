import { compose, heading, keyValue, muted } from '../output';
import type { CommandDefinition } from '../types';

export const contatoCommand: CommandDefinition = {
  name: 'contato',
  aliases: ['contact', 'links'],
  summaryKey: 'cmd.contato.summary',
  category: 'portfólio',
  run({ content, t }) {
    return compose(
      heading(t('cmd.contato.heading'), content.profile.status),
      keyValue(
        content.contacts.map((contact) => ({
          key: contact.label,
          value: contact.value,
          url: contact.url,
        })),
      ),
      muted(t('cmd.contato.footer')),
    );
  },
};
