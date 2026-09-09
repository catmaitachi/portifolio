#!/usr/bin/env node
/**
 * Pega o refresh token do Spotify, uma vez.
 *
 * A API de "o que estou ouvindo" é do **usuário**, não do app: ela exige um
 * token que só existe depois de alguém autorizar no navegador, com login. Isso
 * acontece uma vez; daí em diante o refresh token renova o acesso sozinho, e é
 * ele que vai para as variáveis de ambiente.
 *
 * O script sobe um servidor no `127.0.0.1:8888`, abre a autorização, recebe o
 * código de volta, troca por tokens e **escreve o refresh token no `.env.local`**.
 *
 * Antes de rodar, o app no Spotify Developer Dashboard precisa ter
 * `http://127.0.0.1:8888/callback` na lista de Redirect URIs. O Spotify recusa
 * `localhost` desde 2025; endereço de loopback tem que ser o IP.
 *
 * Uso: `node scripts/spotify-token.mjs`
 */

import { createServer } from 'node:http';
import { readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';

const ENV = new URL('../.env.local', import.meta.url);
const REDIRECT = 'http://127.0.0.1:8888/callback';

/**
 * As permissões, e só elas.
 *
 * Uma a mais é uma a mais que o visitante do portfólio passa a poder ver por
 * tabela, e o Spotify mostra a lista inteira na tela de autorização.
 */
const ESCOPOS = [
  'user-read-currently-playing',
  'user-read-playback-state',
  'user-top-read',
  'user-read-recently-played',
].join(' ');

function lerEnv() {
  const texto = readFileSync(ENV, 'utf8');
  const vars = {};
  for (const linha of texto.split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(linha.trim());
    if (m) vars[m[1]] = m[2];
  }
  return { texto, vars };
}

function gravarRefresh(token) {
  const { texto } = lerEnv();
  const novo = texto.includes('SPOTIFY_REFRESH_TOKEN=')
    ? texto.replace(/SPOTIFY_REFRESH_TOKEN=.*/, `SPOTIFY_REFRESH_TOKEN=${token}`)
    : `${texto.replace(/\s*$/, '')}\nSPOTIFY_REFRESH_TOKEN=${token}\n`;
  writeFileSync(ENV, novo);
}

/**
 * Abre a URL no navegador padrão sem deixar o shell comer o endereço.
 *
 * No Windows, `cmd /c start <url>` **corta a URL no primeiro `&`**: para o cmd
 * ele é separador de comandos, não caractere. A autorização chegava ao Spotify
 * sem `response_type`, sem `redirect_uri` e sem `scope`, e a página só dizia que
 * a requisição era inválida. Foi assim que a primeira versão deste script
 * falhou. O PowerShell com o argumento nu quebra do mesmo jeito.
 *
 * A saída são aspas simples **explícitas** dentro do comando do PowerShell: o
 * Node só põe aspas sozinho em argumento que tenha espaço, e uma URL não tem
 * nenhum.
 */
function abrirNoNavegador(url) {
  const [programa, args] =
    process.platform === 'win32'
      ? ['powershell', ['-NoProfile', '-Command', `Start-Process '${url}'`]]
      : process.platform === 'darwin'
        ? ['open', [url]]
        : ['xdg-open', [url]];
  try {
    spawn(programa, args, { stdio: 'ignore', detached: true }).unref();
  } catch {
    /* sem navegador para abrir: o endereço já está impresso acima */
  }
}

const { vars } = lerEnv();
const id = vars.SPOTIFY_CLIENT_ID;
const segredo = vars.SPOTIFY_CLIENT_SECRET;
if (!id || !segredo) {
  console.error('Faltam SPOTIFY_CLIENT_ID e SPOTIFY_CLIENT_SECRET no .env.local.');
  process.exit(1);
}

const estado = Math.random().toString(36).slice(2);
const autorizar = `https://accounts.spotify.com/authorize?${new URLSearchParams({
  client_id: id,
  response_type: 'code',
  redirect_uri: REDIRECT,
  scope: ESCOPOS,
  state: estado,
  // sempre pergunta, para dar para trocar de conta sem limpar a sessão do navegador
  show_dialog: 'true',
})}`;

const servidor = createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:8888');
  if (url.pathname !== '/callback') {
    res.writeHead(404).end();
    return;
  }

  const responder = (texto) => {
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' }).end(texto);
  };

  const desistir = (mensagem, detalhe) => {
    responder(mensagem);
    console.error(`\n${mensagem}`);
    if (detalhe) console.error(detalhe);
    servidor.close();
    process.exitCode = 1;
  };

  if (url.searchParams.get('state') !== estado) {
    desistir('O `state` voltou diferente do enviado. Autorização descartada.');
    return;
  }

  const erro = url.searchParams.get('error');
  if (erro) {
    desistir(`Autorização negada: ${erro}`);
    return;
  }

  void (async () => {
    try {
      const resposta = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          authorization: `Basic ${Buffer.from(`${id}:${segredo}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: url.searchParams.get('code'),
          redirect_uri: REDIRECT,
        }),
      });

      const dados = await resposta.json();
      if (!resposta.ok || !dados.refresh_token) {
        desistir('O Spotify recusou a troca do código por tokens.', dados);
        return;
      }

      gravarRefresh(dados.refresh_token);
      responder('Pronto. Pode fechar esta aba e voltar ao terminal.');
      console.log('\nRefresh token gravado em .env.local.');
      console.log('Ponha o mesmo valor em SPOTIFY_REFRESH_TOKEN nas variáveis da Vercel.');
      servidor.close();
    } catch (e) {
      desistir('Falhou ao falar com o Spotify.', e);
    }
  })();
});

servidor.on('error', (e) => {
  console.error(
    e.code === 'EADDRINUSE'
      ? '\nA porta 8888 está ocupada. Feche o que estiver nela e rode de novo.'
      : `\nNão consegui subir o servidor local: ${e.message}`,
  );
  process.exit(1);
});

servidor.listen(8888, '127.0.0.1', () => {
  console.log('\nSe o navegador não abrir sozinho, cole este endereço nele:\n');
  console.log(autorizar);
  console.log('\nEsperando a autorização...');
  abrirNoNavegador(autorizar);
});
