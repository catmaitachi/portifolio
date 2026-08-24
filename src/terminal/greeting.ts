/**
 * Mensagem de abertura do terminal.
 *
 * Isolada aqui para poder ser trocada/traduzida sem mexer no motor.
 */
import { config } from '@/config';
import type { Translate } from '@/i18n';
import { accent, compose, muted, text } from './output';
import type { OutputBlock, TerminalSession } from './types';

export function buildGreeting(session: TerminalSession, t: Translate): OutputBlock[] {
  return compose(
    accent(t('greeting.connected')),
    text(t('greeting.welcome', { name: session.nickname })),
    session.origin === 'random' ? muted(t('greeting.random')) : null,
    muted(t('greeting.help', { version: config.app.version })),
  );
}
