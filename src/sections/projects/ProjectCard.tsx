import { Figure } from '~/components/Figure';
import { BANNERS, type Projeto, urlExterna } from '~/content';
import { useT } from '~/i18n/useLanguage';
import comum from '../section.module.css';
import styles from './ProjectCard.module.css';
import type { Geometria } from './useOrbit';

/**
 * Marcador geométrico por projeto: dois contornos de 1px com raio e rotação
 * próprios. Dá identidade visual ao cartão sem inventar cor nem ícone — o
 * índice do projeto escolhe qual dos quatro sai.
 */
const GLIFOS = [
  { r: '50%', rot: '0deg', r2: '0px', rot2: '45deg' },
  { r: '0px', rot: '45deg', r2: '50%', rot2: '0deg' },
  { r: '2px', rot: '0deg', r2: '2px', rot2: '45deg' },
  { r: '50%', rot: '0deg', r2: '50%', rot2: '0deg' },
] as const;

interface ProjectCardProps {
  projeto: Projeto;
  indice: number;
  geo: Geometria;
  /** seção ativa: dispara a entrada do cartão, escalonada por `geo.ordem` */
  ativo: boolean;
  /** clique num cartão lateral: traz ele para a frente */
  onFocar: () => void;
}

/**
 * Um cartão da órbita.
 *
 * **Não há mais painel de descrição, e o cartão deixou de ser um botão.** O que
 * o projeto é cabe no que já está na frente: nome, uma linha de resumo, ano,
 * papel, stack, o estado e o link para ver ao vivo. Um texto longo escondido
 * atrás de um clique era conteúdo oculto num site que não tem nenhum outro, e a
 * própria página é o portfólio: o lugar de contar o projeto por extenso é o
 * projeto.
 *
 * Isso resolveu de graça o defeito de acessibilidade que estava anotado em
 * `pendencias.md`: o cartão era `role="button"` com um link dentro, o que ARIA
 * não permite. Agora o único elemento interativo aqui é o link, e ele só
 * responde no cartão da frente. Quem navega por teclado troca de projeto pelas
 * setas ou pelos traços-índice, que são botões de verdade; o clique num cartão
 * lateral continua existindo para o mouse, que nunca teve esse problema.
 */
export function ProjectCard({ projeto, indice, geo, ativo, onFocar }: ProjectCardProps) {
  const t = useT();
  // "a definir" é uma vaga reservada: gira na órbita e não tem para onde levar
  const vaga = projeto.estado === 'definir';
  const glifo = GLIFOS[indice % GLIFOS.length];
  const rotulo = String(indice + 1).padStart(2, '0');
  const preenchido = projeto.estado === 'ativo' || projeto.estado === 'arquivado';
  // `url` vazia esconde o link; sem esquema, o href viraria caminho relativo
  const aoVivo = urlExterna(projeto.url);

  return (
    <article
      className={styles.orbe}
      style={{
        zIndex: geo.camada,
        transform: `translateX(${geo.orbitaX}) rotateY(${geo.giro}) scale(${geo.escala})`,
        opacity: geo.foco,
      }}
    >
      <div
        className={styles.cartao}
        style={{ '--ordem': geo.ordem } as React.CSSProperties}
        data-vaga={vaga || undefined}
        data-frente={geo.naFrente || undefined}
        data-entrada={ativo || undefined}
        // o da frente já está onde deveria: só os laterais respondem ao clique
        onClick={geo.naFrente ? undefined : onFocar}
      >
        <div className={styles.banner}>
          <Figure
            src={projeto.banner ? BANNERS[projeto.banner] : undefined}
            alt=""
            placeholder={t.projetos.banner}
            fit="cover"
          />
          <span className={styles.scrim} aria-hidden="true" />
          <div className={styles.bannerTopo} aria-hidden="true">
            <span className={styles.numero}>{rotulo}</span>
            <span className={styles.glifo}>
              <span style={{ borderRadius: glifo.r, transform: `rotate(${glifo.rot})` }} />
              <span style={{ borderRadius: glifo.r2, transform: `rotate(${glifo.rot2})` }} />
            </span>
          </div>
        </div>

        <div className={styles.corpo}>
          <div className={styles.tituloBloco}>
            <h3 className={styles.nome}>{projeto.nome}</h3>
            <span className={styles.linha}>{projeto.linha}</span>
          </div>

          <div className={styles.meta}>
            <span>{projeto.ano}</span>
            <span>{projeto.papel}</span>
          </div>

          {/* stack como texto único: um `map` aninhado aqui só geraria nós a mais */}
          <span className={styles.stack}>{projeto.stack.join('  ·  ')}</span>

          {/**
           * O link fica na frente do cartão, que é o único lugar onde ele pode
           * ficar depois que o painel saiu.
           *
           * Ele é desenhado nos três cartões para que a altura do corpo seja a
           * mesma em todos — renderizado só no da frente, o cartão mudaria de
           * geometria no meio do giro. Fora da frente ele sai da tabulação e do
           * ponteiro, e é o clique do cartão lateral que responde ali.
           */}
          {aoVivo ? (
            <a
              className={styles.aoVivo}
              href={aoVivo}
              target="_blank"
              rel="noreferrer"
              tabIndex={geo.naFrente ? 0 : -1}
            >
              {t.projetos.aoVivo}
            </a>
          ) : null}

          <div className={`${comum.medidor} ${styles.rodape}`}>
            <span className={comum.trilha}>
              <span className={comum.preenchimento} style={{ width: preenchido ? '100%' : '0%' }} />
            </span>
            <span className={comum.estado}>{t.projetos.estados[projeto.estado]}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
