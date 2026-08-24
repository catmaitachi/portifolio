/**
 * Configuração da aplicação.
 *
 * Resolvida uma única vez a partir do ambiente (`.env`) e consumida como
 * objeto imutável. Para trocar qualquer comportamento — cor, comandos
 * disponíveis, origem dos dados — basta editar o `.env`: nenhum código
 * precisa mudar.
 */
import { randomNicknamesSeed } from '@/content/seed/nicknames.seed';
import { LOCALES, type Locale } from '@/i18n/types';
import { bool, color, isDev, list, mode, num, oneOf, optionalStr, str } from './env';

export const CONTENT_SOURCES = ['static', 'http'] as const;
export type ContentSourceKind = (typeof CONTENT_SOURCES)[number];

export const THEME_MODES = ['dark', 'light'] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

export interface AppConfig {
  readonly app: {
    readonly version: string;
    readonly mode: string;
    readonly isDev: boolean;
  };
  readonly owner: {
    readonly name: string;
    readonly handle: string;
    readonly role: string;
    readonly location: string;
    readonly status: string;
    readonly bio: string;
    /** Foto exibida no cartão do comando `sobre`. */
    readonly avatar: string;
  };
  readonly theme: {
    readonly accent: string;
    readonly accentOptions: readonly string[];
    readonly scanlines: boolean;
    readonly mode: ThemeMode;
  };
  readonly i18n: {
    /** Idiomas oferecidos no painel de opções. */
    readonly locales: readonly Locale[];
    readonly defaultLocale: Locale;
    /** Tenta adivinhar pelo navegador antes de cair no padrão. */
    readonly detect: boolean;
  };
  readonly welcome: {
    /** Nomes sorteáveis para quem não quiser dar o próprio. */
    readonly randomNicknames: readonly string[];
  };
  readonly terminal: {
    readonly defaultPrompt: string;
    readonly suggestedCommands: readonly string[];
    readonly disabledCommands: readonly string[];
    readonly maxHistory: number;
  };
  readonly content: {
    readonly source: ContentSourceKind;
    readonly apiUrl: string | null;
    readonly timeoutMs: number;
  };
  readonly sessionLog: {
    readonly enabled: boolean;
    readonly endpoint: string | null;
    readonly storageKey: string;
  };
  /** Sobrescritas de contato vindas do ambiente (aplicadas sobre o conteúdo). */
  readonly contactOverrides: Readonly<Record<string, string>>;
}

/** Filtra a lista do .env para os idiomas que existem de fato. */
function enabledLocales(): readonly Locale[] {
  const requested = list('VITE_LOCALES', [...LOCALES]);
  const valid = requested.filter((item): item is Locale =>
    (LOCALES as readonly string[]).includes(item),
  );
  return valid.length > 0 ? valid : LOCALES;
}

function buildContactOverrides(): Record<string, string> {
  const entries: Array<[string, string | null]> = [
    ['email', optionalStr('VITE_CONTACT_EMAIL')],
    ['github', optionalStr('VITE_CONTACT_GITHUB')],
    ['linkedin', optionalStr('VITE_CONTACT_LINKEDIN')],
    ['website', optionalStr('VITE_CONTACT_WEBSITE')],
  ];
  return Object.fromEntries(entries.filter(([, value]) => value !== null) as Array<[string, string]>);
}

export const config: AppConfig = Object.freeze({
  app: {
    version: str('VITE_APP_VERSION', 'v1.0'),
    mode,
    isDev,
  },
  owner: {
    name: str('VITE_OWNER_NAME', 'Lucas Spiazzi'),
    handle: str('VITE_OWNER_HANDLE', 'lucasspiazzi'),
    role: str('VITE_OWNER_ROLE', 'Designer & desenvolvedor de produtos digitais'),
    location: str('VITE_OWNER_LOCATION', 'Brasil · remoto'),
    status: str('VITE_OWNER_STATUS', 'disponível para projetos'),
    bio: str(
      'VITE_OWNER_BIO',
      'Trabalho na interseção entre interface, movimento e sistemas — transformando problemas complexos em experiências claras e minimalistas.',
    ),
    avatar: str('VITE_OWNER_AVATAR', '/avatar.svg'),
  },
  theme: {
    accent: color('VITE_ACCENT_COLOR', '#7dd3a8'),
    accentOptions: list('VITE_ACCENT_OPTIONS', ['#7dd3a8', '#8ab4f8', '#e0b25a', '#c98af0']),
    scanlines: bool('VITE_SCANLINES', true),
    mode: oneOf('VITE_THEME_MODE', THEME_MODES, 'dark'),
  },
  i18n: {
    locales: enabledLocales(),
    defaultLocale: oneOf('VITE_DEFAULT_LOCALE', LOCALES, 'pt-BR'),
    detect: bool('VITE_DETECT_LOCALE', true),
  },
  welcome: {
    randomNicknames: list('VITE_RANDOM_NICKNAMES', randomNicknamesSeed),
  },
  terminal: {
    defaultPrompt: str('VITE_DEFAULT_PROMPT', 'visitante'),
    suggestedCommands: list('VITE_SUGGESTED_COMMANDS', ['sobre', 'projetos', 'skills', 'contato', 'ajuda']),
    disabledCommands: list('VITE_DISABLED_COMMANDS', []),
    maxHistory: num('VITE_TERMINAL_MAX_HISTORY', 400),
  },
  content: {
    source: oneOf('VITE_CONTENT_SOURCE', CONTENT_SOURCES, 'static'),
    apiUrl: optionalStr('VITE_CONTENT_API_URL'),
    timeoutMs: num('VITE_CONTENT_API_TIMEOUT_MS', 8000),
  },
  sessionLog: {
    enabled: bool('VITE_SESSION_LOG_ENABLED', true),
    endpoint: optionalStr('VITE_SESSION_LOG_ENDPOINT'),
    storageKey: str('VITE_SESSION_LOG_STORAGE_KEY', 'portfolio:visitors'),
  },
  contactOverrides: buildContactOverrides(),
});

export type { AppConfig as Config };
