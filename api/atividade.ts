import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Atividade } from '../src/data/types.js';
import { ambiente, falha, json, metodoInvalido } from './_resposta.js';

/**
 * O último ano no GitHub, para a seção de mesmo nome na Trajetória.
 *
 * **De quem é a conta é o token que diz** (`viewer`), e não um parâmetro: com o
 * login na query, qualquer um usaria o token do site para consultar qualquer
 * perfil. É o mesmo `GITHUB_TOKEN` de `api/github`, e uma chamada só à GraphQL
 * traz o calendário, as contagens e as linguagens.
 *
 * **O que é privado só entra como número.** O calendário conta as contribuições
 * em repositório privado sem dizer onde, e as linguagens vêm só dos repositórios
 * públicos e que não são fork: a página é pública.
 *
 * As contas (sequência, dias ativos, pico, o peso de cada linguagem) moram aqui,
 * e não na seção, que só desenha.
 */

const CONSULTA = `query {
  viewer {
    createdAt
    repositories(ownerAffiliations: OWNER, privacy: PUBLIC, isFork: false, first: 100) {
      nodes { languages(first: 10, orderBy: { field: SIZE, direction: DESC }) { edges { size node { name } } } }
    }
    contributionsCollection {
      totalCommitContributions
      totalRepositoriesWithContributedCommits
      contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } }
    }
  }
}`;

interface Resposta {
  data?: {
    viewer: {
      createdAt: string;
      repositories: { nodes: { languages: { edges: { size: number; node: { name: string } }[] } | null }[] };
      contributionsCollection: {
        totalCommitContributions: number;
        totalRepositoriesWithContributedCommits: number;
        contributionCalendar: {
          totalContributions: number;
          weeks: { contributionDays: { date: string; contributionCount: number }[] }[];
        };
      };
    };
  };
}

/** quantas linguagens a seção mostra; o resto soma pouco e só enche a nuvem */
const LINGUAGENS = 8;

/**
 * **Os ícones das linguagens vêm do Devicon, pelo Iconify**, e são procurados a
 * cada resposta: uma linguagem que aparecer amanhã no GitHub ganha ícone sem
 * mexer no site, se o Devicon tiver. Escolhido numa vitrine (29/09/2026) contra o
 * File Icons e siglas sem biblioteca.
 *
 * A cascata: o Devicon simplificado em uma cor, depois o original (a nuvem pinta
 * tudo de branco, e dele sobra a silhueta), e sem nenhum a seção desenha a sigla.
 * Numa amostra de 30 linguagens, 29 tiveram ícone; faltou Assembly.
 */
const CASCATA = ['devicon-plain', 'devicon'];

/**
 * Os nomes que o GitHub (o Linguist) escreve diferente do Devicon. O resto se
 * acha pelo próprio nome, e é isso que deixa a busca valer para linguagens novas.
 */
const APELIDOS: Record<string, string[]> = {
  CSS: ['css3'],
  HTML: ['html5'],
  Shell: ['bash'],
  'Jupyter Notebook': ['jupyter'],
  SCSS: ['sass'],
  Makefile: ['cmake'],
  'C++': ['cplusplus'],
  'C#': ['csharp'],
  Vue: ['vuejs'],
  Nix: ['nixos'],
  TeX: ['tex', 'latex'],
  Dockerfile: ['docker'],
};

/** os nomes a tentar para uma linguagem, só com o que um nome de ícone aceita */
const termos = (nome: string): string[] => {
  const base = nome.toLowerCase();
  const t = [...(APELIDOS[nome] ?? []), base.replace(/\s+/g, '-'), base.replace(/\s+/g, ''), base.split(/\s+/)[0]];
  return [...new Set(t)].filter((x) => /^[a-z0-9-]+$/.test(x));
};

interface ConjuntoIconify {
  width?: number;
  height?: number;
  icons?: Record<string, { body: string; width?: number; height?: number; left?: number; top?: number }>;
  aliases?: Record<string, { parent: string }>;
}

