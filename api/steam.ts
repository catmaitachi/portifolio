import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Jogo, Jogos } from '../src/data/types.js';
import { ambiente, falha, json, metodoInvalido } from './_resposta.js';

/**
 * O que estou jogando, o que joguei nas últimas duas semanas, a biblioteca e
 * o nível da conta.
 *
 * Quatro chamadas à Steam Web API, e só as duas primeiras são obrigatórias: a
 * biblioteca entrou para a seção ter o que mostrar quando a quinzena vem vazia,
 * e o nível para o avatar da conta; a falta delas não derruba a resposta (ver
 * `opcional`).
 *
 * A primeira é o resumo do perfil, e é dela que
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
 * seção já desenha como faz com qualquer imagem ausente.
 */

interface JogoSteam {
  appid: number;
  name?: string;
  playtime_2weeks?: number;
  playtime_forever?: number;
  /** só na biblioteca: a última sessão, em segundos; 0 para o que nunca foi aberto */
  rtime_last_played?: number;
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

/** Quanto se espera pela biblioteca e pelo nível antes de seguir sem eles. */
const ESPERA_EXTRAS = 5000;

/** Quantos jogos cada lista da biblioteca leva: é o que o deque mostra de uma vez. */
const TETO = 25;

/**
 * O que não entra na página: appids separados por vírgula em `STEAM_OCULTAR`.
 *
 * A biblioteca chega inteira, e nem tudo o que está numa conta de nove anos é
 * para a vitrine de um site pessoal. A variável é **opcional**, e
 * por isso não passa por `ambiente()`: sem ela, nada é escondido.
 */
const ocultos = () =>
  new Set(
    (process.env.STEAM_OCULTAR ?? '')
      .split(',')
      .map((s) => Number(s.trim()))
      .filter(Boolean),
  );

/**
 * Uma chamada cuja falta não derruba a resposta.
 *
 * A biblioteca e o nível dependem de uma opção de privacidade a mais
 * ("Detalhes dos jogos"), e fechadas a API responde 200 sem os campos. Fora do
 * ar, lenta ou fechada, o retorno é `null`, e a seção volta a ser o que era
 * antes delas: o conteúdo daqui continua sendo o que está aberto e os recentes.
 */
async function opcional<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(ESPERA_EXTRAS) });
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

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
      if (item.id === undefined) continue;
      const url = (arquivo?: string) =>
        arquivo && formato ? ASSETS + formato.replace('${FILENAME}', arquivo) : null;
      mapa.set(item.id, {
        deitada: url(item.assets?.header),
        emPe: url(item.assets?.library_capsule),
      });
    }
  } catch {
    // resolver a arte é enfeite; devolver os jogos, não
  }
  return mapa;
}

/**
 * A conta: o nick, o avatar e o nível, com a fração do caminho até o próximo.
 * Fechado pela privacidade, `GetBadges` volta 200 sem campo nenhum, e é o
 * `player_level` ausente que diz isso: aí não há conta, e a seção não ganha o
 * avatar.
 */
function conta(
  jogador: { personaname?: string; avatarfull?: string } | undefined,
  n:
    | {
        player_level?: number;
        player_xp?: number;
        player_xp_needed_to_level_up?: number;
        player_xp_needed_current_level?: number;
      }
    | undefined,
): Jogos['perfil'] {
  if (n?.player_level === undefined) return null;
  const feito = (n.player_xp ?? 0) - (n.player_xp_needed_current_level ?? n.player_xp ?? 0);
  const falta = n.player_xp_needed_to_level_up ?? 0;
  return {
    nome: jogador?.personaname ?? '',
    avatar: jogador?.avatarfull ?? null,
    nivel: n.player_level,
    xpFalta: falta,
    progresso: feito + falta > 0 ? Math.min(1, Math.max(0, feito / (feito + falta))) : 0,
  };
}

