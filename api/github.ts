import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Projetos, Repositorio } from '../src/data/types.js';
import { ambiente, falha, json, metodoInvalido } from './_resposta.js';

/**
 * Os repositórios escolhidos a dedo para a seção Projetos, com o que o GitHub
 * sabe de cada um.
 *
 * A escolha mora em `shared.json → projetos` e chega na query `repos`. A
 * resposta sai de **uma chamada só** à API GraphQL, com um alias por
 * repositório. Pela REST seriam três ou quatro chamadas por repositório (o
 * repositório, as linguagens, a contagem de commits, as datas), e sem chave o
 * limite dela é de 60 por hora por IP, dividido com tudo o que roda na mesma
 * máquina da Vercel. A GraphQL exige chave, e é por isso que o `GITHUB_TOKEN` é
 * obrigatório: um token *fine-grained* só com leitura de repositórios públicos
 * basta.
 *
 * **Repositório privado nunca sai daqui**, mesmo que o token o enxergue: a
 * página é pública, e um repositório escolhido por engano não pode vazar nome,
 * descrição e números. Os que deixaram de existir (renomeados ou apagados)
 * voltam `null` da API e somem da resposta sem derrubar os outros.
 */

/** Quantos repositórios uma resposta aceita. A órbita não tem teto, a consulta tem. */
const TETO = 12;

/** `dono/nome`, e só isso: é o que entra, literal, no texto da consulta. */
const NOME = /^[\w.-]+\/[\w.-]+$/;

/**
 * Quantos commits entram no código de barras de cada cartão: os mais recentes
 * da janela. Cem é o que uma página de `history` devolve, e para um projeto
 * pessoal é mais de um ano de trabalho; num mês de cem commits o traço vira
 * faixa cheia de qualquer jeito.
 */
const TRACOS = 100;

/** A janela do código de barras: os últimos 365 dias. */
const JANELA_MS = 365 * 24 * 60 * 60 * 1000;

/** A query `repos` validada: sem repetição, na ordem da escolha, até o teto. */
function selecao(req: IncomingMessage): string[] {
  const bruto = new URL(req.url ?? '', 'http://localhost').searchParams.get('repos') ?? '';
  const nomes = bruto
    .split(',')
    .map((s) => s.trim())
    .filter((s) => NOME.test(s));
  return [...new Set(nomes)].slice(0, TETO);
}

/**
 * A consulta inteira, um alias por repositório.
 *
 * Os nomes entram literais, e é a validação de `NOME` que torna isso seguro:
 * letra, dígito, ponto, hífen e sublinhado não fecham aspas nem abrem nada.
 */
function consulta(repos: string[], desde: string): string {
  const alvos = repos
    .map((r, i) => {
      const [dono, nome] = r.split('/');
      return `r${i}: repository(owner: "${dono}", name: "${nome}") { ...Repo }`;
    })
    .join(' ');
  return `query { ${alvos} }
fragment Repo on Repository {
  nameWithOwner name description url homepageUrl stargazerCount forkCount
  isArchived isPrivate pushedAt createdAt
  languages(first: 8, orderBy: { field: SIZE, direction: DESC }) {
    totalSize edges { size node { name } }
  }
  repositoryTopics(first: 6) { nodes { topic { name } } }
  defaultBranchRef { target { ... on Commit {
    total: history { totalCount }
    recentes: history(first: ${TRACOS}, since: "${desde}") { nodes { committedDate } }
  } } }
}`;
}

interface RepoGraphQL {
  nameWithOwner: string;
  name: string;
  description: string | null;
  url: string;
  homepageUrl: string | null;
  stargazerCount: number;
  forkCount: number;
  isArchived: boolean;
  isPrivate: boolean;
  pushedAt: string | null;
  createdAt: string;
  languages: { totalSize: number; edges: { size: number; node: { name: string } }[] } | null;
  repositoryTopics: { nodes: { topic: { name: string } }[] } | null;
  /** repositório vazio não tem ramo padrão, e aí não há commit nenhum para contar */
  defaultBranchRef: {
    target: {
      total?: { totalCount: number };
      recentes?: { nodes: { committedDate: string }[] };
    } | null;
  } | null;
}

const normalizar = (r: RepoGraphQL): Repositorio => {
  const alvo = r.defaultBranchRef?.target;
  const total = r.languages?.totalSize ?? 0;
  return {
    id: r.nameWithOwner,
    nome: r.name,
    descricao: r.description?.trim() || null,
    url: r.url,
    // o GitHub devolve `""` para quem apagou o campo, e `null` para quem nunca o preencheu
    site: r.homepageUrl?.trim() || null,
    estrelas: r.stargazerCount,
    forks: r.forkCount,
    commits: alvo?.total?.totalCount ?? 0,
    datasRecentes: (alvo?.recentes?.nodes ?? []).map((n) => n.committedDate),
    linguagens: total
      ? (r.languages?.edges ?? []).map((e) => ({ nome: e.node.name, fracao: e.size / total }))
      : [],
    topicos: (r.repositoryTopics?.nodes ?? []).map((n) => n.topic.name),
    criadoEm: r.createdAt,
    atualizadoEm: r.pushedAt ?? r.createdAt,
    arquivado: r.isArchived,
  };
};

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (metodoInvalido(req, res)) return;

  const ate = new Date();
  const janela = { de: new Date(ate.getTime() - JANELA_MS).toISOString(), ate: ate.toISOString() };

  const repos = selecao(req);
  // nada escolhido é estado normal da seção, que nem chega a chamar esta função nesse caso
  if (!repos.length) return json(res, { janela, repositorios: [] } satisfies Projetos, 3600);

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
      body: JSON.stringify({ query: consulta(repos, janela.de) }),
    });
    if (!r.ok) return falha(res, 502, `github:${r.status}`);

    const corpo = (await r.json()) as {
      data?: Record<string, RepoGraphQL | null> | null;
      errors?: { type?: string }[];
    };
    if (!corpo.data) return falha(res, 502, `github:${corpo.errors?.[0]?.type ?? 'resposta'}`);

    // a ordem é a da escolha (`r0`, `r1`…), e não a em que a API respondeu
    const repositorios = repos
      .map((_, i) => corpo.data?.[`r${i}`])
      .filter((x): x is RepoGraphQL => Boolean(x) && !x?.isPrivate)
      .map(normalizar);

    // uma hora: número de repositório muda em dias, e cada visita não precisa custar uma consulta
    json(res, { janela, repositorios } satisfies Projetos, 3600);
  } catch {
    falha(res, 502, 'github:rede');
  }
}
