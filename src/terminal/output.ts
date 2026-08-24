/**
 * Construtores de blocos de saída.
 *
 * Comandos usam estas funções em vez de montar objetos na mão — mantém a
 * escrita curta e o formato consistente.
 */
import type {
  DividerBlock,
  FetchBlock,
  HeadingBlock,
  KeyValueBlock,
  LinksBlock,
  ListBlock,
  ListItem,
  OutputBlock,
  ProgressBlock,
  TableBlock,
  TagsBlock,
  TextBlock,
  Tone,
} from './types';

export function text(value: string, tone: Tone = 'default'): TextBlock {
  return { type: 'text', text: value, tone };
}

export const muted = (value: string): TextBlock => text(value, 'muted');
export const accent = (value: string): TextBlock => text(value, 'accent');
export const success = (value: string): TextBlock => text(value, 'success');
export const warn = (value: string): TextBlock => text(value, 'warn');
export const error = (value: string): TextBlock => text(value, 'error');

export function heading(value: string, hint?: string): HeadingBlock {
  return { type: 'heading', text: value, hint };
}

export function list(items: ListItem[]): ListBlock {
  return { type: 'list', items };
}

export function table(
  columns: string[],
  rows: string[][],
  align?: Array<'left' | 'right'>,
): TableBlock {
  return { type: 'table', columns, rows, align };
}

export function keyValue(items: KeyValueBlock['items']): KeyValueBlock {
  return { type: 'keyValue', items };
}

export function tags(items: string[], label?: string): TagsBlock {
  return { type: 'tags', items, label };
}

export function links(items: LinksBlock['items']): LinksBlock {
  return { type: 'links', items };
}

/** Cartão estilo neofetch (foto + ficha técnica). */
export function fetchCard(options: Omit<FetchBlock, 'type'>): FetchBlock {
  return { type: 'fetch', ...options };
}

export function divider(): DividerBlock {
  return { type: 'divider' };
}

export function progress(label: string, value: number): ProgressBlock {
  return { type: 'progress', label, value: Math.min(1, Math.max(0, value)) };
}

/** Bloco com renderizador próprio (ver `registerBlockRenderer`). */
export function custom(renderer: string, payload: unknown): OutputBlock {
  return { type: 'custom', renderer, payload };
}

/** Junta blocos ignorando `null`/`undefined` — útil em saídas condicionais. */
export function compose(...blocks: Array<OutputBlock | null | undefined | false>): OutputBlock[] {
  return blocks.filter(Boolean) as OutputBlock[];
}
