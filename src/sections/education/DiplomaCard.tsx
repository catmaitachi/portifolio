import { LOGO_ESCALAS, LOGOS, type Formacao } from '~/content';
import { useT } from '~/i18n/useLanguage';
import comum from '../section.module.css';
import styles from './DiplomaCard.module.css';
import type { GeometriaDeck } from './useDeck';

/**
 * Preenchimento da barra, em porcentagem.
 *
 * `cursando` é a **fração real** (`feito/total`), não um meio-termo decorativo:
 * a barra diz alguma coisa, e diz o tempo todo. Sem `progresso` no conteúdo ela
 * cai nos 50% de antes, que é o "em algum ponto do caminho".
 */
function preenchimento(f: Formacao): string {
  if (f.estado === 'concluido') return '100%';
  if (f.estado === 'pretensao') return '0%';
  const p = f.progresso;
  if (!p || p.total <= 0) return '50%';
  return `${Math.round(Math.min(1, Math.max(0, p.feito / p.total)) * 100)}%`;
}

/**
 * O detalhe da barra: a data de conclusão ou a fração do curso.
 *
 * Fica **fora do i18n** pelo mesmo motivo da versão no rodapé: "2022.12" e "4/8"
 * são dados, idênticos nos dois idiomas. Sem dado no conteúdo, o diploma
 * simplesmente não tem detalhe.
 */
function detalhe(f: Formacao): string | null {
  if (f.estado === 'concluido') return f.conclusao ?? null;
  if (f.estado === 'cursando' && f.progresso) return `${f.progresso.feito}/${f.progresso.total}`;
  return null;
}

interface DiplomaCardProps {
  formacao: Formacao;
  geo: GeometriaDeck;
  /** seção ativa: dispara a entrada, escalonada por `geo.ordem` */
  ativo: boolean;
  onFocar: () => void;
}

/**
 * Um diploma da pilha.
 *
 * O badge que existia aqui era uma etiqueta de 312px, e virou um cartão de
 * carta: logo grande à esquerda, instituição e nível no alto, curso em corpo de
 * leitura e o medidor no pé, com a data ou a fração **sempre visíveis** — no
 * badge elas ficavam escondidas atrás da barra e só o hover as revelava, o que
 * num cartão deste tamanho seria esconder o que já cabe.
 *
 * A moldura é dupla, um risco de 1px por dentro do outro, que é o que separa um
 * diploma de um cartão qualquer. O interno usa os mesmos cantos chanfrados,
 * menores, para os dois acompanharem o corte.
 *
 * Como em Projetos, o `transform` da pilha mora no elemento **de fora** e a
 * animação de entrada no de dentro: uma animação de `transform` no mesmo
 * elemento apagaria a posição escrita pelo JS enquanto roda.
 */
export function DiplomaCard({ formacao, geo, ativo, onFocar }: DiplomaCardProps) {
  const t = useT();
  const extra = detalhe(formacao);

  return (
    <article
      className={styles.vaga}
      style={{
        zIndex: geo.camada,
        transform: `translateY(${geo.pilhaY}) rotateX(${geo.giro}) scale(${geo.escala})`,
        opacity: geo.opacidade,
      }}
    >
      <div
        className={styles.diploma}
        style={{ '--ordem': geo.ordem } as React.CSSProperties}
        data-estado={formacao.estado}
        data-frente={geo.naFrente || undefined}
        data-entrada={ativo || undefined}
        role="button"
        tabIndex={0}
        aria-current={geo.naFrente ? 'true' : undefined}
        aria-label={`${formacao.instituicao}, ${formacao.curso}`}
        onClick={onFocar}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          e.preventDefault();
          // impede que o Espaço role a página e que a seta chegue ao palco
          e.stopPropagation();
          onFocar();
        }}
      >
        <span
          className={styles.logo}
          role="img"
          aria-label={formacao.instituicao}
          style={{
            backgroundImage: LOGOS[formacao.slot] ? `url("${LOGOS[formacao.slot]}")` : undefined,
            transform: `scale(${LOGO_ESCALAS[formacao.slot]?.escala ?? 1})`,
          }}
        />

        <div className={styles.corpo}>
          <div className={styles.linhaTopo}>
            <span className={styles.instituicao}>{formacao.instituicao}</span>
            <span className={styles.nivel}>{formacao.nivel}</span>
          </div>

          <span className={styles.curso}>{formacao.curso}</span>

          <div className={comum.medidor}>
            <span className={comum.trilha}>
              <span className={comum.preenchimento} style={{ width: preenchimento(formacao) }} />
            </span>
            {extra && <span className={styles.detalhe}>{extra}</span>}
            <span className={comum.estado}>{t.formacoes.estados[formacao.estado]}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
