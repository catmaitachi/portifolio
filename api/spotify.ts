import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Artista, Faixa, Musica } from '../src/data/types';
import { ambiente, falha, json, metodoInvalido } from './_resposta';

/**
 * O que estou ouvindo agora, e o que mais ouvi no último mês.
 *
 * **Isto não pode sair do navegador**, e é a razão de a função existir: os
 * endpoints usados são do *usuário*, não do app, e exigem um token renovado com
 * a client secret. Publicá-la no bundle seria entregar a conta.
 *
 * O token de acesso dura uma hora e é pedido a cada invocação. Guardá-lo entre
 * invocações não vale a pena numa função sem servidor: cada instância tem a
 * própria memória, elas nascem e morrem sem aviso, e o cache de borda já reduz a
 * quatro por minuto, no pior caso, o número de vezes que a origem é tocada.
 *
 * **É um endpoint só para as quatro coisas**, e o cache é o do dado mais vivo.
 * As mais tocadas mudam de mês em mês e ficariam felizes com uma hora, mas
 * separá-las custaria uma segunda renovação de token a cada chamada para
 * economizar o que a borda já economiza.
 */

interface FaixaSpotify {
  id: string | null;
  name: string;
  duration_ms: number;
  artists: { name: string }[];
  album: { name: string; images: { url: string }[] };
  external_urls: { spotify: string };
}

interface ArtistaSpotify {
  id: string;
  name: string;
  images: { url: string }[];
  external_urls: { spotify: string };
}

/** A maior primeiro é a ordem do Spotify; a menor serve para um sprite pequeno. */
const menorImagem = (imagens: { url: string }[]): string | null =>
  imagens.length ? (imagens[imagens.length - 1]?.url ?? null) : null;

const normalizarFaixa = (f: FaixaSpotify): Faixa => ({
  id: f.id ?? f.external_urls.spotify,
  titulo: f.name,
  artista: f.artists.map((a) => a.name).join(', '),
  album: f.album.name,
  capa: f.album.images[0]?.url ?? null,
  url: f.external_urls.spotify,
});

const normalizarArtista = (a: ArtistaSpotify): Artista => ({
  id: a.id,
  nome: a.name,
  imagem: menorImagem(a.images),
  url: a.external_urls.spotify,
});

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (metodoInvalido(req, res)) return;

  const env = ambiente(['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET', 'SPOTIFY_REFRESH_TOKEN']);
  if ('falta' in env) return falha(res, 500, `variavel:${env.falta}`);
  const {
    SPOTIFY_CLIENT_ID: id,
    SPOTIFY_CLIENT_SECRET: segredo,
    SPOTIFY_REFRESH_TOKEN: refresh,
  } = env.vars;

  try {
    const autenticacao = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        authorization: `Basic ${Buffer.from(`${id}:${segredo}`).toString('base64')}`,
      },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refresh }),
    });
    if (!autenticacao.ok) return falha(res, 502, `spotify:token:${autenticacao.status}`);
    const { access_token: token } = (await autenticacao.json()) as { access_token?: string };
    if (!token) return falha(res, 502, 'spotify:token');

    const cabecalho = { authorization: `Bearer ${token}` };
    const em = (caminho: string) =>
      fetch(`https://api.spotify.com/v1/${caminho}`, { headers: cabecalho });

    const [tocandoR, faixasR, artistasR, recentesR] = await Promise.all([
      em('me/player/currently-playing'),
      em('me/top/tracks?time_range=short_term&limit=8'),
      em('me/top/artists?time_range=short_term&limit=8'),
      em('me/player/recently-played?limit=8'),
    ]);

    /**
     * **204 é a resposta normal**, não um erro: é assim que o Spotify diz que
     * nada está tocando, que é o estado da maior parte do dia. Tratá-lo como
     * falha derrubaria a seção inteira sempre que o silêncio fosse verdade.
     */
    let tocando: Faixa | null = null;
    if (tocandoR.status === 200) {
      const atual = (await tocandoR.json()) as {
        item?: FaixaSpotify | null;
        progress_ms?: number;
        is_playing?: boolean;
        currently_playing_type?: string;
      };
      // pausado não é tocando; e episódio de podcast não tem a forma de faixa
      if (atual.is_playing && atual.item && atual.currently_playing_type === 'track') {
        tocando = {
          ...normalizarFaixa(atual.item),
          duracaoMs: atual.item.duration_ms,
          progressoMs: atual.progress_ms ?? 0,
        };
      }
    }

    const faixas = faixasR.ok
      ? ((await faixasR.json()) as { items: FaixaSpotify[] }).items.map(normalizarFaixa)
      : [];
    const artistas = artistasR.ok
      ? ((await artistasR.json()) as { items: ArtistaSpotify[] }).items.map(normalizarArtista)
      : [];
    const recentes = recentesR.ok
      ? ((await recentesR.json()) as { items: { track: FaixaSpotify; played_at: string }[] }).items
          .map((i) => ({ ...normalizarFaixa(i.track), tocadaEm: i.played_at }))
          .filter((f, i, todas) => todas.findIndex((o) => o.id === f.id) === i)
      : [];

    /**
     * Se as quatro falharem ao mesmo tempo, é a conta e não o silêncio. Devolver
     * 200 com tudo vazio faria a página afirmar que a pessoa não ouviu nada.
     */
    if (!faixasR.ok && !artistasR.ok && !recentesR.ok && tocandoR.status >= 400) {
      return falha(res, 502, `spotify:${tocandoR.status}`);
    }

    const dados: Musica = { tocando, recentes, faixas, artistas };
    json(res, dados, 30);
  } catch {
    falha(res, 502, 'spotify:rede');
  }
}
