/**
 * Teste de renderização — monta a árvore React em string, sem browser.
 *
 *   npm run render-check
 *
 * Não substitui um olhar humano na tela, mas garante que os componentes,
 * os blocos de saída e o hook do terminal montam sem erro.
 */
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { BlockList } from '../src/components/blocks';
import { WelcomeScreen } from '../src/components/WelcomeScreen';
import { ProjectWindow } from '../src/components/terminal/ProjectWindow';
import { TerminalScreen } from '../src/components/terminal/TerminalScreen';
import { createStaticSource } from '../src/data/sources/staticSource';
import { SettingsFab } from '../src/components/SettingsFab';
import { SettingsProvider } from '../src/settings';
import * as out from '../src/terminal/output';
import type { OutputBlock, TerminalSession } from '../src/terminal/types';

let failures = 0;

/** Tudo renderiza dentro do provedor: os componentes consomem `t` dele. */
function inProvider(node: ReturnType<typeof createElement>) {
  return renderToString(createElement(SettingsProvider, null, node));
}

function check(label: string, fn: () => string, mustContain: string[]): void {
  try {
    const html = fn();
    const missing = mustContain.filter((needle) => !html.includes(needle));
    if (missing.length > 0) {
      failures += 1;
      console.log(`  ✗ ${label} — faltou: ${missing.join(', ')}`);
      return;
    }
    console.log(`  ✓ ${label} (${html.length} bytes)`);
  } catch (error) {
    failures += 1;
    console.log(`  ✗ ${label} — ${(error as Error).message}`);
  }
}

async function main(): Promise<void> {
  const content = await createStaticSource().load();
  const session: TerminalSession = {
    nickname: 'render',
    origin: 'typed',
    prompt: 'render',
    startedAt: Date.now(),
  };

  console.log('\ntelas');
  check(
    'WelcomeScreen',
    () => inProvider(createElement(WelcomeScreen, { onEnter: () => {} })),
    // Texto vem do dicionário (coberto pelo smoke); aqui olhamos a estrutura.
    ['welcome__title', 'welcome__submit', 'welcome__why', 'welcome__input'],
  );

  check(
    'TerminalScreen',
    () => inProvider(createElement(TerminalScreen, { content, session, onExit: () => {} })),
    ['titlebar', 'output', 'suggestions__chip', '~/portfolio'],
  );

  check(
    'ProjectWindow',
    () =>
      inProvider(
        createElement(ProjectWindow, {
          project: content.projects[0],
          fullscreen: false,
          next: content.projects[1],
          onClose: () => {},
          onToggleFullscreen: () => {},
          onNavigate: () => {},
        }),
      ),
    [
      'project-window__title',
      'project-window__facts',
      'project-window__bullets',
      'project-window__link',
      content.projects[0].name,
      content.projects[1].name,
    ],
  );

  check('SettingsFab', () => inProvider(createElement(SettingsFab)), ['fab__button', 'aria-expanded']);

  console.log('\nblocos de saída');
  const blocks: OutputBlock[] = [
    out.heading('Título', 'dica'),
    out.fetchCard({
      title: 'alguem@portfolio',
      avatar: { src: '/avatar.svg', alt: 'Foto' },
      rows: [
        { label: 'OS', value: 'Designer' },
        { label: 'Uptime', value: '2m 04s' },
      ],
    }),
    out.text('texto simples'),
    out.muted('texto apagado'),
    out.divider(),
    out.list([{ index: '01', title: 'Item', description: 'desc', meta: '2025', tags: ['a'], command: 'ajuda' }]),
    out.table(['a', 'b'], [['1', '2']]),
    out.keyValue([{ key: 'email', value: 'ola@teste.dev', url: 'mailto:ola@teste.dev' }]),
    out.tags(['React', 'TypeScript'], 'stack'),
    out.links([{ label: 'site', url: 'https://exemplo.dev' }]),
    out.progress('carga', 0.42),
    out.custom('inexistente', null),
  ];

  check('BlockList (todos os tipos)', () => renderToString(createElement(BlockList, { blocks })), [
    'block-heading',
    'block-fetch__title',
    'block-fetch__swatch',
    'block-text',
    'block-divider',
    'block-list__item',
    'block-table',
    'block-kv',
    'block-tags',
    'block-links',
    'block-progress',
    'bloco sem renderizador',
  ]);

  console.log(failures === 0 ? '\nOK — tudo renderizou.\n' : `\nFALHOU — ${failures} verificação(ões).\n`);
  process.exit(failures === 0 ? 0 : 1);
}

void main();
