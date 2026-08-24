/**
 * English dictionary.
 *
 * Typed as `Record<TranslationKey, string>`: a key missing here (or a typo)
 * is a compile error, so translations can't silently drift.
 */
import type { TranslationKey } from '../types';

export const en: Record<TranslationKey, string> = {
  /* ── Welcome ────────────────────────────────────────────── */
  'welcome.badge': 'Welcome',
  'welcome.title.line1': "Who's",
  'welcome.title.line2': 'logging in?',
  'welcome.lead': "Pick a nickname for a personalised session. It doesn't have to be your real name.",
  'welcome.input.placeholder': 'Your nickname',
  'welcome.input.label': 'Your nickname',
  'welcome.submit': 'Continue',
  'welcome.why.trigger': 'Why should I give my name?',
  'welcome.why.body': "No sign-up, no tracking — nothing but the name leaves this page. It personalises the terminal prompt during your visit and stays in my logs purely to satisfy my curiosity about who dropped by.",
  'welcome.why.offer': "If you'd rather not give yours, I'll draw one for you:",
  'welcome.roll.first': 'Draw a name for me',
  'welcome.roll.again': 'Draw another name',
  'welcome.roll.hint': 'you are now {name} — feel free to edit before continuing',
  'welcome.footer': '{version} — local session',
  'welcome.notice.degraded': 'remote content unavailable ({error}) — showing local data.',
  'welcome.notice.unknownError': 'unknown error',

  /* ── Terminal chrome ────────────────────────────────────── */
  'boot.loading': 'loading session',
  'window.close': 'Close',
  'window.minimize': 'Minimise',
  'window.fullscreen.enter': 'Full screen',
  'window.fullscreen.exit': 'Exit full screen',
  'window.menu': 'Menu',
  'window.input.label': 'Command line',
  'menu.title': 'MENU',
  'menu.history': 'History',
  'menu.history.hint': 'view',
  'menu.clear': 'Clear',
  'menu.clear.hint': 'ctrl+L',
  'menu.share': 'Share',
  'menu.soon': 'soon',
  'suggestions.label': 'SUGGESTED COMMANDS',
  'dock.hint': 'click to open',
  'dialog.exit.title': 'End the session?',
  'dialog.exit.text': 'Thanks for stopping by {name}, go with the shadows.',
  'dialog.cancel': 'Cancel',
  'dialog.confirm': 'End it',

  /* ── Project tab ────────────────────────────────────────── */
  'project.back': 'back to terminal',
  'project.aria': 'Details for project {name}',
  'project.fact.role': 'role',
  'project.fact.client': 'client',
  'project.fact.period': 'period',
  'project.fact.status': 'status',
  'project.section.about': 'The project',
  'project.section.highlights': 'Decisions & results',
  'project.section.tools': 'Tools',
  'project.section.links': 'Links',
  'project.link.main': 'project',

  /* ── Settings panel ─────────────────────────────────────── */
  'settings.open': 'Open settings',
  'settings.close': 'Close settings',
  'settings.title': 'SETTINGS',
  'settings.accent': 'Accent colour',
  'settings.mode': 'Appearance',
  'settings.mode.dark': 'Dark',
  'settings.mode.light': 'Light',
  'settings.scanlines': 'Scanlines',
  'settings.on': 'On',
  'settings.off': 'Off',
  'settings.locale': 'Language',
  'settings.footer': 'your choices stay in this browser',

  /* ── Engine ─────────────────────────────────────────────── */
  'engine.unknown': 'command not found: "{name}" — type "help".',
  'engine.unknown.suggest': 'command not found: "{name}" — did you mean "{suggestion}"?',
  'engine.error': 'error running "{name}": {message}',

  /* ── Command summaries ──────────────────────────────────── */
  'cmd.ajuda.summary': 'list the available commands',
  'cmd.sobre.summary': 'who I am',
  'cmd.projetos.summary': 'selected work',
  'cmd.skills.summary': 'tools and stack',
  'cmd.experiencia.summary': 'professional background',
  'cmd.contato.summary': 'how to reach me',
  'cmd.tema.summary': 'change colour, appearance and effects',
  'cmd.idioma.summary': 'change the interface language',
  'cmd.whoami.summary': 'current session data',
  'cmd.historico.summary': 'commands run in this session',
  'cmd.diag.summary': 'configuration and data source status',
  'cmd.limpar.summary': 'clear the terminal',
  'cmd.voltar.summary': 'return to the start screen',
  'cmd.sair.summary': 'end the session',
  'cmd.sudo.summary': 'elevated privileges',

  /* ── Command output ─────────────────────────────────────── */
  'cmd.ajuda.heading': 'Available commands',
  'cmd.ajuda.col.command': 'command',
  'cmd.ajuda.col.description': 'description',
  'cmd.ajuda.footer': 'Tab completes · ↑/↓ walks the history · "help <command>" explains one.',
  'cmd.ajuda.noHelp': 'no help for "{name}" — type "help" for the full list.',
  'cmd.ajuda.usage': 'usage: {usage}',
  'cmd.ajuda.aliases': 'aliases: {aliases}',

  'cmd.sobre.uptime': 'Uptime',
  'cmd.sobre.packages': '{count} projects',
  'cmd.sobre.terminal': '{name}’s session',
  'cmd.sobre.contact': 'Contact',
  'cmd.sobre.status': 'Status',

  'cmd.projetos.heading': 'Selected work',
  'cmd.projetos.count': '{count} projects',
  'cmd.projetos.hint': 'Click an item (or type "projects <name>") to open the details.',
  'cmd.projetos.opening': 'opening {name} — the terminal stays minimised meanwhile.',
  'cmd.projetos.notFound': 'project "{query}" not found — type "projects" for the list.',

  'cmd.skills.heading': 'Tools & stack',
  'cmd.experiencia.heading': 'Background',
  'cmd.experiencia.empty': 'no experience registered in this content source.',
  'cmd.contato.heading': 'Contact',
  'cmd.contato.footer': 'I reply to emails within 48 business hours.',

  'cmd.tema.heading': 'Theme',
  'cmd.tema.accentLabel': 'accent colour',
  'cmd.tema.available': 'available',
  'cmd.tema.usage': 'usage: theme #7dd3a8 · theme 2 · theme light · theme scanlines off',
  'cmd.tema.invalidColor': 'invalid colour: "{value}" — use a hex (#7dd3a8) or the list index.',
  'cmd.tema.accentSet': 'accent colour is now {color}.',
  'cmd.tema.scanlinesOn': 'scanlines on.',
  'cmd.tema.scanlinesOff': 'scanlines off.',
  'cmd.tema.scanlinesToggled': 'scanlines toggled.',
  'cmd.tema.modeSet': 'appearance is now {mode}.',

  'cmd.idioma.heading': 'Language',
  'cmd.idioma.available': 'available',
  'cmd.idioma.usage': 'usage: lang pt-BR · lang en',
  'cmd.idioma.set': 'language changed to {locale}.',
  'cmd.idioma.unknown': 'language "{value}" is not available.',

  'cmd.whoami.nick': 'nick',
  'cmd.whoami.origin': 'origin',
  'cmd.whoami.origin.typed': 'given',
  'cmd.whoami.origin.random': 'drawn',
  'cmd.whoami.session': 'session',
  'cmd.whoami.commands': 'commands',
  'cmd.whoami.footer': 'None of this leaves your browser, except the nick — that one stays in the logs.',

  'cmd.historico.heading': 'Session history',
  'cmd.historico.empty': 'no commands run yet.',
  'cmd.historico.col.command': 'command',
  'cmd.historico.col.time': 'time',

  'cmd.diag.heading': 'Diagnostics',
  'cmd.diag.version': 'version',
  'cmd.diag.mode': 'mode',
  'cmd.diag.source': 'source',
  'cmd.diag.loaded': 'loaded',
  'cmd.diag.projects': 'projects',
  'cmd.diag.commands': 'commands',
  'cmd.diag.locale': 'language',
  'cmd.diag.envIssues': 'ignored variables:',
  'cmd.diag.envOk': 'no environment problems.',

  'cmd.sudo.output': '{name} is not in the sudoers file. This incident will be reported.',

  /* ── Greeting ───────────────────────────────────────────── */
  'greeting.connected': 'Connection established ············ OK',
  'greeting.welcome': 'Welcome, {name}.',
  'greeting.random': '(drawn name — you can go back and pick another)',
  'greeting.help': 'Type "help" to see the available commands, or click a suggestion below. ({version})',
};
