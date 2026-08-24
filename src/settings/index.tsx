/**
 * Preferências globais do site: cor principal, aparência (claro/escuro),
 * scanlines e idioma.
 *
 * Ficam num contexto único porque afetam o site inteiro — as duas telas,
 * a aba de projeto e as saídas do terminal. O valor inicial vem do `.env`
 * (ou do navegador, no caso do idioma) e a escolha do visitante persiste
 * no `localStorage` dele.
 */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { config, type ThemeMode } from '@/config';
import { createTranslator, detectLocale, isLocale, type Locale, type Translate } from '@/i18n';
import { readJson, writeJson } from '@/lib/storage';

const STORAGE_KEY = 'portfolio:settings';

export interface Settings {
  accent: string;
  mode: ThemeMode;
  scanlines: boolean;
  locale: Locale;
}

export interface SettingsApi extends Settings {
  setAccent(color: string): void;
  setMode(mode: ThemeMode): void;
  toggleMode(): void;
  setScanlines(value: boolean): void;
  setLocale(locale: Locale): void;
  /** Tradutor já preso ao idioma atual. */
  t: Translate;
  /** Idiomas habilitados, para o seletor. */
  locales: readonly Locale[];
}

function initialSettings(): Settings {
  const fallback: Settings = {
    accent: config.theme.accent,
    mode: config.theme.mode,
    scanlines: config.theme.scanlines,
    locale: config.i18n.detect
      ? detectLocale(config.i18n.locales, config.i18n.defaultLocale)
      : config.i18n.defaultLocale,
  };

  const stored = readJson<Partial<Settings>>(STORAGE_KEY, {});
  const locale =
    typeof stored.locale === 'string' && isLocale(stored.locale) && config.i18n.locales.includes(stored.locale)
      ? stored.locale
      : fallback.locale;

  return {
    accent: typeof stored.accent === 'string' ? stored.accent : fallback.accent,
    mode: stored.mode === 'light' || stored.mode === 'dark' ? stored.mode : fallback.mode,
    scanlines: typeof stored.scanlines === 'boolean' ? stored.scanlines : fallback.scanlines,
    locale,
  };
}

const SettingsContext = createContext<SettingsApi | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(initialSettings);

  /** Aplica no documento e persiste — um efeito só, uma fonte de verdade. */
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--accent', settings.accent);
    root.dataset.theme = settings.mode;
    root.lang = settings.locale;
    writeJson(STORAGE_KEY, settings);
  }, [settings]);

  const api = useMemo<SettingsApi>(() => {
    const patch = (change: Partial<Settings>) =>
      setSettings((current) => ({ ...current, ...change }));

    return {
      ...settings,
      setAccent: (accent) => patch({ accent }),
      setMode: (mode) => patch({ mode }),
      toggleMode: () => setSettings((c) => ({ ...c, mode: c.mode === 'dark' ? 'light' : 'dark' })),
      setScanlines: (scanlines) => patch({ scanlines }),
      setLocale: (locale) => patch({ locale }),
      t: createTranslator(settings.locale),
      locales: config.i18n.locales,
    };
  }, [settings]);

  return <SettingsContext.Provider value={api}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsApi {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings precisa estar dentro de <SettingsProvider>');
  return context;
}

/** Atalho para quem só quer traduzir. */
export function useT(): Translate {
  return useSettings().t;
}

// Reexportado para o hook de uso mais comum não precisar de dois imports.
export const settingsStorageKey = STORAGE_KEY;
