import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Filme, Filmes } from '../src/data/types.js';
import { ambiente, falha, json, metodoInvalido } from './_resposta.js';

/**
 * Os últimos filmes assistidos, com a nota que eu dei.
 *
 * **O Letterboxd não tem API pública.** A deles está em beta fechado há anos, e
 * o que existe é o RSS do perfil. Isso é um fato sobre o provedor, não uma
 * escolha: é isto ou nada.
 *
 * Duas consequências que precisam ficar registradas:
 *
 * - **é um feed, não um contrato.** A forma pode mudar sem aviso e sem versão, e
 *   o dia em que mudar esta função para de achar os campos e a seção fica vazia.
 *   É o ponto mais frágil do projeto inteiro, e é frágil por fora;
 * - **a lista de favoritos vem de outro lugar, e é mais frágil ainda.** Lista
 *   nenhuma do Letterboxd tem RSS — o feed é só o diário —, então ela sai do
 *   HTML da página da lista, e o pôster de cada filme sai do JSON-LD da página
 *   dele. São dois formatos que ninguém prometeu manter. Por isso ela **falha
 *   sozinha**: sem lista configurada, ou com a raspagem sem achar nada, o resto
 *   da seção continua de pé.
 *
 * O XML é recortado com expressão regular em vez de um parser, e a justificativa
 * é a mesma de sempre neste projeto: o recorte é pequeno e conhecido, e um
 * parser seria a primeira dependência de um lado do código que hoje não tem
 * nenhuma. O Node também não tem `DOMParser`.
 */

/** `<tag>valor</tag>`, com ou sem CDATA. */
function campo(bloco: string, tag: string): string {
  const m = new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`).exec(bloco);
  return m ? m[1].trim() : '';
}

/**
 * Entidades XML: as cinco nomeadas, mais qualquer numérica.
 *
 * Uma tabela com as centenas de entidades nomeadas do HTML seria uma dependência
 * disfarçada, e o XML define só estas cinco. As **numéricas** não são luxo: o
 * Letterboxd escreve apóstrofo como `&#039;`, com zero à esquerda, e uma lista
 * de casos literais deixava "Kiki's Delivery Service" na tela como
 * `Kiki&#039;s`. Uma faixa de dígitos cobre a família inteira em vez de mais um
 * caso por vez.
 */
const NOMEADAS: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};
const texto = (s: string) =>
  s.replace(/&(?:([a-z]+)|#(\d+)|#x([0-9a-f]+));/gi, (bruto, nome, dec, hex) => {
    if (nome) return NOMEADAS[String(nome).toLowerCase()] ?? bruto;
    return String.fromCodePoint(parseInt(dec ?? hex, dec ? 10 : 16));
  });

/** Um agente de navegador; sem ele o Letterboxd responde 403. */
const AGENTE = 'Mozilla/5.0 (compatible; portfolio/1.0)';

/** Além disso a lista deixa de ser uma escolha e vira um catálogo. */
const MAX_FAVORITOS = 12;

/**
 * O caminho da lista, aceitando o endereço inteiro ou só o miolo.
 *
 * A variável é preenchida por quem copiou o link da barra do navegador, então
 * `https://letterboxd.com/fulano/list/favoritos/` e `fulano/list/favoritos`
 * precisam dar no mesmo lugar.
 */
function caminhoDaLista(bruto: string): string {
  const sem = bruto.trim().replace(/^https?:\/\/(?:www\.)?letterboxd\.com/i, '');
  return `/${sem.replace(/^\/+|\/+$/g, '')}/`;
}

/** `Nome do Filme (2008)` → as duas partes. */
function nomeEAno(bruto: string): { titulo: string; ano: string } {
  const m = /^(.*?)\s+\((\d{4})\)\s*$/.exec(bruto);
  return m ? { titulo: m[1], ano: m[2] } : { titulo: bruto, ano: '' };
}

/**
 * O pôster de um filme, do JSON-LD da página dele.
 *
 * A página da lista não traz pôster nenhum: as imagens entram por JavaScript
 * depois, e o que está no HTML é um espaço reservado. O `og:image` da página do
 * filme também não serve — é um recorte largo, e um pôster fora da proporção
 * 2:3 estraga a grade inteira. O que serve é o `image` do JSON-LD, que é a arte
 * vertical.
 *
 * Falhar aqui devolve `null`, e a moldura vazia de 1px cobre o caso, como já
 * cobre a capa que a Steam não tem.
 */
