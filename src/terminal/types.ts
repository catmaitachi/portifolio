/**
 * Contratos do terminal.
 *
 * A ideia central: um comando NÃO devolve texto pronto nem JSX — devolve
 * **blocos de saída** descritivos. Quem sabe desenhar cada bloco é o
 * registry de renderizadores (src/components/blocks). Assim dá para trocar
 * a aparência de todas as saídas sem tocar em nenhum comando, e para criar
 * um bloco novo sem mexer no motor do terminal.
 */
import type { ThemeMode } from '@/config';
import type { Locale, Translate, TranslationKey } from '@/i18n';
import type { PortfolioContent } from '@/data/types';

/* ── Blocos de saída ─────────────────────────────────────────── */

export type Tone = 'default' | 'muted' | 'accent' | 'success' | 'warn' | 'error';

export interface BaseBlock {
  /** Chave estável opcional (útil para blocos atualizados em tempo real). */
  key?: string;
}

export interface TextBlock extends BaseBlock {
  type: 'text';
  text: string;
  tone?: Tone;
}

export interface HeadingBlock extends BaseBlock {
  type: 'heading';
  text: string;
  hint?: string;
}

export interface ListItem {
  index?: string;
  title: string;
  description?: string;
  meta?: string;
  tags?: string[];
  url?: string;
  /** Comando executado ao clicar no item. */
  command?: string;
}

export interface ListBlock extends BaseBlock {
  type: 'list';
  items: ListItem[];
}

export interface TableBlock extends BaseBlock {
  type: 'table';
  columns: string[];
  rows: string[][];
  align?: Array<'left' | 'right'>;
}

export interface KeyValueBlock extends BaseBlock {
  type: 'keyValue';
  items: Array<{ key: string; value: string; url?: string }>;
}

export interface TagsBlock extends BaseBlock {
  type: 'tags';
  label?: string;
  items: string[];
}

export interface LinksBlock extends BaseBlock {
  type: 'links';
  items: Array<{ label: string; url: string; hint?: string }>;
}

export interface DividerBlock extends BaseBlock {
  type: 'divider';
}

export interface ProgressBlock extends BaseBlock {
  type: 'progress';
  label: string;
  /** 0 a 1 */
  value: number;
}

/** Uma linha `rótulo: valor` do cartão estilo neofetch. */
export interface FetchRow {
  label: string;
  value: string;
}

/**
 * Cartão no estilo `neofetch`/`fastfetch`: imagem à esquerda, ficha
 * técnica à direita e as amostras de cor do terminal embaixo.
 */
export interface FetchBlock extends BaseBlock {
  type: 'fetch';
  /** Cabeçalho `usuario@host` — o traço abaixo acompanha o tamanho dele. */
  title: string;
  avatar?: { src: string; alt: string };
  rows: FetchRow[];
  /** Amostras de cor; omitido usa a paleta do tema. */
  palette?: string[];
}

/**
 * Escotilha de escape: permite plugar um renderizador próprio sem alterar
 * este arquivo. Registre-o com `registerBlockRenderer('meu-bloco', Comp)`.
 */
export interface CustomBlock extends BaseBlock {
  type: 'custom';
  renderer: string;
  payload: unknown;
}

export type OutputBlock =
  | TextBlock
  | HeadingBlock
  | FetchBlock
  | ListBlock
  | TableBlock
  | KeyValueBlock
  | TagsBlock
  | LinksBlock
  | DividerBlock
  | ProgressBlock
  | CustomBlock;

/* ── Linhas do histórico ─────────────────────────────────────── */

export interface CommandLine {
  id: string;
  kind: 'command';
  prompt: string;
  text: string;
  at: number;
}

export interface OutputLine {
  id: string;
  kind: 'output';
  blocks: OutputBlock[];
  at: number;
}

export interface PendingLine {
  id: string;
  kind: 'pending';
  label: string;
  at: number;
}

export type HistoryLine = CommandLine | OutputLine | PendingLine;

/* ── Sessão e ações ──────────────────────────────────────────── */

/** Como o visitante chegou ao seu nome. */
export type NicknameOrigin = 'typed' | 'random';

export interface TerminalSession {
  /** Sempre preenchido: digitado pelo visitante ou sorteado. */
  nickname: string;
  origin: NicknameOrigin;
  /** Nome usado no prompt. */
  prompt: string;
  startedAt: number;
}

/** Efeitos colaterais que um comando pode disparar na aplicação. */
export interface TerminalActions {
  clear(): void;
  /** Volta para a tela de boas-vindas. */
  back(): void;
  /** Abre o diálogo de encerramento. */
  requestClose(): void;
  setAccent(color: string): void;
  /** Alterna a aparência do site inteiro (claro/escuro). */
  setThemeMode(mode: ThemeMode): void;
  /** Troca o idioma da interface. */
  setLocale(locale: Locale): void;
  toggleScanlines(force?: boolean): void;
  /** Entra/sai da tela cheia (Fullscreen API, com fallback de layout). */
  setFullscreen(force?: boolean): void;
  minimize(): void;
  /**
   * Abre a aba de detalhes de um projeto, minimizando o terminal.
   * Vale tanto para o clique na lista quanto para `projetos <nome>`.
   */
  openProject(projectId: string): void;
  /** Imprime blocos fora do fluxo de retorno (útil em comandos assíncronos). */
  print(blocks: OutputBlock[]): void;
  openUrl(url: string): void;
  /** Executa outro comando programaticamente. */
  run(input: string): void;
}

export interface CommandContext {
  /** Linha completa digitada, sem o nome do comando. */
  raw: string;
  /** Argumentos já separados (respeitando aspas). */
  args: string[];
  /** Flags no formato `--chave=valor` ou `--flag`. */
  flags: Record<string, string | boolean>;
  content: PortfolioContent;
  session: TerminalSession;
  actions: TerminalActions;
  registry: CommandRegistry;
  history: HistoryLine[];
  /** Tradutor preso ao idioma atual. */
  t: Translate;
  locale: Locale;
}

export type CommandOutcome = OutputBlock[] | void;

export interface CommandDefinition {
  name: string;
  aliases?: string[];
  /** Chave de tradução da descrição — resolvida por `ajuda`. */
  summaryKey: TranslationKey;
  usage?: string;
  category?: string;
  /** Fica fora de `ajuda` e do autocompletar. */
  hidden?: boolean;
  /** Sugestões extras para o Tab (ex.: nomes de projetos). */
  complete?(ctx: CommandContext): string[];
  run(ctx: CommandContext): CommandOutcome | Promise<CommandOutcome>;
}

export interface CommandRegistry {
  register(command: CommandDefinition): void;
  get(name: string): CommandDefinition | undefined;
  has(name: string): boolean;
  all(): CommandDefinition[];
  visible(): CommandDefinition[];
  names(includeAliases?: boolean): string[];
  /** Nomes que começam com `prefix`, para autocompletar. */
  completions(prefix: string): string[];
  /** Comando mais parecido — usado na mensagem de "não reconhecido". */
  suggest(name: string): string | null;
}
