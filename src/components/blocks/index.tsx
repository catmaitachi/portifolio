/**
 * Registry de renderizadores de blocos.
 *
 * É o ponto de extensão da camada visual do terminal:
 *
 *   registerBlockRenderer('grafico', MeuGrafico);
 *   // e no comando: return [out.custom('grafico', dados)]
 *
 * Nenhum comando precisa importar React, e nenhum componente precisa
 * conhecer comandos.
 */
import type { ComponentType } from 'react';
import type { CustomBlock, OutputBlock } from '@/terminal/types';
import {
  DividerBlockView,
  FetchBlockView,
  HeadingBlockView,
  KeyValueBlockView,
  LinksBlockView,
  ListBlockView,
  ProgressBlockView,
  TableBlockView,
  TagsBlockView,
  TextBlockView,
} from './renderers';

type Renderer = ComponentType<{ block: never }>;

/** Renderizadores dos tipos nativos. */
const nativeRenderers = {
  text: TextBlockView,
  heading: HeadingBlockView,
  fetch: FetchBlockView,
  list: ListBlockView,
  table: TableBlockView,
  keyValue: KeyValueBlockView,
  tags: TagsBlockView,
  links: LinksBlockView,
  divider: DividerBlockView,
  progress: ProgressBlockView,
} as unknown as Record<string, Renderer>;

/** Renderizadores adicionados em runtime, para blocos `custom`. */
const customRenderers = new Map<string, ComponentType<{ payload: never }>>();

export function registerBlockRenderer<P>(name: string, component: ComponentType<{ payload: P }>): void {
  customRenderers.set(name, component as ComponentType<{ payload: never }>);
}

export function BlockView({ block }: { block: OutputBlock }) {
  if (block.type === 'custom') {
    const { renderer, payload } = block as CustomBlock;
    const Custom = customRenderers.get(renderer);
    if (!Custom) {
      return <div className="block block-text block-text--warn">bloco sem renderizador: {renderer}</div>;
    }
    return <Custom payload={payload as never} />;
  }

  const Native = nativeRenderers[block.type];
  if (!Native) {
    return <div className="block block-text block-text--warn">bloco desconhecido: {block.type}</div>;
  }
  return <Native block={block as never} />;
}

export function BlockList({ blocks }: { blocks: OutputBlock[] }) {
  return (
    <>
      {blocks.map((block, index) => (
        <BlockView key={block.key ?? `${block.type}-${index}`} block={block} />
      ))}
    </>
  );
}

export { BlockActionsContext, useBlockActions } from './BlockContext';
export type { BlockActions } from './BlockContext';