async function poster(slug: string, sinal: AbortSignal): Promise<string | null> {
  try {
    const r = await fetch(`https://letterboxd.com/film/${slug}/`, {
      headers: { 'user-agent': AGENTE },
      signal: sinal,
    });
    if (!r.ok) return null;
    return /"image":"([^"]+)"/.exec(await r.text())?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * A lista escolhida a dedo, raspada da página dela.
 *
 * **Ela nunca derruba a resposta.** Sem variável, com a página fora do ar ou com
 * o HTML mudado de forma, o retorno é uma lista vazia e a seção mostra só os
 * recentes. Uma lista de favoritos é o enfeite da seção, e o diário é o
 * conteúdo dela.
 */
async function favoritos(lista: string | undefined): Promise<Filme[]> {
  if (!lista) return [];

  // um teto para o conjunto: uma lista lenta não pode segurar os recentes
  const sinal = AbortSignal.timeout(8000);

  try {
    const r = await fetch(`https://letterboxd.com${caminhoDaLista(lista)}`, {
      headers: { 'user-agent': AGENTE },
      signal: sinal,
    });
    if (!r.ok) return [];

    const html = await r.text();
    const cruas: { slug: string; titulo: string; ano: string; nota: number | null }[] = [];

    // cada item da lista é um <li> com a nota de quem a montou e um bloco com o filme
    for (const bloco of html.split('<li ').slice(1)) {
      const slug = /data-item-slug="([^"]+)"/.exec(bloco)?.[1];
      const nome = /data-item-name="([^"]+)"/.exec(bloco)?.[1];
      if (!slug || !nome) continue;

      const bruta = Number(/data-owner-rating="(\d+)"/.exec(bloco)?.[1] ?? 0);
      cruas.push({
        slug,
        ...nomeEAno(texto(nome)),
        // o atributo vai de 1 a 10; a régua da tela é de 0 a 5, com meias
        nota: bruta > 0 ? bruta / 2 : null,
      });
      if (cruas.length === MAX_FAVORITOS) break;
    }

    const artes = await Promise.all(cruas.map((f) => poster(f.slug, sinal)));

    return cruas.map((f, i) => ({
      id: `lista:${f.slug}`,
      titulo: f.titulo,
      ano: f.ano,
      nota: f.nota,
      poster: artes[i],
      url: `https://letterboxd.com/film/${f.slug}/`,
    }));
  } catch {
    return [];
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (metodoInvalido(req, res)) return;

  const env = ambiente(['LETTERBOXD_USER']);
  if ('falta' in env) return falha(res, 500, `variavel:${env.falta}`);
  const usuario = env.vars.LETTERBOXD_USER;
  /**
   * A lista é **opcional**, ao contrário do usuário.
   *
   * Quem não configurou nenhuma não tem um erro de instalação: tem uma seção com
   * um bloco a menos. Por isso ela não passa por `ambiente`, que responde 500 com
   * o nome do que faltou.
   */
  const lista = process.env.LETTERBOXD_LIST;

  try {
    // a lista sai na frente porque não depende do feed, e as duas correm juntas
    const buscaFavoritos = favoritos(lista);

    const resposta = await fetch(`https://letterboxd.com/${usuario}/rss/`, {
      // sem um agente de navegador o Letterboxd responde 403 ao feed
      headers: { 'user-agent': AGENTE },
    });
    if (!resposta.ok) return falha(res, 502, `letterboxd:${resposta.status}`);

    const xml = await resposta.text();
    const recentes: Filme[] = [];

    for (const bloco of xml.split('<item>').slice(1)) {
      const titulo = campo(bloco, 'letterboxd:filmTitle');
      // o feed também traz listas e textos publicados; sem título de filme, não é filme
      if (!titulo) continue;

      const nota = campo(bloco, 'letterboxd:memberRating');
      const descricao = campo(bloco, 'description');
      const poster = /<img src="([^"]+)"/.exec(descricao)?.[1] ?? null;

      recentes.push({
        id: campo(bloco, 'guid') || campo(bloco, 'link'),
        titulo: texto(titulo),
        ano: campo(bloco, 'letterboxd:filmYear'),
        // sem nota é diferente de nota zero: quem marcou como visto sem avaliar
        nota: nota ? Number(nota) : null,
        poster,
        url: campo(bloco, 'link'),
        assistidoEm: campo(bloco, 'letterboxd:watchedDate'),
        revisita: campo(bloco, 'letterboxd:rewatch') === 'Yes',
      });
    }

    const dados: Filmes = {
      recentes: recentes.slice(0, 20),
      favoritos: await buscaFavoritos,
    };

    // 30min: ninguém assiste dois filmes na mesma meia hora, e o feed é estático
    json(res, dados, 1800);
  } catch {
    falha(res, 502, 'letterboxd:rede');
  }
}
