import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Jogo, Jogos } from '../src/data/types.js';
import { ambiente, falha, json, metodoInvalido } from './_resposta.js';

/**
 * O que estou jogando, e o que joguei nas últimas duas semanas.
 *
 * Duas chamadas à Steam Web API. A primeira é o resumo do perfil, e é dela que
 * sai o "jogando agora": o campo `gameextrainfo` **só existe enquanto uma
 * partida está aberta**, e sumir é o jeito de a Steam dizer que ela acabou.
 *
 * **O perfil precisa estar público.** Com ele privado a API responde 200 com o
 * jogador sem esses campos e a lista de recentes vazia, o que é indistinguível
 * de "não joguei nada" — daí o estado explícito quando as duas coisas faltam ao
 * mesmo tempo.
 *
 * A arte vem do CDN da própria Steam, e o caminho dela é **perguntado**, numa
 * terceira chamada: o caminho por convenção que existia aqui deixou de valer
 * para os jogos do esquema novo (ver `capas`). Quando a pergunta falha sobra a
 * convenção, e quando a convenção também erra sobra a moldura vazia, que a
 * seção já desenha como faz com banner de projeto ausente.
 */

interface JogoSteam {
  appid: number;
  name?: string;
  playtime_2weeks?: number;
  playtime_forever?: number;
}

/**
 * A arte **por convenção**, que é o que a Steam serviu por anos e deixou de
 * servir para tudo.
 *
 * Ela continua valendo para os jogos antigos, e é o degrau de baixo quando a
 * consulta que resolve a arte de verdade não responde: uma URL que talvez
 * exista é melhor resposta que nenhuma, porque quem decide o que fazer com ela
 * é o `onError` da seção.
 */
/**
 * As duas artes do mesmo jogo: a deitada do destaque e a em pé da estante.
 *
 * Uma não é a outra recortada — a Steam desenha as duas separadamente, e é por
 * isso que a em pé não tem convenção de reserva: sem ela o livro fica com a
 * moldura vazia, que é melhor que uma arte deitada espremida num retângulo alto.
 */
interface Arte {
  deitada: string | null;
  emPe: string | null;
}

const capaPorConvencao = (appid: number) =>
  `https://shared.steamstatic.com/store_item_assets/steam/apps/${appid}/header.jpg`;

const lojaDe = (appid: number) => `https://store.steampowered.com/app/${appid}/`;

/** O host que serve `store_item_assets` sem redirecionar. */
const ASSETS = 'https://shared.steamstatic.com/store_item_assets/';

/** A resolução da arte não pode segurar a resposta: o conteúdo daqui são os jogos. */
const ESPERA_ASSETS = 4000;

interface ItemLoja {
  id?: number;
  assets?: {
    /** o caminho até a pasta do app, com `${FILENAME}` no lugar do arquivo */
    asset_url_format?: string;
    /** o nome do arquivo, que hoje vem prefixado por um hash de conteúdo */
    header?: string;
    /** a arte em pé da biblioteca, 600x900 */
    library_capsule?: string;
  };
}

/**
 * Onde está a arte de cada jogo, perguntado em vez de adivinhado.
 *
 * A URL de capa era montada a partir do `appid` num caminho fixo
 * (`steam/apps/<appid>/header.jpg`), e isso **deixou de valer**: a Steam passou
 * a guardar a arte da loja num caminho com hash de conteúdo
 * (`steam/apps/<appid>/<hash>/header.jpg`), e os jogos publicados ou
 * reprocessados sob o esquema novo simplesmente não têm nada no caminho antigo.
 * Não é um jogo com defeito, é a convenção que envelheceu — e uma convenção que
 * envelhece em silêncio some da tela sem erro nenhum.
 *
 * `IStoreBrowseService/GetItems` devolve exatamente esse caminho, para **muitos
 * appids numa requisição só**, sem chave e sem paginação. É a diferença que
 * importa contra o `appdetails` da loja, que aceita um id por chamada (com
 * vários ele responde `null`) e traz a página inteira do jogo para entregar uma
 * URL.
 *
 * O formato serve os dois esquemas de graça: num jogo antigo o `header` vem sem
 * hash, e a mesma substituição produz o caminho de sempre.
 *
 * **Ela nunca derruba a resposta.** Falha, demora ou forma mudada devolvem um
 * mapa vazio, e cada jogo cai na convenção — que ainda acerta a maior parte
 * deles. É o mesmo arranjo da lista do Letterboxd, e pela mesma razão: o que a
 * seção existe para mostrar são os jogos.
 */
