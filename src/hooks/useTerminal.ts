/**
 * Estado e ciclo de vida do terminal.
 *
 * Junta registry + motor + histórico e expõe uma API estável para a UI.
 * Toda a lógica de teclado (Enter, Tab, ↑/↓) vive aqui — os componentes
 * só desenham.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { config } from '@/config';
import { useSettings } from '@/settings';
import { nextId } from '@/lib/id';
import { commands, createRegistry, executeCommand } from '@/terminal';
import { buildGreeting } from '@/terminal/greeting';
import { parseInput } from '@/terminal/parse';
import type {
  CommandRegistry,
  HistoryLine,
  OutputBlock,
  TerminalActions,
  TerminalSession,
} from '@/terminal/types';
import type { PortfolioContent } from '@/data/types';

/** Ações que só a aplicação (janela, tema, navegação) sabe executar. */
export type HostActions = Pick<
  TerminalActions,
  | 'back'
  | 'requestClose'
  | 'setAccent'
  | 'toggleScanlines'
  | 'setFullscreen'
  | 'minimize'
  | 'openUrl'
  | 'openProject'
>;
// setThemeMode/setLocale saem direto do contexto de preferências, então
// não precisam ser passados de fora.

export interface UseTerminalOptions {
  content: PortfolioContent;
  session: TerminalSession;
  host: HostActions;
}

export interface UseTerminalResult {
  registry: CommandRegistry;
  history: HistoryLine[];
  input: string;
  busy: boolean;
  setInput(value: string): void;
  submit(value?: string): void;
  run(value: string): void;
  handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>): void;
  clear(): void;
  suggestions: string[];
}

export function useTerminal({ content, session, host }: UseTerminalOptions): UseTerminalResult {
  const settings = useSettings();
  const registry = useMemo(() => createRegistry(commands), []);
  const [history, setHistory] = useState<HistoryLine[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  /** Refs evitam closures obsoletas dentro das ações passadas aos comandos. */
  const contentRef = useRef(content);
  const sessionRef = useRef(session);
  const historyRef = useRef(history);
  const settingsRef = useRef(settings);
  const runRef = useRef<(value: string) => void>(() => {});
  const commandLog = useRef<string[]>([]);
  const logCursor = useRef(-1);
  const draft = useRef('');

  contentRef.current = content;
  sessionRef.current = session;
  historyRef.current = history;
  settingsRef.current = settings;

  const append = useCallback((line: HistoryLine) => {
    setHistory((previous) => {
      const next = [...previous, line];
      const overflow = next.length - config.terminal.maxHistory;
      return overflow > 0 ? next.slice(overflow) : next;
    });
  }, []);

  const print = useCallback(
    (blocks: OutputBlock[]) => {
      if (blocks.length === 0) return;
      append({ id: nextId('out'), kind: 'output', blocks, at: Date.now() });
    },
    [append],
  );

  const clear = useCallback(() => {
    setHistory([]);
    setInput('');
  }, []);

  const actions = useMemo<TerminalActions>(
    () => ({
      ...host,
      setThemeMode: (mode) => settingsRef.current.setMode(mode),
      setLocale: (locale) => settingsRef.current.setLocale(locale),
      clear,
      print,
      run: (value: string) => runRef.current(value),
    }),
    [host, clear, print],
  );

  const run = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;

      commandLog.current = [...commandLog.current, trimmed];
      logCursor.current = -1;
      draft.current = '';
      setInput('');

      append({
        id: nextId('cmd'),
        kind: 'command',
        prompt: `${sessionRef.current.prompt}:$`,
        text: trimmed,
        at: Date.now(),
      });

      setBusy(true);
      void executeCommand({
        input: trimmed,
        registry,
        content: contentRef.current,
        session: sessionRef.current,
        actions,
        history: historyRef.current,
        t: settingsRef.current.t,
        locale: settingsRef.current.locale,
      })
        .then((result) => print(result.blocks))
        .finally(() => setBusy(false));
    },
    [actions, append, print, registry],
  );

  runRef.current = run;

  /** Saudação inicial — reexecutada quando a sessão muda (novo login). */
  useEffect(() => {
    setHistory([
      {
        id: nextId('out'),
        kind: 'output',
        blocks: buildGreeting(session, settingsRef.current.t),
        at: Date.now(),
      },
    ]);
    commandLog.current = [];
    logCursor.current = -1;
  }, [session]);

  const complete = useCallback(
    (value: string): string | null => {
      if (!value.includes(' ')) {
        const matches = registry.completions(value.trim());
        return matches.length === 1 ? `${matches[0]} ` : null;
      }

      const parsed = parseInput(value);
      const command = registry.get(parsed.name);
      if (!command?.complete) return null;

      const partial = (parsed.args[parsed.args.length - 1] ?? '').toLowerCase();
      const options = command
        .complete({
          raw: parsed.raw,
          args: parsed.args,
          flags: parsed.flags,
          content: contentRef.current,
          session: sessionRef.current,
          actions,
          registry,
          history: historyRef.current,
          t: settingsRef.current.t,
          locale: settingsRef.current.locale,
        })
        .filter((option) => option.toLowerCase().startsWith(partial));

      if (options.length !== 1) return null;
      const cut = partial ? value.lastIndexOf(partial) : value.length;
      return `${value.slice(0, cut === -1 ? value.length : cut)}${options[0]}`;
    },
    [actions, registry],
  );

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        run(input);
        return;
      }

      if (event.key === 'Tab') {
        event.preventDefault();
        const completed = complete(input);
        if (completed) setInput(completed);
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        const log = commandLog.current;
        if (log.length === 0) return;
        if (logCursor.current === -1) {
          draft.current = input;
          logCursor.current = log.length - 1;
        } else {
          logCursor.current = Math.max(0, logCursor.current - 1);
        }
        setInput(log[logCursor.current]);
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const log = commandLog.current;
        if (logCursor.current === -1) return;
        if (logCursor.current >= log.length - 1) {
          logCursor.current = -1;
          setInput(draft.current);
          return;
        }
        logCursor.current += 1;
        setInput(log[logCursor.current]);
        return;
      }

      if (event.key === 'l' && event.ctrlKey) {
        event.preventDefault();
        clear();
      }
    },
    [clear, complete, input, run],
  );

  const suggestions = useMemo(
    () => config.terminal.suggestedCommands.filter((name) => registry.has(name)),
    [registry],
  );

  return {
    registry,
    history,
    input,
    busy,
    setInput,
    submit: (value?: string) => run(value ?? input),
    run,
    handleKeyDown,
    clear,
    suggestions,
  };
}
