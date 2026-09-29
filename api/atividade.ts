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
    const linguagens = [...pesos]
      .sort((a, b) => b[1] - a[1])
      .slice(0, LINGUAGENS)
      .map(([nome, size]) => ({ nome, fracao: size / soma }));

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
