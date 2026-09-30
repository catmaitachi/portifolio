import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Minecraft } from '../src/data/types.js';
import { ambiente, falha, json, metodoInvalido } from './_resposta.js';

/**
 * A skin e a capa de quem joga Minecraft com o nome de `MINECRAFT_USER`.
 *
 * Duas chamadas à Mojang, sem chave: o nome vira o UUID, e o perfil do UUID traz
 * as texturas num JSON **em base64** dentro de `properties`. Nenhuma das duas
 * manda cabeçalho de CORS, e é só por isso que a função existe.
 *
 * **As imagens não passam por aqui.** A página as usa como `background-image`,
 * que não pede CORS, então a função devolve só o endereço. O modelo (`slim`)
 * precisa vir junto: a mesma textura desenha braços de 3 ou de 4 pixels, e quem
 * decide é o metadado, não a imagem.
 */

interface Texturas {
  textures?: {
    SKIN?: { url: string; metadata?: { model?: string } };
    CAPE?: { url: string };
  };
}

/** A Mojang ainda devolve os endereços em `http://`, que a página em https bloquearia. */
const seguro = (url: string) => url.replace(/^http:\/\//, 'https://');

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (metodoInvalido(req, res)) return;

  const env = ambiente(['MINECRAFT_USER']);
  if ('falta' in env) return falha(res, 500, `variavel:${env.falta}`);

  try {
    const conta = await fetch(
      `https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(env.vars.MINECRAFT_USER)}`,
    );
    if (!conta.ok) return falha(res, 502, `mojang:${conta.status}`);
    const { id } = (await conta.json()) as { id: string };

    const perfil = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${id}`);
    if (!perfil.ok) return falha(res, 502, `mojang:${perfil.status}`);
    const { name, properties } = (await perfil.json()) as {
      name: string;
      properties: { name: string; value: string }[];
    };

    const bruto = properties.find((p) => p.name === 'textures')?.value;
    const { textures } = (bruto ? JSON.parse(atob(bruto)) : {}) as Texturas;
    // sem skin própria a conta usa a padrão do jogo, que não tem endereço aqui
    if (!textures?.SKIN) return falha(res, 404, 'minecraft:sem-skin');

    // a skin muda pouco: uma hora de borda, e um dia servida velha enquanto renova
    json(
      res,
      {
        nome: name,
        skin: seguro(textures.SKIN.url),
        slim: textures.SKIN.metadata?.model === 'slim',
        capa: textures.CAPE ? seguro(textures.CAPE.url) : null,
      } satisfies Minecraft,
      3600,
      86400,
    );
  } catch {
    falha(res, 502, 'mojang:rede');
  }
}
