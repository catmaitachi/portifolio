import { urlExterna } from '~/content';
import type { Projetos, Repositorio } from '~/data/types';
import { useT } from '~/i18n/useLanguage';
import comum from '../section.module.css';
import { nomeLegivel } from './nome';
import styles from './ProjectCard.module.css';
import type { Geometria } from './useOrbit';

/** Linguagens com nome na legenda; o resto vira o último trecho da barra, sem nome. */
const MAX_LINGUAGENS = 3;
/** Tópicos na linha sob a descrição. Mais que isso vira parágrafo. */
const MAX_TOPICOS = 4;

/** `2026-09-09T20:45:28Z` vira `2026.09`, o ano.mês do resto da página. */
const anoMes = (iso: string) => iso.slice(0, 7).replace('-', '.');

/** Fração de linguagem em porcentagem, sem mentir que um resto de 0,3% é zero. */
const porcento = (f: number) => (f < 0.01 ? '<1%' : `${Math.round(f * 100)}%`);

type Janela = Projetos['janela'];

interface ProjectCardProps {
  repo: Repositorio;
  /** os doze meses que o código de barras cobre, iguais para todos os cartões */
  janela: Janela;
  indice: number;
  geo: Geometria;
  /** seção ativa: dispara a entrada do cartão, escalonada por `geo.ordem` */
  ativo: boolean;
  /** clique num cartão lateral: traz ele para a frente */
  onFocar: () => void;
}

/**
 * O código de barras do bilhete: **um traço por commit**, no dia em que ele
 * aconteceu dentro da janela de doze meses.
 *
 * Não há contagem nem escala. Um mês parado é espaço vazio, um mês intenso é
 * uma faixa cheia, e o desenho diz o ritmo do repositório só com a posição dos
 * traços, como um código de barras de verdade diz o número só com a largura
 * das faixas. Um `<path>` só para todos, com `non-scaling-stroke`: o desenho
 * estica na largura do cartão e o traço continua com 1px.
 */
function CodigoDeBarras({ datas, janela }: { datas: string[]; janela: Janela }) {
  const de = Date.parse(janela.de);
  const largura = Math.max(1, Date.parse(janela.ate) - de);
  const tracos = datas
    .map((d) => {
      const x = ((Date.parse(d) - de) / largura) * 1000;
      return x >= 0 && x <= 1000 ? `M${x.toFixed(1)} 0V40` : '';
    })
    .join('');

  return (
    <svg className={styles.barras} viewBox="0 0 1000 40" preserveAspectRatio="none" aria-hidden="true">
      <path className={styles.base} d="M0 40H1000" />
      {tracos ? <path d={tracos} /> : null}
    </svg>
  );
}

/**
 * As linguagens: uma barra de 1px dividida pelo tamanho de cada uma, e a legenda
 * embaixo com as três maiores.
 */
function Linguagens({ lista }: { lista: Repositorio['linguagens'] }) {
  const nomeadas = lista.slice(0, MAX_LINGUAGENS);
  const resto = Math.max(0, 1 - nomeadas.reduce((soma, l) => soma + l.fracao, 0));

  return (
    <div className={styles.linguagens}>
      <span className={styles.barra} aria-hidden="true">
        {nomeadas.map((l) => (
          <span key={l.nome} style={{ flexGrow: l.fracao }} />
        ))}
        {resto >= 0.005 ? <span style={{ flexGrow: resto }} /> : null}
      </span>
      <span className={styles.legenda}>
        {nomeadas.map((l) => (
          <span key={l.nome} className={styles.lingua}>
            <span className={styles.amostra} aria-hidden="true" />
            {l.nome}
            <span className={styles.fracao}>{porcento(l.fracao)}</span>
          </span>
        ))}
      </span>
    </div>
  );
}

