import { fastCos, fastSin, TAU } from './math';
import type { Campo } from './gravity';

/**
 * A estrela, num lugar só.
 *
 * Três camadas desenham estrelas — o campo, as que a supernova acende e as das
 * figuras — e nenhuma pode importar a outra. É o mesmo arranjo de
 * `engine/gravity.ts` e `engine/plasma.ts`, e aqui ele pesa mais: as três ficam
 * lado a lado no mesmo céu, e uma delas desenhada com outra linguagem salta aos
 * olhos.
 *
 * **Uma estrela não é um ponto, é um borrão.** O desenho vem do `Star()` do
 * shader do Galaxy, assado pixel a pixel:
 *
 * ```glsl
 * float m = (0.05 * uGlowIntensity) / d;                 // núcleo minúsculo, halo largo
 * float rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
 * m += rays * flare * uGlowIntensity;                    // quatro raios ortogonais
 * uv *= MAT45;  rays = smoothstep(...);
 * m += rays * 0.3 * flare * uGlowIntensity;              // quatro diagonais, a 30%
 * m *= smoothstep(1.0, 0.2, d);                          // corte suave da borda
 * ```
 *
 * A queda `1/d` é o que dá o "leve blur": quase toda a área da estrela é halo
 * fraco, e o ponto aceso ocupa 5% do raio. É dela que sai a consequência que
 * motivou este módulo — **esticar um borrão produz um rastro suave**, enquanto
 * esticar um ponto produzia o risco de 1px que estava ali antes.
 *
 * Assar num buffer e ampliar no `drawImage` é o que o contrato de desempenho já
 * manda para efeito de pixel, e o mesmo caminho da nebulosa, do plasma e do disco
 * da supernova.
 */

/** O `0.05` do shader: raio do núcleo saturado, em fração do raio do sprite. */
const NUCLEO = 0.05;

/**
 * Expoente da queda do halo. No shader é 1 (`0.05·G/d`), aqui é 2.
 *
 * Lá o brilho é avaliado por fragmento e `uGlowIntensity` vale 0,3, o que deixa o
 * halo bem fraco e o núcleo nítido de graça. Aqui o sprite é **reduzido** para o
 * tamanho da estrela na tela, e as duas coisas brigam: assar com 0,3 põe o núcleo
 * em 1,5% do raio, que vira meio pixel e o filtro bilinear come; assar com 1
 * mantém o núcleo mas deixa o halo três vezes mais forte que o de lá — e o céu
 * vira uma parede de bolhas, que foi exatamente o que aconteceu na primeira
 * tentativa.
 *
 * O expoente resolve as duas: o núcleo continua nos 5% (sobrevive à redução) e o
 * halo cai para perto do nível do componente. Em d=0,15 dá 0,111 contra os 0,100
 * de lá; em d=0,3 dá 0,028 contra 0,050. É copiar o resultado em vez do número.
 */
const QUEDA = 2;
/**
 * Quanto os raios afinam ao se afastarem do centro. No shader é `1000`.
 *
 * O número de lá está calibrado para a escala de pixel **de lá**: o campo é
 * avaliado por fragmento, e a célula de uma estrela mede uns 36px de tela, o que
 * dá um raio de ~1,4px de largura junto ao núcleo. Aqui o sprite tem 128px e é
 * desenhado a ~48px, então manter o 1000 literal daria um traço de 0,48px — que o
 * filtro bilinear come na redução, e a estrela perderia as pontas.
 *
 * 380 devolve os mesmos ~1,3px de tela que o componente mostra. É o caso em que
 * copiar o número seria menos fiel que copiar o resultado.
 */
const AFIACAO = 380;
/** O peso das diagonais contra as ortogonais, também do shader. */
const DIAGONAIS = 0.3;
const COS45 = Math.SQRT1_2;

