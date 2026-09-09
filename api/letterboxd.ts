import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Filme, Filmes } from '../src/data/types';
import { ambiente, falha, json, metodoInvalido } from './_resposta';

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
 * - **os favoritos não estão aqui.** Eles só existem no HTML do perfil, e
 *   raspar HTML seria trocar uma fragilidade conhecida por uma pior.
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
 * Entidades XML, as cinco que um título de filme realmente encontra.
 *
 * Uma tabela de tudo seria uma dependência disfarçada; um título com aspas,
 * apóstrofo ou `&` é o que de fato aparece ("Marley & Me", "Uncle Boonmee").
 */
const ENTIDADES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
};
const texto = (s: string) => s.replace(/&(?:amp|lt|gt|quot|#39|apos);/g, (e) => ENTIDADES[e] ?? e);

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (metodoInvalido(req, res)) return;

  const env = ambiente(['LETTERBOXD_USER']);
  if ('falta' in env) return falha(res, 500, `variavel:${env.falta}`);
  const usuario = env.vars.LETTERBOXD_USER;

  try {
    const resposta = await fetch(`https://letterboxd.com/${usuario}/rss/`, {
      // sem um agente de navegador o Letterboxd responde 403 ao feed
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; portfolio/1.0)' },
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

    const dados: Filmes = { recentes: recentes.slice(0, 12) };

    // 30min: ninguém assiste dois filmes na mesma meia hora, e o feed é estático
    json(res, dados, 1800);
  } catch {
    falha(res, 502, 'letterboxd:rede');
  }
}
