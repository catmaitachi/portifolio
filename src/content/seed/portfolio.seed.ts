/**
 * Conteúdo padrão do portfólio.
 *
 * É o "banco de dados" da versão estática: um arquivo tipado, versionado
 * junto ao código. Quando o conteúdo migrar para um database real, o
 * formato permanece o mesmo — só a fonte (`src/data/sources`) muda.
 */
import type { ContactLink, ExperienceEntry, Project, SkillGroup } from '@/data/types';

export const projectsSeed: Project[] = [
  {
    id: 'aurora',
    client: 'Produto interno · 3 marcas',
    period: 'jan 2025 — jun 2025',
    status: 'no ar',
    stack: ['React', 'TypeScript', 'Style Dictionary', 'Storybook'],
    highlights: [
      'Tokens versionados e publicados como pacote npm, consumidos por 3 marcas.',
      'Tempo de entrega de novas telas caiu ~40% depois da padronização.',
      'Documentação viva: cada componente traz estados, limites de uso e código pronto.',
    ],
    links: [
      { label: 'estudo de caso', url: 'https://exemplo.dev/aurora' },
      { label: 'storybook', url: 'https://exemplo.dev/aurora/storybook' },
    ],
    index: '01',
    name: 'Aurora',
    summary: 'Design system + web app',
    year: '2025',
    tags: ['Design System', 'React', 'Tokens'],
    role: 'Design & front-end',
    featured: true,
    caseStudy: [
      'Sistema de design multi-marca com tokens versionados e distribuição via pacote npm.',
      'Reduziu em ~40% o tempo de entrega de novas telas ao padronizar componentes e estados.',
    ],
  },
  {
    id: 'meridian',
    client: 'Operação de telemetria',
    period: 'mar 2024 — nov 2024',
    status: 'no ar',
    stack: ['TypeScript', 'WebSocket', 'D3', 'Node'],
    highlights: [
      'Atualização contínua sobre WebSocket sem travar a interface, com listas virtualizadas.',
      'Densidade alta de informação resolvida por hierarquia tipográfica, não por cor.',
      'Painel projetado para telas grandes de sala de operação, lidas a metros de distância.',
    ],
    links: [{ label: 'estudo de caso', url: 'https://exemplo.dev/meridian' }],
    index: '02',
    name: 'Meridian',
    summary: 'Dashboard de dados em tempo real',
    year: '2024',
    tags: ['Data Viz', 'WebSocket', 'TypeScript'],
    role: 'Front-end lead',
    caseStudy: [
      'Painel de telemetria com atualização contínua sobre WebSocket e virtualização de listas.',
      'Foco em legibilidade sob alta densidade de informação e performance em telas grandes.',
    ],
  },
  {
    id: 'fold',
    client: 'Produto próprio',
    period: 'fev 2024 — set 2024',
    status: 'encerrado',
    stack: ['React Native', 'Reanimated', 'SQLite'],
    highlights: [
      'Categorização automática de gastos com metas por envelope.',
      'Microinterações dão retorno imediato sem competir com o conteúdo da tela.',
      'Modo offline primeiro: tudo funciona sem rede e sincroniza depois.',
    ],
    links: [{ label: 'estudo de caso', url: 'https://exemplo.dev/fold' }],
    index: '03',
    name: 'Fold',
    summary: 'App mobile de finanças',
    year: '2024',
    tags: ['Mobile', 'Motion', 'UX'],
    role: 'Produto & interface',
    caseStudy: [
      'Aplicativo de finanças pessoais com categorização automática e metas por envelope.',
      'Microinterações usadas para dar feedback imediato sem competir com o conteúdo.',
    ],
  },
  {
    id: 'kite',
    client: 'Estúdio de arquitetura',
    period: 'ago 2023 — dez 2023',
    status: 'no ar',
    stack: ['Figma', 'Astro', 'GSAP'],
    highlights: [
      'Identidade visual completa: marca, tipografia, grade e sistema de imagens.',
      'Manual de marca entregue como site vivo, não como PDF que ninguém abre.',
      'Animações ancoradas no scroll, desligadas sob `prefers-reduced-motion`.',
    ],
    links: [{ label: 'site', url: 'https://exemplo.dev/kite' }],
    index: '04',
    name: 'Kite',
    summary: 'Identidade & site de marca',
    year: '2023',
    tags: ['Branding', 'Web', 'Motion'],
    role: 'Direção visual',
    caseStudy: [
      'Identidade visual completa e site institucional com animações baseadas em scroll.',
      'Manual de marca entregue como site vivo, não como PDF estático.',
    ],
  },
];

export const skillsSeed: SkillGroup[] = [
  {
    id: 'design',
    label: 'Design',
    items: ['Figma', 'Design Systems', 'Prototipagem', 'Motion'],
  },
  {
    id: 'code',
    label: 'Código',
    items: ['React', 'TypeScript', 'CSS', 'Node'],
  },
  {
    id: 'focus',
    label: 'Foco',
    items: ['Acessibilidade', 'Performance', 'Microinterações'],
  },
];

export const contactsSeed: ContactLink[] = [
  { id: 'email', label: 'email', value: 'ola@portfolio.dev', url: 'mailto:ola@portfolio.dev' },
  { id: 'github', label: 'github', value: 'github.com/usuario', url: 'https://github.com/usuario' },
  { id: 'linkedin', label: 'linkedin', value: 'in/usuario', url: 'https://linkedin.com/in/usuario' },
];

export const experienceSeed: ExperienceEntry[] = [
  {
    id: 'freelance',
    period: '2023 — agora',
    company: 'Independente',
    role: 'Product designer & front-end',
    description: 'Projetos de interface, design systems e sites de marca para times pequenos.',
  },
  {
    id: 'studio',
    period: '2021 — 2023',
    company: 'Estúdio digital',
    role: 'Designer de produto',
    description: 'Discovery, protótipos e handoff em produtos B2B.',
  },
];

export const highlightsSeed: string[] = [
  'Interfaces nascem de restrições — clareza antes de ornamento.',
  'Movimento é informação: cada transição precisa explicar algo.',
  'Sistema bem feito é aquele que outra pessoa consegue estender sozinha.',
];
