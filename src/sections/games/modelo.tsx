import { memo, type ReactNode, type RefObject } from 'react';
import styles from './Boneco.module.css';

/**
 * O modelo do jogador do Minecraft, em CSS 3D: seis caixas de seis faces com a
 * skin de verdade, sem three.js. Só a geometria mora aqui; o que se move, e
 * quando, é de `Boneco.tsx`.
 *
 * **Cada face é um `<i>` com um pedaço da textura de fundo**, recortado pela UV
 * que o jogo usa (a mesma planta de 64x64 de qualquer skin). O navegador faz a
 * profundidade; o que muda por quadro são poucos `transform`s (o corpo, a
 * cabeça, os membros ao andar), e as 72 faces ficam paradas no compositor.
 *
 * As medidas estão em texels, e viram pixels por `var(--px)`: o tamanho do
 * boneco é CSS (`Boneco.module.css`), e mudar de tela não refaz nada aqui.
 *
 * O modelo segue o do jogo: pivôs nos ombros, no pescoço e nos quadris, a
 * segunda camada (chapéu, jaqueta, mangas, calça) meio texel para fora, e a
 * capa pendurada nas costas.
 *
 * **A armadura é mais uma camada das mesmas caixas**, com a textura do jogo
 * (`entity/equipment/humanoid`, na planta de 64x32 das skins antigas): o elmo, o
 * peitoral e as botas um texel para fora, e a calça, que tem textura própria,
 * meio. Cada caixa leva o nome da peça, e só aparece depois de vestida.
 */

type Vec = [number, number, number];

const px = (n: number) => `calc(var(--px) * ${n})`;
const em = ([x, y, z]: Vec) => `translate3d(${px(x)}, ${px(y)}, ${px(z)})`;

/** O tamanho das duas texturas, em texels. */
const PELE: [number, number] = [64, 64];
const BAIXA: [number, number] = [64, 32];

/** As peças da armadura, na ordem em que ele as veste. */
export type Peca = 'botas' | 'calca' | 'peito' | 'elmo';

interface CaixaProps {
  /**
   * Qual textura, pelo nome da variável de CSS (`Boneco.module.css`); sem isto é
   * a skin. A skin tem 64x64, e as outras (a capa e a armadura) 64x32.
   */
  tex?: string;
  /** o tamanho da textura, quando não é nem a skin nem uma de 64x32 (o escudo tem 64x64) */
  plano?: [number, number];
  /**
   * O membro esquerdo da armadura: o jogo o desenha espelhando o direito. A
   * textura vem já virada (`*-espelho.png`), e os dois lados trocam de lugar.
   * Virar a caixa com `scaleX(-1)` não serve: o navegador passa a tratar a
   * frente de cada face como o verso, e `backface-visibility` esconde o que
   * deveria aparecer.
   */
  espelho?: boolean;
  /** a peça de armadura a que a caixa pertence: só aparece depois de vestida */
  peca?: Peca;
  /** o canto da caixa na textura */
  uv: [number, number];
  /** largura, altura e profundidade, em texels */
  tam: Vec;
  /** onde fica o centro da caixa, a partir do pivô da parte */
  centro: Vec;
  /** a segunda camada fica um pouco maior que a primeira, como no jogo */
  infla?: number;
}

/**
 * Uma caixa do modelo: as seis faces com a UV do Minecraft.
 *
 * A planta de uma caixa (w, h, d) a partir de (u, v) é sempre a mesma: a tampa e
 * o fundo em cima, e na faixa de baixo o lado direito, a frente, o lado esquerdo
 * e as costas. Na segunda camada a face cresce e a textura estica junto, para os
 * mesmos texels cobrirem a face maior.
 *
 * O recorte vai em variáveis (`--bs`, `--bp`), e não direto no `background`,
 * porque o dano usa o mesmo recorte duas vezes: no fundo e na máscara que
 * impede o vermelho de pintar os buracos da segunda camada.
 */
