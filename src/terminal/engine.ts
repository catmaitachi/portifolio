/**
 * Motor do terminal.
 *
 * Recebe uma linha digitada, resolve o comando no registry, executa e
 * devolve os blocos de saída. Não conhece React nem DOM — é testável
 * isoladamente e reutilizável em outro front-end.
 */
import { parseInput } from './parse';
import { muted } from './output';
import type {
  CommandContext,
  CommandRegistry,
  HistoryLine,
  OutputBlock,
  TerminalActions,
  TerminalSession,
} from './types';
import type { Locale, Translate } from '@/i18n';
import type { PortfolioContent } from '@/data/types';

export interface ExecuteOptions {
  input: string;
  registry: CommandRegistry;
  content: PortfolioContent;
  session: TerminalSession;
  actions: TerminalActions;
  history: HistoryLine[];
  t: Translate;
  locale: Locale;
}

export interface ExecuteResult {
  blocks: OutputBlock[];
  /** `false` quando a linha era vazia e nem deve entrar no histórico. */
  handled: boolean;
}

export async function executeCommand(options: ExecuteOptions): Promise<ExecuteResult> {
  const { input, registry, content, session, actions, history, t, locale } = options;
  const parsed = parseInput(input);

  if (!parsed.name) {
    return { blocks: [], handled: false };
  }

  const command = registry.get(parsed.name);

  if (!command) {
    const suggestion = registry.suggest(parsed.name);
    return {
      handled: true,
      blocks: [
        muted(
          suggestion
            ? t('engine.unknown.suggest', { name: parsed.name, suggestion })
            : t('engine.unknown', { name: parsed.name }),
        ),
      ],
    };
  }

  const context: CommandContext = {
    raw: parsed.raw,
    args: parsed.args,
    flags: parsed.flags,
    content,
    session,
    actions,
    registry,
    history,
    t,
    locale,
  };

  try {
    const outcome = await command.run(context);
    return { blocks: outcome ?? [], handled: true };
  } catch (cause) {
    console.error(`[terminal] falha em "${command.name}"`, cause);
    const message = cause instanceof Error ? cause.message : 'erro desconhecido';
    return {
      handled: true,
      blocks: [muted(t('engine.error', { name: command.name, message }))],
    };
  }
}
