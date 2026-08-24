import { config } from '@/config';
import { LOCALE_LABELS, createTranslator, isLocale } from '@/i18n';
import { compose, heading, muted, success, tags } from '../output';
import type { CommandDefinition } from '../types';

export const idiomaCommand: CommandDefinition = {
  name: 'idioma',
  aliases: ['idiomas', 'lang', 'language'],
  summaryKey: 'cmd.idioma.summary',
  usage: 'idioma [pt-BR|en]',
  category: 'sistema',
  complete: () => [...config.i18n.locales],
  run({ args, actions, t }) {
    const requested = args[0];

    if (!requested) {
      return compose(
        heading(t('cmd.idioma.heading')),
        tags(
          config.i18n.locales.map((locale) => `${locale} (${LOCALE_LABELS[locale]})`),
          t('cmd.idioma.available'),
        ),
        muted(t('cmd.idioma.usage')),
      );
    }

    // Aceita "pt", "PT-br", "en-US" — resolve pelo prefixo.
    const match = config.i18n.locales.find(
      (locale) =>
        locale.toLowerCase() === requested.toLowerCase() ||
        locale.split('-')[0].toLowerCase() === requested.split('-')[0].toLowerCase(),
    );

    if (!match || !isLocale(match)) {
      return [muted(t('cmd.idioma.unknown', { value: requested }))];
    }

    actions.setLocale(match);
    // A confirmação sai já no idioma novo: `t` do contexto ainda é o antigo.
    const next = createTranslator(match);
    return [success(next('cmd.idioma.set', { locale: LOCALE_LABELS[match] }))];
  },
};
