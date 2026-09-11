import { LOGO_ESCALAS, LOGOS, type Formacao } from '~/content';
import { useInclinacao } from '~/hooks/useInclinacao';
import { useT } from '~/i18n/useLanguage';
import comum from '../section.module.css';
import styles from './DiplomaCard.module.css';

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
  /** ordem de entrada na faixa, da esquerda para a direita */
  ordem: number;
  /** seção ativa: dispara a entrada, escalonada por `ordem` */
  ativo: boolean;
  /** a segunda volta da faixa, que existe só para o laço fechar sem salto */
  copia?: boolean;
}

/**
 * Um crachá de formação.
 *
 * Ele era um cartão deitado, na proporção de um diploma, e virou um **retângulo
 * em pé**: logo grande no alto, o nível embaixo dele, o curso no miolo e o dado
 * no pé. É a forma de um crachá, e ela resolve dois problemas de uma vez. O
 * primeiro é de leitura: cada peça ganha uma faixa inteira em vez de dividir uma
 * linha com as outras. O segundo é da seção: numa faixa que anda de lado, cartão
 * estreito é cartão que cabe, e três deles aparecem por inteiro onde antes cabia
 * um.
 *
 * O **furo da fita** no alto é o que faz a forma ser reconhecida como crachá, e
 * é um risco de 1px como todo o resto da página. Ele substituiu a moldura dupla,
 * que era a gramática de um certificado e deixou de valer quando o cartão trocou
 * de forma.
 *
 * Tudo o que o conteúdo tem continua na tela ao mesmo tempo: a instituição (no
 * logo), o nível, o curso, o estado num selo, o dado que o estado produz, a
 * fração em número e a posição na lista. Nada aqui depende de ponteiro.
 *
 * O que o ponteiro faz é **inclinar o crachá** (`useInclinacao`), com o brilho
 * especular do retrato do Sobre. Os graus são menores que os de lá: uma carta de
 * 236 por 348 gira muito mais tela que um retrato, e o mesmo ângulo que ali lê
 * como carta na mão aqui lê como página virando.
 */
export function DiplomaCard({ formacao, indice, total, ordem, ativo, copia }: DiplomaCardProps) {
  const t = useT();
  const { alvoRef, brilhoRef } = useInclinacao<HTMLElement>({ grauX: 9, grauY: 11, escala: 1.03 });
  const vaga = formacao.estado === 'pretensao';
  const logo = LOGOS[formacao.slot];
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
      ref={alvoRef}
      className={styles.cracha}
      style={{ '--ordem': ordem } as React.CSSProperties}
      data-estado={formacao.estado}
      data-entrada={ativo || undefined}
      // a cópia é a mesma formação de novo: o leitor de tela lê a lista uma vez
      aria-hidden={copia || undefined}
    >
      <span ref={brilhoRef} className={comum.brilho} aria-hidden="true" />
      <span className={styles.furo} aria-hidden="true" />

      {vaga ? (
        /**
         * A pretensão é um **cartão vago**: o nível e o selo, e nada mais.
         *
         * Instituição, curso, logo e medidor detalhavam uma coisa que ainda não
         * existe, e o detalhe dava a ela o mesmo peso das duas que existem. Vaga,
         * ela diz só a direção.
         */
        <div className={styles.vaga}>
          <span className={styles.vagaNivel}>{formacao.nivel}</span>
          <span className={styles.selo}>{t.formacoes.estados[formacao.estado]}</span>
        </div>
      ) : (
        <>
          {/**
           * O nome da instituição mora **no logo**, e só nele.
           *
           * Os logos já trazem o nome desenhado, e o nome escrito embaixo repetia a
           * mesma palavra a um centímetro de distância. Ele fica como o nome
           * acessível do logo, que é o alt de uma imagem de fundo, e volta a ser
           * escrito só quando a formação não tem logo: sem isso ela ficaria sem
           * nome na tela.
           */}
          {logo ? (
            <span
              className={styles.logo}
              role="img"
              aria-label={formacao.instituicao}
              style={{
                backgroundImage: `url("${logo}")`,
                transform: `scale(${LOGO_ESCALAS[formacao.slot]?.escala ?? 1})`,
              }}
            />
          ) : null}

          <div className={styles.titulos}>
            {logo ? null : <span className={styles.instituicao}>{formacao.instituicao}</span>}
            <span className={styles.nivel}>{formacao.nivel}</span>
          </div>

          <span className={styles.selo}>{t.formacoes.estados[formacao.estado]}</span>

          <span className={styles.curso}>{formacao.curso}</span>

          <div className={styles.rodape}>
            <div className={styles.linhaDado}>
              <span className={styles.ordinal}>
                {String(indice + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
              </span>

              {detalhe && (
                <span className={styles.dado}>
                  <span className={styles.rotulo}>{rotulo}</span>
                  <span className={styles.valor}>{detalhe}</span>
                </span>
              )}
            </div>

            <span className={`${comum.medidor} ${styles.medidor}`}>
              <span className={comum.trilha}>
                <span
                  className={comum.preenchimento}
                  style={{ width: `${Math.round(parte * 100)}%` }}
                />
              </span>
              <span className={styles.parte}>{Math.round(parte * 100)}%</span>
            </span>
          </div>
        </>
      )}
    </article>
  );
}