/**
 * Um SVG por linguagem, ou `null`. Uma chamada por conjunto da cascata, com todos
 * os nomes de uma vez. Falhar aqui não derruba a resposta: a linguagem só vira
 * sigla.
 */
async function icones(nomes: string[]): Promise<Record<string, string | null>> {
  const achados: Record<string, string | null> = Object.fromEntries(nomes.map((n) => [n, null]));
  for (const conjunto of CASCATA) {
    const faltam = nomes.filter((n) => !achados[n]);
    if (!faltam.length) break;
    const pedidos = [...new Set(faltam.flatMap(termos))];
    try {
      const r = await fetch(`https://api.iconify.design/${conjunto}.json?icons=${pedidos.join(',')}`, {
        signal: AbortSignal.timeout(4000),
      });
      if (!r.ok) continue;
      const c = (await r.json()) as ConjuntoIconify;
      for (const nome of faltam) {
        for (const t of termos(nome)) {
          const i = c.icons?.[t] ?? (c.aliases?.[t] ? c.icons?.[c.aliases[t].parent] : undefined);
          if (!i) continue;
          const w = i.width ?? c.width ?? 16;
          const h = i.height ?? c.height ?? 16;
          achados[nome] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${i.left ?? 0} ${i.top ?? 0} ${w} ${h}">${i.body}</svg>`;
          break;
        }
      }
    } catch {
      /* sem ícone deste conjunto: o próximo, ou a sigla */
    }
  }
  return achados;
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (metodoInvalido(req, res)) return;
  const env = ambiente(['GITHUB_TOKEN']);
  if ('falta' in env) return falha(res, 500, `variavel:${env.falta}`);

  try {
    const r = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        authorization: `bearer ${env.vars.GITHUB_TOKEN}`,
        'content-type': 'application/json',
        // a API do GitHub recusa requisição sem user-agent
        'user-agent': 'portifolio',
      },
      body: JSON.stringify({ query: CONSULTA }),
    });
    if (!r.ok) return falha(res, 502, `github:${r.status}`);
    const v = ((await r.json()) as Resposta).data?.viewer;
    if (!v) return falha(res, 502, 'github:vazio');

    const c = v.contributionsCollection;
    const dias: [string, number][] = c.contributionCalendar.weeks.flatMap((w) =>
      w.contributionDays.map((d): [string, number] => [d.date, d.contributionCount]),
    );

    let maiorSequencia = 0;
    let seguidos = 0;
    let pico = { data: dias[0]?.[0] ?? '', contribuicoes: 0 };
    for (const [data, n] of dias) {
      seguidos = n > 0 ? seguidos + 1 : 0;
      maiorSequencia = Math.max(maiorSequencia, seguidos);
      if (n > pico.contribuicoes) pico = { data, contribuicoes: n };
    }

    const pesos = new Map<string, number>();
    for (const repo of v.repositories.nodes) {
      for (const e of repo.languages?.edges ?? []) pesos.set(e.node.name, (pesos.get(e.node.name) ?? 0) + e.size);
    }
    const soma = [...pesos.values()].reduce((a, b) => a + b, 0) || 1;
    const maiores = [...pesos].sort((a, b) => b[1] - a[1]).slice(0, LINGUAGENS);
    const svg = await icones(maiores.map(([nome]) => nome));
    const linguagens = maiores.map(([nome, size]) => ({ nome, fracao: size / soma, icone: svg[nome] ?? null }));

    const dados: Atividade = {
      dias,
      total: c.contributionCalendar.totalContributions,
      commits: c.totalCommitContributions,
      diasAtivos: dias.filter(([, n]) => n > 0).length,
      maiorSequencia,
      pico,
      repositorios: c.totalRepositoriesWithContributedCommits,
      desde: v.createdAt.slice(0, 4),
      linguagens,
    };
    // uma hora: o calendário é do dia, e ninguém precisa do commit de cinco minutos atrás
    json(res, dados, 3600);
  } catch {
    falha(res, 502, 'github:rede');
  }
}