/** `smoothstep(0, 1, x)`, com o clamp que o GLSL faz por fora. */
const passo01 = (x: number): number => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/** `smoothstep(1.0, 0.2, d)`: cheio no miolo, zero na borda do sprite. */
const corte = (d: number): number => passo01((1 - d) / 0.8);

/** Só o brilho: núcleo saturado e halo com queda `1/d`. */
function brilhoDe(ux: number, uy: number): number {
  const d = Math.sqrt(ux * ux + uy * uy) || 1e-4;
  const m = Math.pow(NUCLEO / d, QUEDA);
  return (m > 1 ? 1 : m) * corte(d);
}

/** Só as oito pontas, para entrarem por `globalAlpha` sobre o brilho. */
function raiosDe(ux: number, uy: number): number {
  const d = Math.sqrt(ux * ux + uy * uy) || 1e-4;
  let m = passo01(1 - Math.abs(ux * uy * AFIACAO));
  // MAT45 do shader: as mesmas pontas giradas um oitavo de volta
  const rx = (ux - uy) * COS45;
  const ry = (ux + uy) * COS45;
  m += passo01(1 - Math.abs(rx * ry * AFIACAO)) * DIAGONAIS;
  return (m > 1 ? 1 : m) * corte(d);
}

/**
 * Assa uma função de forma num buffer branco, com a intensidade no canal alfa.
 *
 * `ss` é o supersampling por eixo. O brilho é liso e se contenta com 2; os raios
 * precisam de 4, porque longe do centro a hipérbole `|x·y·1000| < 1` fica bem
 * abaixo de um pixel de largura — em `x = 0,5` a meia-largura é 0,002 do raio do
 * sprite. Sem supersample eles serrilham e voltam a parecer tracinhos, que é
 * exatamente o que este módulo existe para não ser.
 */