function Caixa({
  tex,
  plano,
  espelho,
  peca,
  uv: [u, v],
  tam: [w, h, d],
  centro,
  infla = 0,
}: CaixaProps) {
  const [tw, th] = plano ?? (tex ? BAIXA : PELE);
  /** o lado de dentro e o de fora trocam no membro espelhado */
  const [ladoD, ladoE] = espelho ? [u + d + w, u] : [u, u + d + w];
  const W = w + 2 * infla;
  const H = h + 2 * infla;
  const D = d + 2 * infla;
  // [u, v, texels de largura, de altura, largura e altura da face, transform]
  const faces: [number, number, number, number, number, number, string][] = [
    [u + d, v + d, w, h, W, H, `translateZ(${px(D / 2)})`],
    [u + 2 * d + w, v + d, w, h, W, H, `rotateY(180deg) translateZ(${px(D / 2)})`],
    [ladoD, v + d, d, h, D, H, `rotateY(-90deg) translateZ(${px(W / 2)})`],
    [ladoE, v + d, d, h, D, H, `rotateY(90deg) translateZ(${px(W / 2)})`],
    [u + d, v, w, d, W, D, `rotateX(90deg) translateZ(${px(H / 2)})`],
    // o fundo: o plano da tampa, descido, e visto pelo verso (ver `FUNDO`)
    [u + d + w, v, w, d, W, D, `rotateX(90deg) translateZ(${px(-H / 2)})`],
  ];

  return (
    <div
      className={peca ? `${styles.no} ${styles.peca}` : styles.no}
      style={{ transform: em(centro), '--tex': tex ? `var(${tex})` : undefined } as React.CSSProperties}
      data-peca={peca}
    >
      {faces.map(([u0, fv, fw, fh, pw, ph, transform], i) => {
        // na textura virada, o que estava em u está em (largura − u − w)
        const fu = espelho ? tw - u0 - fw : u0;
        const sx = pw / fw;
        const sy = ph / fh;
        return (
          <i
            key={transform}
            style={
              {
                width: px(pw),
                height: px(ph),
                margin: `${px(-ph / 2)} 0 0 ${px(-pw / 2)}`,
                transform,
                backfaceVisibility: i === FUNDO ? 'visible' : undefined,
                '--bs': `${px(tw * sx)} ${px(th * sy)}`,
                '--bp': `${px(-fu * sx)} ${px(-fv * sy)}`,
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
}

/**
 * O fundo da caixa é a sexta face, e a única que se vê pelo verso.
 *
 * O jogo põe a textura do fundo no mesmo sentido da tampa (em cima da figura, as
 * costas; à esquerda, o lado direito do corpo), e visto de baixo isso é a figura
 * **espelhada**. Um plano virado para baixo só mostra a figura direita ou girada
 * meia volta, nunca espelhada, e espelhar com `scaleX(-1)` faria o navegador
 * escondê-lo como verso. Então o fundo é o plano da tampa, descido até embaixo:
 * a frente dele olha para dentro da caixa, e o que se vê de fora é o verso, que
 * é a figura espelhada. Antes a face olhava para fora, e a textura ficava de
 * ponta-cabeça (o Lucas viu embaixo da cabeça).
 */
const FUNDO = 5;

/** Uma parte articulada: o pivô, e dentro dele o nó que gira. */
function Parte({
  pivo,
  giro,
  classe,
  children,
}: {
  pivo: Vec;
  giro?: RefObject<HTMLDivElement | null>;
  /** a animação de CSS do nó que gira (pelas propriedades soltas, que somam com o `transform` do JS) */
  classe?: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.no} style={{ transform: em(pivo) }}>
      <div ref={giro} className={classe ? `${styles.no} ${classe}` : styles.no}>
        {children}
      </div>
    </div>
  );
}

/** Os nós que o comportamento move. */
export interface Nos {
  corpo: RefObject<HTMLDivElement | null>;
  cabeca: RefObject<HTMLDivElement | null>;
  bracoD: RefObject<HTMLDivElement | null>;
  bracoE: RefObject<HTMLDivElement | null>;
  pernaD: RefObject<HTMLDivElement | null>;
  pernaE: RefObject<HTMLDivElement | null>;
}

/**
 * O item é a figura do jogo em dois planos em cruz, cada um com frente e verso:
 * de lado, um plano só sumiria. O giro desfaz o do braço, que entra para o meio
 * do corpo ao comer (`comer`, no CSS), e a figura fica de frente como o rosto.
 */
const CRUZ = [0, 180, 90, -90];
const GIRO_ITEM = 30;

/** Os planos da espada, de um lado ao outro da espessura dela. */
const FIO = [-0.4, 0, 0.4];

/** Para onde cai cada migalha, em texels: duas por mordida, e cinco mordidas (os atrasos são do CSS). */
const MIGALHAS = [-1.6, 1.2, -0.4, 1.8, -1.1, 0.7, 1.5, -1.9, 0.3, -0.9];

/**
 * O jogador inteiro, com a origem nos pés e y negativo para cima, em texels,
 * como o modelo do jogo. `slim` é o modelo de braços de 3 texels (Alex); o largo
 * (Steve) tem 4.
 *
 * **A árvore tem a forma do que se move junto.** O corpo todo assenta no pouso
 * (`quique`) e troca o peso de perna (`quadril`); da cintura para cima (`alto`,
 * com o pivô na cintura) ele inclina ao contrário do quadril e sobe com o
 * fôlego. As pernas ficam de fora do `alto`, com os pés no chão.
 *
 * É `memo`: a vida e os gestos re-renderizam o boneco, e as 72 faces não mudam.
 */
export const Modelo = memo(function Modelo({
  slim,
  capa,
  nos,
}: {
  slim: boolean;
  capa: boolean;
  nos: Nos;
}) {
  const bw = slim ? 3 : 4;
  const bx = slim ? 0.5 : 1;
  /** o ombro, a partir da cintura */
  const oy = slim ? -9.5 : -10;

  return (
    <div ref={nos.corpo} className={styles.boneco}>
      <div className={`${styles.no} ${styles.quique}`}>
        <div className={`${styles.no} ${styles.quadril}`}>
          <Parte pivo={[0, -12, 0]} classe={styles.alto}>
            <Parte pivo={[0, -12, 0]} giro={nos.cabeca} classe={styles.cabeca}>
              <Caixa uv={[0, 0]} tam={[8, 8, 8]} centro={[0, -4, 0]} />
              <Caixa uv={[32, 0]} tam={[8, 8, 8]} centro={[0, -4, 0]} infla={0.5} />
              <Caixa tex="--arm" peca="elmo" uv={[0, 0]} tam={[8, 8, 8]} centro={[0, -4, 0]} infla={1} />
              {/* as migalhas caem da boca, na frente do rosto */}
              <div className={`${styles.no} ${styles.migalhas}`} style={{ transform: em([0, -1.5, 4.8]) }}>
                {MIGALHAS.map((dx, i) => (
                  <span key={dx} style={{ '--dx': dx, '--i': i >> 1 } as React.CSSProperties} />
                ))}
              </div>
            </Parte>
            {/* o tronco tem o pivô na cintura: o fôlego o estica para cima, e a cintura não abre */}
            <Parte pivo={[0, 0, 0]} classe={styles.peito}>
              <Caixa uv={[16, 16]} tam={[8, 12, 4]} centro={[0, -6, 0]} />
              <Caixa uv={[16, 32]} tam={[8, 12, 4]} centro={[0, -6, 0]} infla={0.25} />
              <Caixa tex="--calca" peca="calca" uv={[16, 16]} tam={[8, 12, 4]} centro={[0, -6, 0]} infla={0.5} />
              <Caixa tex="--arm" peca="peito" uv={[16, 16]} tam={[8, 12, 4]} centro={[0, -6, 0]} infla={1} />
            </Parte>
            {/* nos braços são três giros: o do andar (JS), o da respiração (CSS) e
                o dos gestos; um `transform` por nó, senão um apaga o outro */}
            <Parte pivo={[-5, oy, 0]} giro={nos.bracoD}>
              <div className={`${styles.no} ${styles.respiraD}`}>
                <div className={`${styles.no} ${styles.gesto}`}>
                  <Caixa uv={[40, 16]} tam={[bw, 12, 4]} centro={[-bx, 4, 0]} />
                  <Caixa uv={[40, 32]} tam={[bw, 12, 4]} centro={[-bx, 4, 0]} infla={0.25} />
                  {/* a ombreira tem sempre 4 texels, como no jogo, mesmo no braço fino */}
                  <Caixa tex="--arm" peca="peito" uv={[40, 16]} tam={[4, 12, 4]} centro={[-bx, 4, 0]} infla={1} />
                  {/* o item da mão: com o braço erguido, fica de pé e de frente para a boca */}
                  <div
                    className={`${styles.no} ${styles.item}`}
                    style={{ transform: `${em([-bx, 10, 3.2])} rotateZ(${GIRO_ITEM}deg)` }}
                  >
                    {CRUZ.map((giro) => (
                      <span key={giro} style={{ transform: `rotateX(-90deg) rotateY(${giro}deg)` }} />
                    ))}
                  </div>
                  {/* a espada, como o jogo a segura: no plano do braço, com o punho no fim dele,
                      e a lâmina para a frente, 15° acima da horizontal (a figura sobe a 45°, e o
                      giro a deita 30°). O nó fica onde o meio do cabo cai no centro da mão: o
                      cabo está a (-4,06; 3,66) texels do centro da figura, antes do giro.
                      São três planos colados, visíveis dos dois lados, que dão a ela a espessura
                      de 1 texel que tem no jogo: um só sumiria de frente */}
                  <div
                    className={`${styles.no} ${styles.espada}`}
                    style={{ transform: `${em([-bx, 8.46, 5.65])} rotateY(-90deg) rotateZ(30deg)` }}
                  >
                    {FIO.map((z) => (
                      <span key={z} style={{ transform: `translateZ(${px(z)})` }} />
                    ))}
                  </div>
                </div>
              </div>
            </Parte>
            <Parte pivo={[5, oy, 0]} giro={nos.bracoE}>
              <div className={`${styles.no} ${styles.respiraE}`}>
                <div className={`${styles.no} ${styles.gestoE}`}>
                  <Caixa uv={[32, 48]} tam={[bw, 12, 4]} centro={[bx, 4, 0]} />
                  <Caixa uv={[48, 48]} tam={[bw, 12, 4]} centro={[bx, 4, 0]} infla={0.25} />
                  <Caixa
                    tex="--arm-e"
                    espelho
                    peca="peito"
                    uv={[40, 16]}
                    tam={[4, 12, 4]}
                    centro={[bx, 4, 0]}
                    infla={1}
                  />
                  {/* o escudo: a placa do modelo do jogo (12x22x1). Onde ela fica e para onde
                      vira é do CSS: do lado de fora do braço em repouso, adiante da mão na defesa */}
                  <div className={`${styles.no} ${styles.prumo}`} style={{ transform: em([bx, 0, 0]) }}>
                    <div className={`${styles.no} ${styles.escudo}`}>
                      <Caixa tex="--escudo" plano={[64, 64]} uv={[0, 0]} tam={[12, 22, 1]} centro={[0, 0, 0]} />
                    </div>
                  </div>
                </div>
              </div>
            </Parte>
            {capa && (
              <Parte pivo={[0, -12, -2]} classe={styles.sobe}>
                {/* a capa é modelada de frente para o corpo e virada para trás */}
                <div className={`${styles.no} ${styles.capa}`}>
                  <Caixa tex="--capa" uv={[0, 0]} tam={[10, 16, 1]} centro={[0, 8, 0.5]} />
                </div>
              </Parte>
            )}
          </Parte>
          <Parte pivo={[-1.9, -12, 0]} giro={nos.pernaD}>
            <div className={`${styles.no} ${styles.perna}`}>
              <Caixa uv={[0, 16]} tam={[4, 12, 4]} centro={[0, 6, 0]} />
              <Caixa uv={[0, 32]} tam={[4, 12, 4]} centro={[0, 6, 0]} infla={0.25} />
              <Caixa tex="--calca" peca="calca" uv={[0, 16]} tam={[4, 12, 4]} centro={[0, 6, 0]} infla={0.5} />
              <Caixa tex="--arm" peca="botas" uv={[0, 16]} tam={[4, 12, 4]} centro={[0, 6, 0]} infla={1} />
            </div>
          </Parte>
          <Parte pivo={[1.9, -12, 0]} giro={nos.pernaE}>
            <div className={`${styles.no} ${styles.perna}`}>
              <Caixa uv={[16, 48]} tam={[4, 12, 4]} centro={[0, 6, 0]} />
              <Caixa uv={[0, 48]} tam={[4, 12, 4]} centro={[0, 6, 0]} infla={0.25} />
              <Caixa
                tex="--calca-e"
                espelho
                peca="calca"
                uv={[0, 16]}
                tam={[4, 12, 4]}
                centro={[0, 6, 0]}
                infla={0.5}
              />
              <Caixa tex="--arm-e" espelho peca="botas" uv={[0, 16]} tam={[4, 12, 4]} centro={[0, 6, 0]} infla={1} />
            </div>
          </Parte>
        </div>
      </div>
    </div>
  );
});
