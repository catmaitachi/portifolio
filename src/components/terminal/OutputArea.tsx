/**
 * Área de saída + linha de digitação.
 *
 * Só desenha: histórico vem pronto do `useTerminal`, e cada linha de
 * saída delega ao registry de blocos.
 */
import { useEffect, useRef } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { BlockList } from '@/components/blocks';
import { useT } from '@/settings';
import type { HistoryLine } from '@/terminal/types';

export interface OutputAreaProps {
  history: HistoryLine[];
  prompt: string;
  input: string;
  busy: boolean;
  onInputChange(value: string): void;
  onKeyDown(event: KeyboardEvent<HTMLInputElement>): void;
}

export function OutputArea({
  history,
  prompt,
  input,
  busy,
  onInputChange,
  onKeyDown,
}: OutputAreaProps) {
  const t = useT();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /** Mantém o cursor sempre visível ao final da saída. */
  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [history, busy]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const focusInput = (event: React.MouseEvent) => {
    // Não rouba o foco de links ou itens clicáveis dentro da saída.
    if ((event.target as HTMLElement).closest('a, button')) return;
    if (window.getSelection()?.toString()) return;
    inputRef.current?.focus();
  };

  return (
    <div className="output" ref={scrollRef} onClick={focusInput} role="log" aria-live="polite">
      {history.map((line) => {
        if (line.kind === 'command') {
          return (
            <div className="output__command" key={line.id}>
              <span className="output__prompt">{line.prompt}</span>
              <span className="output__command-text">{line.text}</span>
            </div>
          );
        }
        if (line.kind === 'pending') {
          return (
            <div className="output__pending" key={line.id}>
              {line.label}
            </div>
          );
        }
        return (
          <div className="output__blocks" key={line.id}>
            <BlockList blocks={line.blocks} />
          </div>
        );
      })}

      <div className="output__cursor-line">
        <span className="output__prompt">{prompt}:$</span>
        <div className="output__input-wrap">
          <input
            ref={inputRef}
            className="output__input"
            value={input}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onInputChange(event.target.value)}
            onKeyDown={onKeyDown}
            aria-label={t('window.input.label')}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}
