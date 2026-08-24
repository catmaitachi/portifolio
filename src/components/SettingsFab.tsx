/**
 * Botão flutuante de opções (canto inferior direito).
 *
 * Fica acima de tudo e vale para o site inteiro — boas-vindas, terminal e
 * aba de projeto. As opções vêm do contexto de preferências, então o
 * painel não guarda estado nenhum: ele só desenha e delega.
 */
import { useEffect, useRef, useState } from 'react';
import { config } from '@/config';
import { LOCALE_LABELS } from '@/i18n';
import { useSettings } from '@/settings';

export function SettingsFab() {
  const settings = useSettings();
  const { t } = settings;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  /** Fecha ao clicar fora ou pressionar Esc. */
  useEffect(() => {
    if (!open) return undefined;

    const handlePointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey, true);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey, true);
    };
  }, [open]);

  return (
    <div className="fab" ref={rootRef}>
      {open ? (
        <div className="fab__panel" role="dialog" aria-label={t('settings.title')}>
          <div className="fab__panel-title">{t('settings.title')}</div>

          <div className="fab__group">
            <span className="fab__label">{t('settings.accent')}</span>
            <div className="fab__swatches">
              {config.theme.accentOptions.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`fab__swatch${color === settings.accent ? ' fab__swatch--active' : ''}`}
                  style={{ background: color, color }}
                  aria-label={color}
                  aria-pressed={color === settings.accent}
                  onClick={() => settings.setAccent(color)}
                />
              ))}
            </div>
          </div>

          <div className="fab__group">
            <span className="fab__label">{t('settings.mode')}</span>
            <div className="fab__segmented" role="group" aria-label={t('settings.mode')}>
              {(['dark', 'light'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={`fab__segment${settings.mode === mode ? ' fab__segment--active' : ''}`}
                  aria-pressed={settings.mode === mode}
                  onClick={() => settings.setMode(mode)}
                >
                  <span aria-hidden="true">{mode === 'dark' ? '◐' : '◑'}</span>
                  {t(mode === 'dark' ? 'settings.mode.dark' : 'settings.mode.light')}
                </button>
              ))}
            </div>
          </div>

          <div className="fab__group">
            <span className="fab__label">{t('settings.scanlines')}</span>
            <button
              type="button"
              className={`fab__switch${settings.scanlines ? ' fab__switch--on' : ''}`}
              role="switch"
              aria-checked={settings.scanlines}
              onClick={() => settings.setScanlines(!settings.scanlines)}
            >
              <span className="fab__switch-track">
                <span className="fab__switch-thumb" />
              </span>
              {t(settings.scanlines ? 'settings.on' : 'settings.off')}
            </button>
          </div>

          {settings.locales.length > 1 ? (
            <div className="fab__group">
              <span className="fab__label">{t('settings.locale')}</span>
              <div className="fab__segmented" role="group" aria-label={t('settings.locale')}>
                {settings.locales.map((locale) => (
                  <button
                    key={locale}
                    type="button"
                    className={`fab__segment${settings.locale === locale ? ' fab__segment--active' : ''}`}
                    aria-pressed={settings.locale === locale}
                    onClick={() => settings.setLocale(locale)}
                  >
                    {LOCALE_LABELS[locale]}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="fab__footer">{t('settings.footer')}</div>
        </div>
      ) : null}

      <button
        type="button"
        className={`fab__button${open ? ' fab__button--open' : ''}`}
        aria-expanded={open}
        aria-label={t(open ? 'settings.close' : 'settings.open')}
        title={t(open ? 'settings.close' : 'settings.open')}
        onClick={() => setOpen((current) => !current)}
      >
        <SlidersIcon />
      </button>
    </div>
  );
}

/** Ícone de controles deslizantes — legível em 18px. */
function SlidersIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 7h14M5 12h14M5 17h14"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="9" cy="7" r="2.4" fill="var(--surface)" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="15" cy="12" r="2.4" fill="var(--surface)" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="8" cy="17" r="2.4" fill="var(--surface)" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
