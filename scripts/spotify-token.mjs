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
  // sempre pergunta, para dar para trocar de conta sem limpar sessão do navegador
  show_dialog: 'true',
})}`;

const servidor = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:8888');
  if (url.pathname !== '/callback') {
    res.writeHead(404).end();
    return;
  }

  const responder = (texto) => {
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' }).end(texto);
  };

  if (url.searchParams.get('state') !== estado) {
    responder('Estado não confere. Rode o script de novo.');
    console.error('\nO `state` voltou diferente do enviado. Autorização descartada.');
    servidor.close();
    process.exitCode = 1;
    return;
  }

  const erro = url.searchParams.get('error');
  if (erro) {
    responder(`Autorização negada: ${erro}`);
    console.error(`\nAutorização negada: ${erro}`);
    servidor.close();
    process.exitCode = 1;
    return;
  }

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
    responder('Deu ruim. Veja o terminal.');
    console.error('\nO Spotify recusou a troca:', dados);
    servidor.close();
    process.exitCode = 1;
    return;
  }

  gravarRefresh(dados.refresh_token);
  responder('Pronto. Pode fechar esta aba e voltar ao terminal.');
  console.log('\nRefresh token gravado em .env.local.');
  console.log('Ponha o mesmo valor em SPOTIFY_REFRESH_TOKEN nas variáveis da Vercel.');
  servidor.close();
});

servidor.listen(8888, '127.0.0.1', () => {
  console.log('Abrindo a autorização do Spotify no navegador.');
  console.log(`Se ele não abrir, cole este endereço:\n\n${autorizar}\n`);
  const abrir =
    process.platform === 'win32'
      ? ['cmd', ['/c', 'start', '', autorizar]]
      : process.platform === 'darwin'
        ? ['open', [autorizar]]
        : ['xdg-open', [autorizar]];
  spawn(abrir[0], abrir[1], { stdio: 'ignore', detached: true }).unref();
});