async function capas(appids: number[]): Promise<Map<number, Arte>> {
  const mapa = new Map<number, Arte>();
  if (!appids.length) return mapa;

  const entrada = {
    ids: appids.map((appid) => ({ appid })),
    context: { language: 'english', country_code: 'US' },
    data_request: { include_assets: true },
  };

  try {
    const r = await fetch(
      `https://api.steampowered.com/IStoreBrowseService/GetItems/v1/?input_json=${encodeURIComponent(
        JSON.stringify(entrada),
      )}`,
      { signal: AbortSignal.timeout(ESPERA_ASSETS) },
    );
    if (!r.ok) return mapa;

    const corpo = (await r.json()) as { response?: { store_items?: ItemLoja[] } };
    for (const item of corpo.response?.store_items ?? []) {
      const formato = item.assets?.asset_url_format;
      if (item.id === undefined || !formato) continue;
      const url = (arquivo?: string) =>
        arquivo ? ASSETS + formato.replace('${FILENAME}', arquivo) : null;
      mapa.set(item.id, { deitada: url(item.assets?.header), emPe: url(item.assets?.library_capsule) });
    }
  } catch {
    // resolver a arte é enfeite; devolver os jogos, não
  }
  return mapa;
}

const normalizar = (j: JogoSteam, capas: Map<number, Arte>): Jogo => ({
  id: String(j.appid),
  nome: j.name ?? '',
  capa: capas.get(j.appid)?.deitada ?? capaPorConvencao(j.appid),
  capaAlta: capas.get(j.appid)?.emPe ?? null,
  url: lojaDe(j.appid),
  minutosRecentes: j.playtime_2weeks ?? 0,
  minutosTotais: j.playtime_forever ?? 0,
});

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (metodoInvalido(req, res)) return;

  const env = ambiente(['STEAM_API_KEY', 'STEAM_ID']);
  if ('falta' in env) return falha(res, 500, `variavel:${env.falta}`);
  const { STEAM_API_KEY: chave, STEAM_ID: id } = env.vars;

  try {
    const [resumo, recentes] = await Promise.all([
      fetch(
        `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${chave}&steamids=${id}`,
      ),
      fetch(
        `https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/?key=${chave}&steamid=${id}&count=8`,
      ),
    ]);

    if (!resumo.ok || !recentes.ok) {
      return falha(res, 502, `steam:${resumo.status}/${recentes.status}`);
    }

    const perfil = (await resumo.json()) as {
      response?: { players?: { gameid?: string; gameextrainfo?: string }[] };
    };
    const lista = (await recentes.json()) as { response?: { games?: JogoSteam[] } };

    const jogador = perfil.response?.players?.[0];
    const jogos = lista.response?.games ?? [];

    /**
     * O jogo aberto vem do resumo, mas o tempo dele vem da lista de recentes: o
     * resumo traz só o nome. Quando ele ainda não aparece ali (partida da
     * primeira vez), os minutos ficam em zero, que é a verdade.
     */
    const abertoId = jogador?.gameid && jogador.gameextrainfo ? Number(jogador.gameid) : null;

    /**
     * Uma consulta só para toda a tela: os recentes mais o que está aberto,
     * que pode não estar entre eles numa partida da primeira vez.
     */
    const arte = await capas([
      ...new Set([...jogos.map((g) => g.appid), ...(abertoId ? [abertoId] : [])]),
    ]);

    const jogando: Jogo | null =
      abertoId && jogador?.gameextrainfo
        ? {
            ...normalizar(
              jogos.find((g) => g.appid === abertoId) ?? { appid: abertoId },
              arte,
            ),
            nome: jogador.gameextrainfo,
          }
        : null;

    const dados: Jogos = {
      jogando,
      recentes: jogos.map((g) => normalizar(g, arte)),
    };

    // 60s: o "jogando agora" é o dado vivo daqui, e ele muda em minutos, não em
    // segundos — ninguém abre e fecha um jogo dentro de um minuto
    json(res, dados, 60);
  } catch {
    falha(res, 502, 'steam:rede');
  }
}
