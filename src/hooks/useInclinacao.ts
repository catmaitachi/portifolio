import { useEffect, useRef } from 'react';
import { useReducedMotion } from './useReducedMotion';

export interface OpcoesInclinacao {
  /** graus de rotação no eixo X, o que levanta a borda de cima ou a de baixo */
  grauX: number;
  /** graus no eixo Y, o que traz um dos lados para a frente */
  grauY: number;
  escala: number;
  /** distância do olho, em px: quanto menor, mais forte a perspectiva */
  perspectiva: number;
  /** quanto o efeito leva para chegar ao máximo depois que o ponteiro entra */
  entrada: number;
  /** a sombra que acompanha a inclinação; só vale onde haja fundo que a mostre */
  sombra: boolean;
}

const PADRAO: OpcoesInclinacao = {
  grauX: 15,
  grauY: 17,
  escala: 1.045,
  perspectiva: 900,
  entrada: 320,
  sombra: false,
};

/**
 * A carta que inclina seguindo o ponteiro, com um brilho especular acompanhando.
 *
 * Nasceu no retrato do Sobre e virou hook porque passou a valer para os crachás
 * de formação, os pôsteres de Filmes, as artes de Jogos e a capa de Música:
 * cinco cópias do mesmo rAF sairiam de sincronia na primeira calibragem, e é a
 * mesma razão pela qual a gravidade e o desenho da estrela moram num módulo só no
 * motor.
 *
 * **Escreve direto no `style`**, dentro de um rAF coalescido. Um `setState` por
 * `pointermove` re-renderizaria a seção inteira dezenas de vezes por segundo
 * para mudar dois números de `transform`.
 *
 * **A entrada é uma rampa, e essa é a diferença para a primeira versão.** Antes,
 * o primeiro `pointermove` já escrevia a inclinação cheia e a escala cheia, e
 * como só a sombra tinha transição, o elemento saltava do repouso para o máximo
 * num quadro. Agora um fator vai de 0 a 1 em `entrada` milissegundos e multiplica
 * os três valores, com uma curva suave nas duas pontas (`f²(3−2f)`): o cartão
 * começa a levantar devagar, ganha velocidade no meio e assenta no fim.
 *
 * A rampa **precisa** viver no rAF, e não numa `transition` de `transform`: uma
 * transição também suavizaria o retorno de cada micromovimento do cursor, e a
 * inclinação deixaria de colar nele. Quem sai continua voltando por `transition`,
 * porque ali não há ponteiro para seguir.
 *
 * **A transição de retorno é do CSS, e o hook só a desliga.** Cada cartão declara
 * a sua (`transform var(--inclina-t, var(--dur-retorno))`), e com o ponteiro em
 * cima o hook escreve `--inclina-t: 0s`. Antes ele escrevia a `transition`
 * inteira no `style`, o que apagava as outras transições do cartão: depois do
 * primeiro hover, a opacidade dos pôsteres de Filmes e das capas de Jogos passava
 * a saltar em vez de acender, e a curva e a duração do retorno moravam numa
 * string aqui, fora dos tokens.
 *
 * **Sem `will-change`.** Uma transformação 3D ganha camada própria no compositor
 * quando acontece. Declarada o tempo todo, a promessa reservava uma camada para
 * cada cartão da página, em todas as seções montadas, e o celular pagava por
 * todas sem nunca inclinar nenhuma.
 *
 * **A perspectiva vai na própria `transform`**, e não como `perspective` do pai.
 * Assim o efeito não pede um elemento de embrulho, o que importa para os cartões
 * que já vivem dentro de uma grade ou de uma faixa e não têm um pai só seu.
 *
 * **Toque não inclina.** Sem `hover` não há de onde o efeito nascer, e o dedo
 * que arrasta uma faixa de pôsteres passaria por cima de vários cartões
 * levantando cada um deles pelo caminho.
 */
export function useInclinacao<T extends HTMLElement = HTMLDivElement>(
  opcoes: Partial<OpcoesInclinacao> = {},
) {
  const alvoRef = useRef<T>(null);
  const brilhoRef = useRef<HTMLSpanElement>(null);
  const semMovimento = useReducedMotion();

  const { grauX, grauY, escala, perspectiva, entrada, sombra } = { ...PADRAO, ...opcoes };

  useEffect(() => {
    const alvo = alvoRef.current;
    if (!alvo || semMovimento) return;
    const brilho = brilhoRef.current;

    let px = 0.5;
    let py = 0.5;
    let dentro = false;
    let pendente = 0;
    let comeco = 0;

    const aplicar = (f: number) => {
      const rx = (0.5 - py) * grauX * f;
      const ry = (px - 0.5) * grauY * f;
      const s = 1 + (escala - 1) * f;
      alvo.style.transform = `perspective(${perspectiva}px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) scale(${s.toFixed(4)})`;
      if (sombra) {
        // a sombra acompanha a inclinação, como se a luz viesse de cima
        alvo.style.boxShadow = f
          ? `${(-ry * 1.4).toFixed(1)}px ${(rx * 1.4 + 16 * f).toFixed(1)}px 46px -18px rgba(0,0,0,.95)`
          : 'none';
      }
      if (brilho) {
        brilho.style.setProperty('--bx', `${(px * 100).toFixed(1)}%`);
        brilho.style.setProperty('--by', `${(py * 100).toFixed(1)}%`);
        brilho.style.opacity = f.toFixed(3);
      }
    };

    const quadro = (agora: number) => {
      pendente = 0;
      if (!dentro) return;
      if (!comeco) comeco = agora;
      const bruto = Math.min(1, (agora - comeco) / entrada);
      // suave nas duas pontas: o cartão não arranca nem trava ao chegar
      aplicar(bruto * bruto * (3 - 2 * bruto));
      if (bruto < 1 && !pendente) pendente = requestAnimationFrame(quadro);
    };

    const mover = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const r = alvo.getBoundingClientRect();
      px = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      py = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
      if (!dentro) {
        dentro = true;
        comeco = 0;
        // com o ponteiro dentro a inclinação cola no cursor: quem a suaviza é a
        // rampa, e a transição do CSS sai do caminho
        alvo.style.setProperty('--inclina-t', '0s');
      }
      if (!pendente) pendente = requestAnimationFrame(quadro);
    };

    const sair = () => {
      if (!dentro) return;
      dentro = false;
      comeco = 0;
      if (pendente) {
        cancelAnimationFrame(pendente);
        pendente = 0;
      }
      // o CSS volta a mandar, e o retorno ao repouso é a transição de lá
      alvo.style.removeProperty('--inclina-t');
      aplicar(0);
    };

    alvo.addEventListener('pointermove', mover);
    alvo.addEventListener('pointerleave', sair);
    alvo.addEventListener('pointercancel', sair);
    return () => {
      alvo.removeEventListener('pointermove', mover);
      alvo.removeEventListener('pointerleave', sair);
      alvo.removeEventListener('pointercancel', sair);
      alvo.style.removeProperty('--inclina-t');
      if (pendente) cancelAnimationFrame(pendente);
    };
  }, [semMovimento, grauX, grauY, escala, perspectiva, entrada, sombra]);

  return { alvoRef, brilhoRef };
}
