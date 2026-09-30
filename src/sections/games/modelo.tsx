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
 */

type Vec = [number, number, number];

const px = (n: number) => `calc(var(--px) * ${n})`;
const em = ([x, y, z]: Vec) => `translate3d(${px(x)}, ${px(y)}, ${px(z)})`;

/** O tamanho das duas texturas, em texels. */
const PELE: [number, number] = [64, 64];
const CAPA: [number, number] = [64, 32];

interface CaixaProps {
  /** qual textura: `--skin` ou `--capa`, as duas declaradas no palco */
  capa?: boolean;
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
function Caixa({ capa, uv: [u, v], tam: [w, h, d], centro, infla = 0 }: CaixaProps) {
  const [tw, th] = capa ? CAPA : PELE;
  const W = w + 2 * infla;
  const H = h + 2 * infla;
  const D = d + 2 * infla;
  // [u, v, texels de largura, de altura, largura e altura da face, transform]
  const faces: [number, number, number, number, number, number, string][] = [
    [u + d, v + d, w, h, W, H, `translateZ(${px(D / 2)})`],
    [u + 2 * d + w, v + d, w, h, W, H, `rotateY(180deg) translateZ(${px(D / 2)})`],
    [u, v + d, d, h, D, H, `rotateY(-90deg) translateZ(${px(W / 2)})`],
    [u + d + w, v + d, d, h, D, H, `rotateY(90deg) translateZ(${px(W / 2)})`],
    [u + d, v, w, d, W, D, `rotateX(90deg) translateZ(${px(H / 2)})`],
    [u + d + w, v, w, d, W, D, `rotateX(-90deg) translateZ(${px(H / 2)})`],
  ];

  return (
    <div className={styles.no} style={{ transform: em(centro) }} data-capa={capa || undefined}>
      {faces.map(([fu, fv, fw, fh, pw, ph, transform]) => {
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

/** Uma parte articulada: o pivô, e dentro dele o nó que gira. */
function Parte({
  pivo,
  giro,
  children,
}: {
  pivo: Vec;
  giro?: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  return (
    <div className={styles.no} style={{ transform: em(pivo) }}>
      <div ref={giro} className={styles.no}>
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
 * O jogador inteiro, com a origem nos pés e y negativo para cima, em texels,
 * como o modelo do jogo. `slim` é o modelo de braços de 3 texels (Alex); o largo
 * (Steve) tem 4.
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
  const oy = slim ? -21.5 : -22;

  return (
    <div ref={nos.corpo} className={styles.boneco}>
      <Parte pivo={[0, -24, 0]} giro={nos.cabeca}>
        <Caixa uv={[0, 0]} tam={[8, 8, 8]} centro={[0, -4, 0]} />
        <Caixa uv={[32, 0]} tam={[8, 8, 8]} centro={[0, -4, 0]} infla={0.5} />
      </Parte>
      <Parte pivo={[0, -24, 0]}>
        <Caixa uv={[16, 16]} tam={[8, 12, 4]} centro={[0, 6, 0]} />
        <Caixa uv={[16, 32]} tam={[8, 12, 4]} centro={[0, 6, 0]} infla={0.25} />
      </Parte>
      {/* nos braços são três giros: o do andar (JS), o da respiração (CSS) e,
          no direito, o dos gestos; um `transform` por nó, senão um apaga o outro */}
      <Parte pivo={[-5, oy, 0]} giro={nos.bracoD}>
        <div className={`${styles.no} ${styles.respiraD}`}>
          <div className={`${styles.no} ${styles.gesto}`}>
            <Caixa uv={[40, 16]} tam={[bw, 12, 4]} centro={[-bx, 4, 0]} />
            <Caixa uv={[40, 32]} tam={[bw, 12, 4]} centro={[-bx, 4, 0]} infla={0.25} />
          </div>
        </div>
      </Parte>
      <Parte pivo={[5, oy, 0]} giro={nos.bracoE}>
        <div className={`${styles.no} ${styles.respiraE}`}>
          <Caixa uv={[32, 48]} tam={[bw, 12, 4]} centro={[bx, 4, 0]} />
          <Caixa uv={[48, 48]} tam={[bw, 12, 4]} centro={[bx, 4, 0]} infla={0.25} />
        </div>
      </Parte>
      <Parte pivo={[-1.9, -12, 0]} giro={nos.pernaD}>
        <Caixa uv={[0, 16]} tam={[4, 12, 4]} centro={[0, 6, 0]} />
        <Caixa uv={[0, 32]} tam={[4, 12, 4]} centro={[0, 6, 0]} infla={0.25} />
      </Parte>
      <Parte pivo={[1.9, -12, 0]} giro={nos.pernaE}>
        <Caixa uv={[16, 48]} tam={[4, 12, 4]} centro={[0, 6, 0]} />
        <Caixa uv={[0, 48]} tam={[4, 12, 4]} centro={[0, 6, 0]} infla={0.25} />
      </Parte>
      {capa && (
        <Parte pivo={[0, -24, -2]}>
          {/* a capa é modelada de frente para o corpo e virada para trás */}
          <div className={`${styles.no} ${styles.capa}`}>
            <Caixa capa uv={[0, 0]} tam={[10, 16, 1]} centro={[0, 8, 0.5]} />
          </div>
        </Parte>
      )}
    </div>
  );
});