/**
 * Um cartão da órbita, desenhado como **bilhete de uma missão**.
 *
 * O corpo, à esquerda, é o que o repositório é: o número do cartão, o dono e o
 * nome, a descrição, os tópicos, o código de barras de commits e as linguagens.
 * O canhoto, à direita, é uma peça à parte, a um espaço do corpo, e é o que se
 * confere nele: os dados e as portas de saída, o código e o projeto no ar. É a divisão de um bilhete de
 * verdade, em que a parte grande diz para onde e a pequena diz o que carimbar,
 * e ela resolve o que um cartão em pé resolvia mal: com a leitura deitada, o
 * texto corre em linhas longas e os números ficam numa coluna só, onde o olho
 * os encontra sem procurar.
 *
 * **Estrela e fork só aparecem quando existem**: um "0" em cada cartão de
 * projeto pessoal diria menos sobre o projeto do que sobre a contagem.
 *
 * O cartão não é um botão (ver `acessibilidade.md`): os links são os únicos
 * elementos interativos dele, e só o da frente responde. Quem navega por
 * teclado troca de projeto pelas setas ou pelos traços-índice; o clique num
 * cartão lateral continua existindo para o mouse.
 */
export function ProjectCard({ repo, janela, indice, geo, ativo, onFocar }: ProjectCardProps) {
  const t = useT();
  const rotulo = String(indice + 1).padStart(2, '0');
  const dono = repo.id.split('/')[0];
  const topicos = repo.topicos.slice(0, MAX_TOPICOS);
  // os links só são alcançáveis no cartão da frente; nos laterais o clique é do cartão
  const alcance = geo.naFrente ? 0 : -1;

  const dados: [string, string | number][] = [
    [t.projetos.rotulos.commits, repo.commits],
    ...(repo.estrelas > 0 ? [[t.projetos.rotulos.estrelas, repo.estrelas] as [string, number]] : []),
    ...(repo.forks > 0 ? [[t.projetos.rotulos.forks, repo.forks] as [string, number]] : []),
    [t.projetos.rotulos.desde, anoMes(repo.criadoEm)],
    [t.projetos.rotulos.atualizado, anoMes(repo.atualizadoEm)],
  ];

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
        data-frente={geo.naFrente || undefined}
        data-entrada={ativo || undefined}
        // o da frente já está onde deveria: só os laterais respondem ao clique
        onClick={geo.naFrente ? undefined : onFocar}
      >
        <div className={styles.corpo}>
          <div className={styles.topo}>
            {/* a posição na órbita, que os traços-índice embaixo já dizem a quem lê a tela */}
            <span className={styles.indice} aria-hidden="true">
              {rotulo}
            </span>
            <span className={styles.dono}>{dono} /</span>
            {repo.arquivado ? (
              <span className={`${comum.estado} ${styles.arquivado}`}>{t.projetos.arquivado}</span>
            ) : null}
          </div>

          <h3 className={styles.nome}>{nomeLegivel(repo.nome)}</h3>
          {repo.descricao ? <span className={styles.linha}>{repo.descricao}</span> : null}

          {/* tópicos como texto único: um `map` aninhado aqui só geraria nós a mais */}
          {topicos.length ? <span className={styles.stack}>{topicos.join('  ·  ')}</span> : null}

          <div className={styles.ritmo}>
            <CodigoDeBarras datas={repo.datasRecentes} janela={janela} />
            <span className={styles.ritmoLegenda}>
              <span>{anoMes(janela.de)}</span>
              <span>{t.projetos.atividade}</span>
              <span>{anoMes(janela.ate)}</span>
            </span>
          </div>

          {repo.linguagens.length ? <Linguagens lista={repo.linguagens} /> : null}
        </div>

        {/**
         * O canhoto: os dados e os links.
         *
         * Os links fecham a leitura, e não a abrem: quem chega a eles já passou
         * pelo nome, pela descrição e pelos números. Eles são desenhados em todos
         * os cartões para que a geometria seja a mesma no meio do giro.
         */}
        <div className={styles.canhoto}>
          <div className={styles.dados}>
            {dados.map(([nome, valor]) => (
              <span key={nome} className={styles.dado}>
                <span className={styles.rotulo}>{nome}</span>
                <span className={styles.valor}>{valor}</span>
              </span>
            ))}
          </div>

          <div className={styles.links}>
            <a
              className={styles.link}
              href={repo.url}
              target="_blank"
              rel="noreferrer"
              tabIndex={alcance}
            >
              {t.projetos.codigo}
            </a>
            {repo.site ? (
              <a
                className={styles.link}
                href={urlExterna(repo.site)}
                target="_blank"
                rel="noreferrer"
                tabIndex={alcance}
              >
                {t.projetos.aoVivo}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