const normalizar = (j: JogoSteam, capas: Map<number, Arte>): Jogo => ({
  id: String(j.appid),
  nome: j.name ?? '',
  capa: capas.get(j.appid)?.deitada ?? capaPorConvencao(j.appid),
  capaAlta: capas.get(j.appid)?.emPe ?? null,
  url: lojaDe(j.appid),
  minutosRecentes: j.playtime_2weeks ?? 0,
  minutosTotais: j.playtime_forever ?? 0,
  ...(j.rtime_last_played ? { jogadoEm: new Date(j.rtime_last_played * 1000).toISOString() } : {}),
});

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (metodoInvalido(req, res)) return;

  const env = ambiente(['STEAM_API_KEY', 'STEAM_ID']);
  if ('falta' in env) return falha(res, 500, `variavel:${env.falta}`);
  const { STEAM_API_KEY: chave, STEAM_ID: id } = env.vars;

  try {
    const [resumo, recentes, biblioteca, nivel] = await Promise.all([
      fetch(
        `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${chave}&steamids=${id}`,
      ),
      fetch(
        `https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/?key=${chave}&steamid=${id}&count=${TETO}`,
      ),
      opcional<{ response?: { game_count?: number; games?: JogoSteam[] } }>(
        `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${chave}&steamid=${id}&include_appinfo=1&include_played_free_games=1`,
      ),
      /**
       * O nível e o XP vêm de `GetBadges`, que traz também onde o nível atual
       * começou: é o que dá a fração do anel. `GetSteamLevel` daria só o número.
       */
      opcional<{
        response?: {
          player_level?: number;
          player_xp?: number;
          player_xp_needed_to_level_up?: number;
          player_xp_needed_current_level?: number;
        };
      }>(`https://api.steampowered.com/IPlayerService/GetBadges/v1/?key=${chave}&steamid=${id}`),
    ]);

    if (!resumo.ok || !recentes.ok) {
      return falha(res, 502, `steam:${resumo.status}/${recentes.status}`);
    }

    const perfil = (await resumo.json()) as {
      response?: {
        players?: {
          gameid?: string;
          gameextrainfo?: string;
          personaname?: string;
          avatarfull?: string;
          profileurl?: string;
        }[];
      };
    };
    const lista = (await recentes.json()) as { response?: { games?: JogoSteam[] } };

    const fora = ocultos();
    const jogador = perfil.response?.players?.[0];

    /**
     * A biblioteca, pelos dois critérios da seção. `rtime_last_played` é 0 para o
     * que nunca foi aberto, e é isso que tira da lista "por último" o que foi
     * comprado e ficou na estante.
     */
    const posse = (biblioteca?.response?.games ?? []).filter((g) => !fora.has(g.appid));
    const daPosse = new Map(posse.map((g) => [g.appid, g]));
    const porUltimo = posse
      .filter((g) => g.rtime_last_played)
      .sort((a, b) => (b.rtime_last_played ?? 0) - (a.rtime_last_played ?? 0))
      .slice(0, TETO);
    const maisJogados = posse
      .filter((g) => g.playtime_forever)
      .sort((a, b) => (b.playtime_forever ?? 0) - (a.playtime_forever ?? 0))
      .slice(0, TETO);

    // os recentes ganham a data da última sessão, que só a biblioteca traz
    const jogos = (lista.response?.games ?? [])
      .filter((g) => !fora.has(g.appid))
      .map((g) => ({ ...daPosse.get(g.appid), ...g }));

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
      ...new Set([
        ...[...jogos, ...porUltimo, ...maisJogados].map((g) => g.appid),
        ...(abertoId ? [abertoId] : []),
      ]),
    ]);

    const jogando: Jogo | null =
      abertoId && jogador?.gameextrainfo
        ? {
            ...normalizar(
              jogos.find((g) => g.appid === abertoId) ?? daPosse.get(abertoId) ?? { appid: abertoId },
              arte,
            ),
            nome: jogador.gameextrainfo,
          }
        : null;

    const dados: Jogos = {
      jogando,
      recentes: jogos.map((g) => normalizar(g, arte)),
      porUltimo: porUltimo.map((g) => normalizar(g, arte)),
      maisJogados: maisJogados.map((g) => normalizar(g, arte)),
      totalJogos: biblioteca?.response?.game_count ?? 0,
      perfil: conta(jogador, nivel?.response),
    };

    // 60s: o "jogando agora" é o dado vivo daqui, e ele muda em minutos, não em
    // segundos — ninguém abre e fecha um jogo dentro de um minuto
    json(res, dados, 60);
  } catch {
    falha(res, 502, 'steam:rede');
  }
}
