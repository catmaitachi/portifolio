import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Liga, Partida } from '../src/data/types.js';
import { ambiente, falha, json, metodoInvalido } from './_resposta.js';

/**
 * O League of Legends de quem tem o Riot ID `RIOT_ID` (`nome#tag`) no servidor
 * `RIOT_REGIAO` (`br1`, `na1`, `euw1`...): o perfil, as três maiores maestrias e
 * as últimas partidas.
 *
 * A Riot não manda CORS e exige a chave em todo pedido, então a função existe
 * pelos dois motivos. São cinco chamadas fixas e uma por partida:
 *
 * 1. `account-v1` troca o Riot ID pelo PUUID, na rota **regional** (americas…);
 * 2. `summoner-v4` dá o ícone e o nível, na rota do **servidor** (br1…);
 * 3. `champion-mastery-v4` dá as maiores maestrias, também no servidor;
 * 4. `match-v5` dá os ids das partidas, na regional, e depois cada partida.
 *
 * Mais duas no Data Dragon, sem chave: a versão atual (para o endereço das
 * imagens) e a lista de campeões, porque a maestria vem só com o número do
 * campeão. **A borda de nível e o brasão não passam por aqui**: são arte do jogo
 * guardada no projeto (ver `secoes.md`).
 *
 * **ARAM: Desordem (fila 2400) não aparece**: a Riot não publica essas partidas
 * na API (somem do histórico e, pedidas pelo id, dão 403; é um bug aberto no
 * `RiotGames/developer-relations`, #1109). A seção avisa isso embaixo da lista.
 *
 * A chave de desenvolvimento expira em 24 horas; a do site é a *Personal API
 * Key* (ver `pendencias.md`). Chave vencida responde 401, e a seção mostra falha.
 */

/** Quantas partidas a seção mostra. */
const PARTIDAS = 6;

/** A rota regional de cada servidor: conta e partidas moram nela, e não no servidor. */
const REGIONAL: Record<string, string> = {
  br1: 'americas',
  na1: 'americas',
  la1: 'americas',
  la2: 'americas',
  euw1: 'europe',
  eun1: 'europe',
  tr1: 'europe',
  ru: 'europe',
  me1: 'europe',
  kr: 'asia',
  jp1: 'asia',
  oc1: 'sea',
  sg2: 'sea',
  tw2: 'sea',
  vn2: 'sea',
};

const DD = 'https://ddragon.leagueoflegends.com';

class ErroRiot extends Error {
  constructor(readonly status: number) {
    super(`riot:${status}`);
  }
}

interface Participante {
  puuid: string;
  championName: string;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  [item: `item${number}`]: number;
}

interface PartidaRiot {
  metadata: { matchId: string };
  info: {
    gameDuration: number;
    gameEndTimestamp: number;
    queueId: number;
    participants: Participante[];
  };
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (metodoInvalido(req, res)) return;

  const env = ambiente(['RIOT_API_KEY', 'RIOT_ID', 'RIOT_REGIAO']);
  if ('falta' in env) return falha(res, 500, `variavel:${env.falta}`);
  const { RIOT_API_KEY: chave, RIOT_ID: riotId } = env.vars;
  const servidor = env.vars.RIOT_REGIAO.toLowerCase();
  const [nome, tag] = riotId.split('#');
  const rota = REGIONAL[servidor];
  if (!nome || !tag) return falha(res, 500, 'variavel:RIOT_ID');
  if (!rota) return falha(res, 500, 'variavel:RIOT_REGIAO');
  // a conta não tem rota `sea`: os servidores do sudeste asiático perguntam na `asia`
  const rotaConta = rota === 'sea' ? 'asia' : rota;

  // o Data Dragon não pede chave, mas pode falhar como qualquer um
  const dd = async <T>(caminho: string): Promise<T> => {
    const r = await fetch(`${DD}${caminho}`);
    if (!r.ok) throw new ErroRiot(r.status);
    return (await r.json()) as T;
  };

  const riot = async <T>(host: string, caminho: string): Promise<T> => {
    const r = await fetch(`https://${host}.api.riotgames.com${caminho}`, {
      headers: { 'X-Riot-Token': chave },
    });
    if (!r.ok) throw new ErroRiot(r.status);
    return (await r.json()) as T;
  };

  try {
    const { puuid } = await riot<{ puuid: string }>(
      rotaConta,
      `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(nome)}/${encodeURIComponent(tag)}`,
    );

    const [versoes, invocador, maestrias, ids] = await Promise.all([
      dd<string[]>('/api/versions.json'),
      riot<{ profileIconId: number; summonerLevel: number }>(
        servidor,
        `/lol/summoner/v4/summoners/by-puuid/${puuid}`,
      ),
      riot<{ championId: number; championLevel: number; championPoints: number }[]>(
        servidor,
        `/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/top?count=3`,
      ),
      riot<string[]>(rota, `/lol/match/v5/matches/by-puuid/${puuid}/ids?count=${PARTIDAS}`),
    ]);
    const img = `${DD}/cdn/${versoes[0]}/img`;

    // a maestria vem com o número do campeão; o nome e a imagem vêm da lista dele
    const lista = await dd<{ data: Record<string, { key: string; id: string; name: string }> }>(
      `/cdn/${versoes[0]}/data/en_US/champion.json`,
    );
    const porNumero = new Map(Object.values(lista.data).map((c) => [Number(c.key), c]));

    const partidas = await Promise.all(
      ids.map((id) => riot<PartidaRiot>(rota, `/lol/match/v5/matches/${id}`)),
    );

    const dados: Liga = {
      perfil: {
        nome,
        // `br1` vira `BR`, `euw1` vira `EUW`: é como o jogo escreve
        regiao: servidor.replace(/\d+$/, '').toUpperCase(),
        nivel: invocador.summonerLevel,
        icone: `${img}/profileicon/${invocador.profileIconId}.png`,
      },
      maestrias: maestrias.flatMap((m) => {
        const c = porNumero.get(m.championId);
        return c
          ? [
              {
                campeao: c.name,
                icone: `${img}/champion/${c.id}.png`,
                nivel: m.championLevel,
                pontos: m.championPoints,
              },
            ]
          : [];
      }),
      partidas: partidas.flatMap((p): Partida[] => {
        const eu = p.info.participants.find((x) => x.puuid === puuid);
        if (!eu) return [];
        return [
          {
            id: p.metadata.matchId,
            campeao: eu.championName,
            icone: `${img}/champion/${eu.championName}.png`,
            vitoria: eu.win,
            abates: eu.kills,
            mortes: eu.deaths,
            assistencias: eu.assists,
            cs: eu.totalMinionsKilled + eu.neutralMinionsKilled,
            duracao: p.info.gameDuration,
            fila: p.info.queueId,
            fim: new Date(p.info.gameEndTimestamp).toISOString(),
            itens: Array.from({ length: 7 }, (_, i) => {
              const item = eu[`item${i}`];
              return item ? `${img}/item/${item}.png` : null;
            }),
          },
        ];
      }),
    };

    // partidas mudam em minutos; cinco de borda poupam a cota da chave
    json(res, dados, 300);
  } catch (e) {
    falha(res, 502, e instanceof ErroRiot ? e.message : 'riot:rede');
  }
}
