import type { IncomingMessage, ServerResponse } from 'node:http';
import { ambiente, falha, metodoInvalido } from './_resposta.js';

/**
 * A foto do site de um projeto, para a janela da seção Projetos.
 *
 * **Só fotografa o site que o próprio repositório declara.** A entrada é
 * `?repo=dono/nome`, nunca um endereço: a função pergunta ao GitHub qual é o
 * *Website* do repositório, e é esse que ela fotografa. Aceitar um endereço
 * solto faria desta função um serviço de captura aberto para qualquer um, com a
 * cota do plano grátis na conta de quem escreve a página. Repositório privado e
 * repositório sem site respondem 404, pela mesma regra de `api/github`.
 *
 * A captura é do [microlink](https://microlink.io), em 1280×800 e escala 1, em
 * JPEG: ~150 kB, contra 1,4 MB da PNG em escala 2 que ele devolve por padrão. O
 * plano grátis aceita 25 capturas por dia, e por isso a resposta fica **um dia
 * na borda** e mais uma semana servida velha enquanto se renova: um site
 * pessoal não muda de cara de hora em hora, e cem visitantes custam uma captura.
 *
 * A imagem passa por aqui, em vez de um redirecionamento para o endereço do
 * microlink: o endereço dele é de uma captura, e não se sabe por quanto tempo
 * ele vive; o nosso, com o cache da borda, vive o que a gente decidir.
 */

/** `dono/nome`, e só isso: é o que entra, literal, no caminho da API do GitHub. */
const NOME = /^[\w.-]+\/[\w.-]+$/;

/** Um dia na borda, e uma semana servida velha enquanto a captura se renova. */
const CACHE = 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800';

/** O site declarado no repositório, ou `null` se ele é privado, não existe ou não tem site. */
async function siteDo(repo: string, token: string): Promise<string | null> {
  const r = await fetch(`https://api.github.com/repos/${repo}`, {
    headers: {
      authorization: `bearer ${token}`,
      accept: 'application/vnd.github+json',
      // a API do GitHub recusa requisição sem user-agent
      'user-agent': 'portifolio',
    },
  });
  if (!r.ok) return null;
  const dados = (await r.json()) as { private?: boolean; homepage?: string | null };
  const site = dados.homepage?.trim();
  return !dados.private && site && /^https?:\/\//.test(site) ? site : null;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (metodoInvalido(req, res)) return;

  const repo = new URL(req.url ?? '', 'http://localhost').searchParams.get('repo') ?? '';
  if (!NOME.test(repo)) return falha(res, 400, 'repo');

  const env = ambiente(['GITHUB_TOKEN']);
  if ('falta' in env) return falha(res, 500, `variavel:${env.falta}`);

  try {
    const site = await siteDo(repo, env.vars.GITHUB_TOKEN);
    if (!site) return falha(res, 404, 'sem-site');

    const pedido = new URLSearchParams({
      url: site,
      screenshot: 'true',
      meta: 'false',
      'viewport.width': '1280',
      'viewport.height': '800',
      'viewport.deviceScaleFactor': '1',
      type: 'jpeg',
    });
    const captura = await fetch(`https://api.microlink.io/?${pedido}`);
    if (!captura.ok) return falha(res, 502, `captura:${captura.status}`);
    const corpo = (await captura.json()) as { data?: { screenshot?: { url?: string } } };
    const foto = corpo.data?.screenshot?.url;
    if (!foto) return falha(res, 502, 'captura:resposta');

    const imagem = await fetch(foto);
    if (!imagem.ok) return falha(res, 502, `captura:${imagem.status}`);

    res.writeHead(200, {
      'content-type': imagem.headers.get('content-type') ?? 'image/jpeg',
      'cache-control': CACHE,
    });
    res.end(Buffer.from(await imagem.arrayBuffer()));
  } catch {
    falha(res, 502, 'captura:rede');
  }
}
