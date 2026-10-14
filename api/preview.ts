import { readFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { join } from 'node:path';
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
 * **E só os destaques da seção.** A foto existe para a sessão pausada (ver
 * `Sessao`), e só destaque tem sessão: a lista é `shared.json → projetos →
 * destaques`, e qualquer outro repositório responde 404 sem gastar captura. Sem
 * isto, variar o `repo` na query esvaziava a cota do dia.
 *
 * A captura é do [microlink](https://microlink.io), em 1280×800 e escala 1, em
 * JPEG: ~150 kB, contra 1,4 MB da PNG em escala 2 que ele devolve por padrão. O
 * plano grátis aceita 25 capturas por dia, e por isso a resposta fica **um dia
 * na borda** e mais uma semana servida velha enquanto se renova: um site
 * pessoal não muda de cara de hora em hora, e cem visitantes custam uma captura.
 * O microlink guarda a captura por mais 24 h do lado dele, e isso é de
 * propósito: um redeploy limpa o cache da Vercel e a foto volta de lá sem gastar
 * outra. O preço é a foto levar até um dia para acompanhar um site que mudou.
 *
 * A imagem passa por aqui, em vez de um redirecionamento para o endereço do
 * microlink: o endereço dele é de uma captura, e não se sabe por quanto tempo
 * ele vive; o nosso, com o cache da borda, vive o que a gente decidir.
 */

/** `dono/nome`, e só isso: é o que entra, literal, no caminho da API do GitHub. */
const NOME = /^[\w.-]+\/[\w.-]+$/;

/**
 * Os destaques da seção Projetos, em minúsculas, ou `null` se a lista não pôde
 * ser lida. O arquivo viaja com a função pelo `includeFiles` do `vercel.json`.
 * Ilegível, a função não trava repositório nenhum: perder a trava é melhor que
 * perder as fotos.
 */
function destaques(): Set<string> | null {
  try {
    const caminho = join(process.cwd(), 'src/content/shared.json');
    const shared = JSON.parse(readFileSync(caminho, 'utf8')) as { projetos?: { destaques?: string[] } };
    const lista = shared.projetos?.destaques;
    return Array.isArray(lista) ? new Set(lista.map((r) => r.toLowerCase())) : null;
  } catch {
    return null;
  }
}

/**
 * Menor que isto não é foto de site: a captura de uma página que ainda não
 * montou sai preta, com ~3 kB e status 200, e ficaria um dia na borda.
 */
const FOTO_MINIMA = 10_000;

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
  if (destaques()?.has(repo.toLowerCase()) === false) return falha(res, 404, 'sem-destaque');

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
      // site que monta a tela com JavaScript (React, Vite) chega vazio no
      // `load`, e sem esperar a foto sai em branco: preta, 3 kB. Espera a rede
      // aquietar e mais um pouco, para a animação de entrada terminar.
      waitUntil: 'networkidle2',
      waitForTimeout: '3000',
    });
    const captura = await fetch(`https://api.microlink.io/?${pedido}`);
    if (!captura.ok) return falha(res, 502, `captura:${captura.status}`);
    const corpo = (await captura.json()) as { data?: { screenshot?: { url?: string } } };
    const foto = corpo.data?.screenshot?.url;
    if (!foto) return falha(res, 502, 'captura:resposta');

    const imagem = await fetch(foto);
    if (!imagem.ok) return falha(res, 502, `captura:${imagem.status}`);

    const bytes = Buffer.from(await imagem.arrayBuffer());
    if (bytes.length < FOTO_MINIMA) return falha(res, 502, 'captura:vazia');

    res.writeHead(200, {
      'content-type': imagem.headers.get('content-type') ?? 'image/jpeg',
      'cache-control': CACHE,
    });
    res.end(bytes);
  } catch {
    falha(res, 502, 'captura:rede');
  }
}
