/**
 * Renderizadores nativos dos blocos de saída.
 *
 * Cada componente recebe apenas o seu tipo de bloco. Para mudar a
 * aparência de todas as saídas de um tipo, edite só o componente
 * correspondente — nenhum comando precisa saber.
 */
import { Fragment, useState } from 'react';
import type {
  DividerBlock,
  FetchBlock,
  HeadingBlock,
  KeyValueBlock,
  LinksBlock,
  ListBlock,
  ProgressBlock,
  TableBlock,
  TagsBlock,
  TextBlock,
} from '@/terminal/types';
import { useBlockActions } from './BlockContext';

export function TextBlockView({ block }: { block: TextBlock }) {
  const tone = block.tone && block.tone !== 'default' ? ` block-text--${block.tone}` : '';
  return <div className={`block block-text${tone}`}>{block.text}</div>;
}

export function HeadingBlockView({ block }: { block: HeadingBlock }) {
  return (
    <div className="block block-heading">
      <span className="block-heading__text">{block.text}</span>
      {block.hint ? <span className="block-heading__hint">{block.hint}</span> : null}
    </div>
  );
}

export function DividerBlockView(_: { block: DividerBlock }) {
  return <div className="block block-divider" role="separator" />;
}

/** Paleta padrão das amostras — segue o tema, como no terminal de verdade. */
const FETCH_PALETTE = [
  'var(--accent)',
  'var(--warning)',
  'var(--danger)',
  'var(--text)',
  'var(--text-soft)',
  'var(--text-muted)',
  'var(--text-dim)',
  'var(--surface-raised)',
];

export function FetchBlockView({ block }: { block: FetchBlock }) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const palette = block.palette?.length ? block.palette : FETCH_PALETTE;
  const showAvatar = Boolean(block.avatar) && !avatarFailed;

  return (
    <div className="block block-fetch">
      <div className="block-fetch__avatar" aria-hidden={showAvatar ? undefined : 'true'}>
        {showAvatar && block.avatar ? (
          <img
            src={block.avatar.src}
            alt={block.avatar.alt}
            loading="lazy"
            onError={() => setAvatarFailed(true)}
          />
        ) : (
          // Sem foto configurada (ou arquivo ausente): losango da marca.
          <span className="block-fetch__avatar-fallback" />
        )}
      </div>

      <div className="block-fetch__info">
        <div className="block-fetch__title">{block.title}</div>
        <div className="block-fetch__rule" aria-hidden="true">
          {'─'.repeat(block.title.length)}
        </div>

        <div className="block-fetch__rows">
          {block.rows.map((row) => (
            <Fragment key={row.label}>
              <span className="block-fetch__label">{row.label}</span>
              <span className="block-fetch__value">{row.value}</span>
            </Fragment>
          ))}
        </div>

        <div className="block-fetch__palette" aria-hidden="true">
          {[0, 1].map((row) => (
            <div className="block-fetch__palette-row" key={row}>
              {palette.map((color) => (
                <span
                  className="block-fetch__swatch"
                  key={`${row}-${color}`}
                  style={{ background: color, filter: row === 1 ? 'brightness(0.55)' : undefined }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ListBlockView({ block }: { block: ListBlock }) {
  const actions = useBlockActions();

  return (
    <div className="block block-list">
      {block.items.map((item, index) => {
        const interactive = Boolean(item.command || item.url);
        const activate = () => {
          if (item.command) actions.run(item.command);
          else if (item.url) actions.openUrl(item.url);
        };

        const content = (
          <>
            {item.index ? <span className="block-list__index">{item.index}</span> : null}
            <span className="block-list__body">
              <span className="block-list__title">{item.title}</span>
              {item.description ? (
                <>
                  {' '}
                  <span className="block-list__description">· {item.description}</span>
                </>
              ) : null}
              {item.tags?.length ? (
                <span className="block-list__tags">
                  {item.tags.map((tag) => (
                    <span className="block-list__tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </span>
              ) : null}
            </span>
            {item.meta ? <span className="block-list__meta">{item.meta}</span> : null}
          </>
        );

        const key = `${item.title}-${index}`;

        return interactive ? (
          <button
            key={key}
            type="button"
            className="block-list__item block-list__item--interactive"
            onClick={activate}
          >
            {content}
          </button>
        ) : (
          <div key={key} className="block-list__item">
            {content}
          </div>
        );
      })}
    </div>
  );
}

export function TableBlockView({ block }: { block: TableBlock }) {
  const alignOf = (index: number) => (block.align?.[index] === 'right' ? '--right' : '');

  return (
    <table className="block block-table">
      <thead>
        <tr>
          {block.columns.map((column, index) => (
            <th key={column} className={alignOf(index) ? 'block-table__th--right' : undefined}>
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {block.rows.map((row, rowIndex) => (
          <tr key={`row-${rowIndex}`}>
            {row.map((cell, cellIndex) => (
              <td key={`cell-${cellIndex}`} className={alignOf(cellIndex) ? 'block-table__td--right' : undefined}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function KeyValueBlockView({ block }: { block: KeyValueBlock }) {
  return (
    <div className="block block-kv">
      {block.items.map((item) => (
        <Fragment key={item.key}>
          <span className="block-kv__key">{item.key}</span>
          <span className="block-kv__value">
            {item.url ? (
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                {item.value}
              </a>
            ) : (
              item.value
            )}
          </span>
        </Fragment>
      ))}
    </div>
  );
}

export function TagsBlockView({ block }: { block: TagsBlock }) {
  return (
    <div className="block block-tags">
      {block.label ? <span className="block-tags__label">{block.label}</span> : null}
      <span className="block-tags__items">
        {block.items.map((item) => (
          <span className="block-tags__item" key={item}>
            {item}
          </span>
        ))}
      </span>
    </div>
  );
}

export function LinksBlockView({ block }: { block: LinksBlock }) {
  return (
    <div className="block block-links">
      {block.items.map((item) => (
        <a
          className="block-links__item"
          key={item.url}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          title={item.hint}
        >
          {item.label}
        </a>
      ))}
    </div>
  );
}

export function ProgressBlockView({ block }: { block: ProgressBlock }) {
  const percent = Math.round(block.value * 100);
  return (
    <div className="block block-progress">
      <div className="block-progress__label">
        <span>{block.label}</span>
        <span>{percent}%</span>
      </div>
      <div className="block-progress__track">
        <div className="block-progress__fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
