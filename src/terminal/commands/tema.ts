import { config } from '@/config';
import { compose, heading, muted, success, tags } from '../output';
import type { CommandDefinition } from '../types';

const SCANLINE_ON = ['on', 'ligar', 'sim', 'true'];
const SCANLINE_OFF = ['off', 'desligar', 'nao', 'não', 'false'];
const LIGHT = ['claro', 'light', 'dia'];
const DARK = ['escuro', 'dark', 'noite'];

/**
 * Mesmo conjunto de opções do painel flutuante — quem prefere o teclado
 * não precisa abrir menu nenhum.
 */
export const temaCommand: CommandDefinition = {
  name: 'tema',
  aliases: ['theme', 'cor'],
  summaryKey: 'cmd.tema.summary',
  usage: 'tema [cor|#hex] | tema claro|escuro | tema scanlines on|off',
  category: 'sistema',
  complete: () => ['scanlines', 'claro', 'escuro', ...config.theme.accentOptions],
  run({ args, actions, t }) {
    const [first, second] = args;

    if (!first) {
      return compose(
        heading(t('cmd.tema.heading'), t('cmd.tema.accentLabel')),
        tags([...config.theme.accentOptions], t('cmd.tema.available')),
        muted(t('cmd.tema.usage')),
      );
    }

    const value = first.toLowerCase();

    if (value === 'scanlines') {
      const state = (second ?? '').toLowerCase();
      if (SCANLINE_ON.includes(state)) {
        actions.toggleScanlines(true);
        return [success(t('cmd.tema.scanlinesOn'))];
      }
      if (SCANLINE_OFF.includes(state)) {
        actions.toggleScanlines(false);
        return [success(t('cmd.tema.scanlinesOff'))];
      }
      actions.toggleScanlines();
      return [success(t('cmd.tema.scanlinesToggled'))];
    }

    if (LIGHT.includes(value) || DARK.includes(value)) {
      const mode = LIGHT.includes(value) ? 'light' : 'dark';
      actions.setThemeMode(mode);
      return [
        success(
          t('cmd.tema.modeSet', {
            mode: t(mode === 'light' ? 'settings.mode.light' : 'settings.mode.dark').toLowerCase(),
          }),
        ),
      ];
    }

    const byIndex = Number(first);
    const chosen = Number.isInteger(byIndex) ? config.theme.accentOptions[byIndex - 1] : first;

    if (!chosen || !/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(chosen)) {
      return [muted(t('cmd.tema.invalidColor', { value: first }))];
    }

    actions.setAccent(chosen);
    return [success(t('cmd.tema.accentSet', { color: chosen }))];
  },
};
