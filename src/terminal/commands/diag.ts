import { config, envIssues } from '@/config';
import { LOCALE_LABELS } from '@/i18n';
import { compose, heading, keyValue, muted, warn } from '../output';
import type { CommandDefinition } from '../types';

/**
 * Diagnóstico da configuração — mostra de onde os dados vieram e quais
 * variáveis de ambiente foram ignoradas por estarem inválidas.
 */
export const diagCommand: CommandDefinition = {
  name: 'diag',
  aliases: ['config', 'status'],
  summaryKey: 'cmd.diag.summary',
  category: 'sistema',
  run({ content, registry, t, locale }) {
    return compose(
      heading(t('cmd.diag.heading')),
      keyValue([
        { key: t('cmd.diag.version'), value: config.app.version },
        { key: t('cmd.diag.mode'), value: config.app.mode },
        { key: t('cmd.diag.locale'), value: `${locale} (${LOCALE_LABELS[locale]})` },
        { key: t('cmd.diag.source'), value: content.meta.source },
        { key: t('cmd.diag.loaded'), value: new Date(content.meta.fetchedAt).toLocaleString(locale) },
        { key: t('cmd.diag.projects'), value: String(content.projects.length) },
        { key: t('cmd.diag.commands'), value: String(registry.all().length) },
      ]),
      envIssues.length > 0 ? warn(t('cmd.diag.envIssues')) : muted(t('cmd.diag.envOk')),
      ...envIssues.map((issue) => muted(`  · ${issue}`)),
    );
  },
};
