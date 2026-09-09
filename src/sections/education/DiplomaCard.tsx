import { LOGO_ESCALAS, LOGOS, type Formacao } from '~/content';
import { useT } from '~/i18n/useLanguage';
import comum from '../section.module.css';
import styles from './DiplomaCard.module.css';
import type { GeometriaDeck } from './useDeck';

/**
 * Quanto da formação já aconteceu, em porcentagem.
 *
 * `cursando` é a **fração real** (`feito/total`), não um meio-termo decorativo:
 * a barra diz alguma coisa, e diz o tempo todo. Sem `progresso` no conteúdo ela
 * cai nos 50% de antes, que é o "em algum ponto do caminho".
 */
function fracao(f: Formacao): number {
  if (f.estado === 'concluido') return 1;
  if (f.estado === 'pretensao') return 0;
  const p = f.progresso;
  if (!p || p.total <= 0) return 0.5;
  return Math.min(1, Math.max(0, p.feito / p.total));
}

interface DiplomaCardProps {
  formacao: Formacao;
  /** posição na lista, para o `01 / 03` do rodapé */
  indice: number;
  total: number;
  geo: GeometriaDeck;
  /** seção ativa: dispara a entrada, escalonada por `geo.ordem` */
  ativo: boolean;
  onFocar: () => void;
}

/**
 * Um diploma da pilha.
 *
 * O badge que existia aqui era uma etiqueta de 312px em que a data e a fração
 * ficavam **escondidas atrás da barra**, e só o hover as revelava. Num cartão
 * deste tamanho não há motivo para esconder nada, então tudo que o conteúdo tem
 * está na tela: instituição, nível, curso, o estado num selo, o dado que o
 * estado produz (a conclusão ou as etapas), a fração em número e a posição na
 * pilha.
 *
 * Duas coisas dão a leitura de diploma, e as duas são de régua, não de ornamento:
 * a **moldura dupla**, um risco de 1px correndo por dentro do outro, e o **selo**
 * no alto à direita, que é onde um certificado carimba o que ele certifica.
 * Selo de fita, brasão ou serifa seriam formas que não existem em nenhum outro
 * lugar da página.
 *
 * Como em Projetos, o `transform` da pilha mora no elemento **de fora** e a
 * animação de entrada no de dentro: uma animação de `transform` no mesmo
 * elemento apagaria a posição escrita pelo JS enquanto roda.
 */
export function DiplomaCard({ formacao, indice, total, geo, ativo, onFocar }: DiplomaCardProps) {
  const t = useT();
  const parte = fracao(formacao);
  const detalhe =
    formacao.estado === 'concluido'
      ? formacao.conclusao
      : formacao.estado === 'cursando' && formacao.progresso
        ? `${formacao.progresso.feito}/${formacao.progresso.total}`
        : null;
  const rotulo =
    formacao.estado === 'concluido' ? t.formacoes.rotulos.conclusao : t.formacoes.rotulos.periodos;

  return (
    <article
      className={styles.vaga}
      style={{
        zIndex: geo.camada,
        transform: `translateY(${geo.deslocamento}) scale(${geo.escala})`,
        opacity: geo.opacidade,
      }}
      aria-hidden={!geo.visivel || undefined}
    >
      <div
        className={styles.diploma}
        style={{ '--ordem': geo.ordem } as React.CSSProperties}
        data-estado={formacao.estado}
        data-frente={geo.naFrente || undefined}
        data-entrada={ativo || undefined}
        role="button"
        // o que está fora da pilha sai da tabulação, como em toda a página
        tabIndex={geo.visivel ? 0 : -1}
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
        <div className={styles.topo}>
          <span
            className={styles.logo}
            role="img"
            aria-label={formacao.instituicao}
            style={{
              backgroundImage: LOGOS[formacao.slot] ? `url("${LOGOS[formacao.slot]}")` : undefined,
              transform: `scale(${LOGO_ESCALAS[formacao.slot]?.escala ?? 1})`,
            }}
          />

          <div className={styles.titulos}>
            <span className={styles.instituicao}>{formacao.instituicao}</span>
            <span className={styles.nivel}>{formacao.nivel}</span>
          </div>

          <span className={styles.selo}>{t.formacoes.estados[formacao.estado]}</span>
        </div>

        <span className={styles.curso}>{formacao.curso}</span>

        <div className={styles.rodape}>
          <span className={styles.ordinal}>
            {String(indice + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </span>

          {detalhe && (
            <span className={styles.dado}>
              <span className={styles.rotulo}>{rotulo}</span>
              <span className={styles.valor}>{detalhe}</span>
            </span>
          )}

          {/**
           * O medidor toma o resto da linha, e por isso a porcentagem fica
           * encostada na borda direita do diploma: ela é o fecho da leitura, não
           * um número solto no meio do rodapé.
           */}
          <span className={`${comum.medidor} ${styles.medidor}`}>
            <span className={comum.trilha}>
              <span
                className={comum.preenchimento}
                style={{ width: `${Math.round(parte * 100)}%` }}
              />
            </span>
            {/* a pretensão não tem fração para mostrar, e um "0%" leria como defeito */}
            {formacao.estado !== 'pretensao' && (
              <span className={styles.parte}>{Math.round(parte * 100)}%</span>
            )}
          </span>
        </div>
      </div>
    </article>
  );
}
