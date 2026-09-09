import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Jogo, Jogos } from '../src/data/types';
import { ambiente, falha, json, metodoInvalido } from './_resposta';

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
 * A arte vem do CDN da própria Steam, montada a partir do `appid`. Não há
 * endpoint que a devolva: é caminho por convenção, e por isso `capa` pode ser
 * uma URL que não existe para um app fora da loja. A seção trata poster que não
 * carrega, como já trata banner de projeto ausente.
 */

interface JogoSteam {
  appid: number;
  name?: string;
  playtime_2weeks?: number;
  playtime_forever?: number;
}

const capaDe = (appid: number) =>
  `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`;
const lojaDe = (appid: number) => `https://store.steampowered.com/app/${appid}/`;

const normalizar = (j: JogoSteam): Jogo => ({
  id: String(j.appid),
  nome: j.name ?? '',
  capa: capaDe(j.appid),
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
    const jogando: Jogo | null =
      jogador?.gameid && jogador.gameextrainfo
        ? {
            ...normalizar(
              jogos.find((g) => String(g.appid) === jogador.gameid) ?? {
                appid: Number(jogador.gameid),
              },
            ),
            nome: jogador.gameextrainfo,
          }
        : null;

    const dados: Jogos = {
      jogando,
      recentes: jogos.map(normalizar),
    };

    // 60s: o "jogando agora" é o dado vivo daqui, e ele muda em minutos, não em
    // segundos — ninguém abre e fecha um jogo dentro de um minuto
    json(res, dados, 60);
  } catch {
    falha(res, 502, 'steam:rede');
  }
}
