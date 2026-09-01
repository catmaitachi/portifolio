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
  aberto: boolean;
  /**
   * Se o cartão entra na tabulação.
   *
   * Com um painel aberto, só o cartão do painel é focável: os outros ficam
   * **atrás** dele, e tabular para um cartão que o visitante não consegue ver é
   * perder o foco no meio da tela. Continuam clicáveis — o mouse não tem esse
   * problema, e clicar num lateral segue girando a órbita.
   */
  focavel: boolean;
  onAlternar: () => void;
}

export function ProjectCard({
  projeto,
  indice,
  geo,
  aberto,
  focavel,
  onAlternar,
}: ProjectCardProps) {
  const t = useT();
  // "a definir" é uma vaga reservada: gira na órbita, mas não abre descrição
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
        data-vaga={vaga || undefined}
        data-frente={geo.naFrente || undefined}
        role="button"
        tabIndex={focavel ? 0 : -1}
        aria-expanded={aberto}
        aria-label={projeto.nome}
        onClick={onAlternar}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          e.preventDefault();
          // impede que o Espaço role a página e que a seta chegue ao palco
          e.stopPropagation();
          onAlternar();
        }}
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

          <div className={`${comum.medidor} ${styles.rodape}`}>
            <span className={comum.trilha}>
              <span className={comum.preenchimento} style={{ width: preenchido ? '100%' : '0%' }} />
            </span>
            <span className={comum.estado}>{t.projetos.estados[projeto.estado]}</span>
          </div>
        </div>

        {/**
         * A descrição cobre o cartão inteiro (`inset: 0`), subindo de baixo.
         * Fica dentro do cartão — por isso o cartão é `position: relative`.
         */}
        <div className={styles.descricao} data-aberto={aberto || undefined}>
          <div className={styles.descTopo}>
            <span className={styles.descNome}>{projeto.nome}</span>
            <span className={styles.descIndice}>{rotulo}</span>
          </div>
          <p className={styles.descTexto}>{projeto.descricao}</p>
          {aoVivo ? (
            <a
              className={styles.aoVivo}
              href={aoVivo}
              target="_blank"
              rel="noreferrer"
              /* só entra na tabulação quando o painel está aberto */
              tabIndex={aberto ? 0 : -1}
              onClick={(e) => e.stopPropagation()}
            >
              {t.projetos.aoVivo}
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}