function assar(lado: number, ss: number, forma: (ux: number, uy: number) => number) {
  const cv = document.createElement('canvas');
  cv.width = lado;
  cv.height = lado;
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(lado, lado);
  const d = img.data;
  const meio = lado / 2;
  const sub = 1 / ss;
  const peso = 1 / (ss * ss);

  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      let m = 0;
      for (let sy = 0; sy < ss; sy++) {
        const uy = (y + (sy + 0.5) * sub - meio) / meio;
        for (let sx = 0; sx < ss; sx++) {
          const ux = (x + (sx + 0.5) * sub - meio) / meio;
          m += forma(ux, uy);
        }
      }
      m *= peso;
      const i = (y * lado + x) * 4;
      d[i] = 255;
      d[i + 1] = 255;
      d[i + 2] = 255;
      d[i + 3] = m <= 0 ? 0 : m >= 1 ? 255 : (m * 255) | 0;
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

export interface SpritesEstrela {
  /** o núcleo e o halo */
  readonly brilho: HTMLCanvasElement;
  /** as oito pontas, sozinhas */
  readonly raios: HTMLCanvasElement;
}

/**
 * Os dois sprites da estrela.
 *
 * São **dois** porque no shader o flare pulsa no tempo, um por estrela
 * (`glossLocal`, um triângulo lento). Separado, ele entra por `globalAlpha` sobre
 * o mesmo brilho, em vez de exigir um sprite por instante do pulso.
 *
 * A assadura é com intensidade cheia (o núcleo satura em branco). Quem desenha
 * baixa o nível por `globalAlpha` — assar já apagado gastaria uma fração dos 256
 * degraus do canal alfa e o halo apareceria em faixas.
 */
export function criarEstrela(lado = 128): SpritesEstrela {
  return {
    brilho: assar(lado, 2, brilhoDe),
    raios: assar(lado, 4, raiosDe),
  };
}

/* ─── a estrela na tela ─────────────────────────────────────────────────────
   Daqui para baixo é o que as três camadas precisam concordar: o tamanho, a
   deriva, o alongamento da lente e o desenho em si. Antes disso o campo e a
   supernova duplicavam os números com uma nota pedindo que mudassem juntos, que
   é a fragilidade que `gravity.ts` já tinha resolvido para o puxão. */

/** Diâmetro do brilho, em px: as menores ficam em 14px e as maiores em 34px. */
const EXT_BASE = 6;
const EXT_K = 14;

/**
 * Nível geral do céu.
 *
 * **É o botão de quando o preto profundo começar a parecer cinza.** Seiscentos
 * halos de 40px se somam, e um brilho suave cobre muito mais tela que o ponto de
 * 1px que havia aqui antes. Como sempre nesta página, mexer para baixo.
 */
export const GLOW_ALPHA = 1;

/** Deriva ambiente, em px. */
const DERIVA_AMP = 8;
/** Períodos diferentes em X e Y: o vagar é de Lissajous, não um circulinho. */
const DERIVA_TX = TAU / 12;
const DERIVA_TY = TAU / 30;

/** Faixa de `ssz` em que as oito pontas aparecem, e o quanto elas pesam. */
const RAIOS_DE = 1.35;
const RAIOS_ATE = 1.75;
const RAIOS_ALPHA = 0.85;
/** O flare respira, um por estrela, como o `glossLocal` do shader. */
const RAIOS_VEL = TAU / 30;

/** Abaixo disto o alongamento sairia menor que 6%, que ninguém vê. */
const LENTE_MIN2 = 18 * 18;
/** Alongamento no infinito, e o deslocamento que leva à metade do caminho. */
const LENTE_MAX = 3;
const LENTE_MEIA = 110;

/** Diâmetro do brilho na tela para uma estrela de raio `ssz`. */
export const extensaoDe = (ssz: number): number => EXT_BASE + ssz * EXT_K;

/**
 * A deriva ambiente, que só existe no desenho.
 *
 * Somada ao deslocamento ela entraria na mola, no puxão e no teste da lente, e um
 * céu que respira viraria um céu que está sempre sendo puxado. A fase é a mesma
 * do cintilar, então não custa um array novo.
 */
export const derivaEmX = (t: number, fase: number): number =>
  DERIVA_AMP * fastCos(t * DERIVA_TX + fase);
export const derivaEmY = (t: number, fase: number): number =>
  DERIVA_AMP * fastSin(t * DERIVA_TY + fase * 1.7);

/**
 * O alongamento da lente.
 *
 * **A razão de estar ao quadrado.** No shader o que estica uma estrela não é o
 * deslocamento, é o **gradiente** dele: o campo desloca com `1/d` e estica com
 * `1/d²`, então longe do centro as estrelas andam muito e deformam pouco. Aqui o
 * deslocamento sai da mola, que satura, e usá-lo cru dava 70% do céu esticado a
 * 2x — o que lê como uma tela inteira borrada, não como uma lente sobre alguma
 * coisa. Ao quadrado, a mediana cai para 1,24x (uma oval que mal se nota) e só o
 * miolo, onde a física realmente aperta, chega perto de 2,4x. É esse contraste
 * que faz o buraco negro parecer estar num lugar.
 *
 * **E a curva satura sozinha.** O teto duro que havia aqui antes punha 28% dos
 * rastros no mesmo comprimento, apagando justamente a informação que o rastro
 * existe para dar. `mag/(mag+MEIA)` encosta no limite sem nunca bater nele.
 */
export function alongamentoDe(mag: number): number {
  const q = mag / (mag + LENTE_MEIA);
  return 1 + LENTE_MAX * q * q;
}

/** O deslocamento já é grande o bastante para virar lente? */
export const temAlongamento = (mag2: number): boolean => mag2 > LENTE_MIN2;

/**
 * O respiro do flare: entre 35% e 100%, fora de fase com as vizinhas.
 *
 * É o `glossLocal` do shader, um triângulo lento por estrela. Fica exposto porque
 * a supernova decide o peso das pontas por outro critério (o nível da carga, não
 * o tamanho) e precisa respirar no mesmo compasso do resto do céu.
 */
export const respiraFlare = (t: number, fase: number): number =>
  0.675 + 0.325 * fastSin(t * RAIOS_VEL + fase * 3);

/** Quanto das oito pontas esta estrela mostra agora, de 0 a 1. */
export function flareDe(ssz: number, t: number, fase: number): number {
  if (ssz <= RAIOS_DE) return 0;
  const p = ssz >= RAIOS_ATE ? 1 : (ssz - RAIOS_DE) / (RAIOS_ATE - RAIOS_DE);
  return p * respiraFlare(t, fase);
}

/**
 * A estrela está dentro do alcance de uma gravidade **de verdade**?
 *
 * A lente existe para mostrar o buraco negro e a carga da supernova puxando o
 * céu. A repulsão do ponteiro também desloca, e bastante, mas ela é o cursor
 * afastando estrelas: esticar ali leria como rastro de mouse.
 */
export function dentroDoAlcance(
  x: number,
  y: number,
  campo: Campo,
  poco: Campo,
  temGrav: boolean,
  temPoco: boolean,
): boolean {
  if (temGrav) {
    const dx = x - campo.x;
    const dy = y - campo.y;
    if (dx * dx + dy * dy < campo.alcance2) return true;
  }
  if (temPoco) {
    const dx = x - poco.x;
    const dy = y - poco.y;
    if (dx * dx + dy * dy < poco.alcance2) return true;
  }
  return false;
}

/**
 * Desenha uma estrela: o brilho, e as pontas se ela for grande o bastante.
 *
 * **Esticar não pode acender.** Um borrão alongado espalha a mesma luz por mais
 * área, então o alfa cai com `1/√s`; sem isso as estrelas puxadas ficariam mais
 * brilhantes que as paradas, que é o contrário do que acontece.
 *
 * **Estica no comprimento e mantém a largura.** Comprimir de verdade no eixo curto,
 * que é o que uma lente faz, devolveria o risco fino que este desenho existe para
 * não ser. Assim o rastro é sempre ao menos tão largo quanto a estrela, e como
 * ele é um halo, é borrado por construção.
 *
 * O vetor unitário do deslocamento já é a primeira coluna da matriz de rotação,
 * então não há `atan2` aqui.
 */
export function desenharEstrela(
  ctx: CanvasRenderingContext2D,
  dpr: number,
  px: number,
  py: number,
  ext: number,
  alfa: number,
  flare: number,
  s: number,
  ux: number,
  uy: number,
): void {
  const spr = compartilhados ?? estrela();
  const e = dpr * ext;
  const a = s > 1 ? alfa / Math.sqrt(s) : alfa;
  if (s > 1) ctx.setTransform(ux * e * s, uy * e * s, -uy * e, ux * e, dpr * px, dpr * py);
  else ctx.setTransform(e, 0, 0, e, dpr * px, dpr * py);
  ctx.globalAlpha = a;
  ctx.drawImage(spr.brilho, -0.5, -0.5, 1, 1);
  if (flare > 0) {
    ctx.globalAlpha = a * flare * RAIOS_ALPHA;
    ctx.drawImage(spr.raios, -0.5, -0.5, 1, 1);
  }
}

let compartilhados: SpritesEstrela | null = null;

/**
 * Os sprites que as três camadas dividem.
 *
 * Compartilhar aqui é o contrário do que `criarPlasma` faz, e pelo motivo certo:
 * o plasma é repintado no tempo, então cada camada precisa do próprio buffer;
 * estes são assados uma vez e nunca mais mudam. Deixar cada camada assar o seu
 * seria pagar três vezes o mesmo laço de pixels para guardar três cópias iguais.
 */
export function estrela(): SpritesEstrela {
  return (compartilhados ??= criarEstrela());
}
