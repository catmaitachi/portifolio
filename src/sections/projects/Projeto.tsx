import { useCallback, useMemo, useState } from 'react';
import { format, urlExterna } from '~/content';
import type { Projetos, Repositorio } from '~/data/types';
import { useArrowKeys } from '~/hooks/useArrowKeys';
import { useReducedMotion } from '~/hooks/useReducedMotion';
import { useLanguage, useT } from '~/i18n/useLanguage';
import { qualidade } from '~/scene/qualidade';
import { Traco } from '../EstadoRemoto';
import comum from '../section.module.css';
import { nomeLegivel } from './nome';
import styles from './Projeto.module.css';

/** Linguagens com nome na legenda; o resto vira o último trecho da barra. */
const MAX_LINGUAGENS = 3;
/** Os degraus de branco dos trechos, da maior linguagem para o resto. */
const TONS = [1, 0.6, 0.36, 0.18];
/**
 * O nível da régua de qualidade abaixo do qual a sessão chega pausada. É o
 * `Q_RES` do motor: daí para baixo a cena já corta resolução do próprio céu, e
 * não é hora de abrir um segundo site ao lado dele.
 */
const NIVEL_MINIMO = 0.5;

/** `2026-09-09T20:45:28Z` vira `2026.09`, o ano.mês do resto da página. */
const anoMes = (iso: string) => iso.slice(0, 7).replace('-', '.');

/** Fração de linguagem em porcentagem, sem mentir que um resto de 0,3% é zero. */
const porcento = (f: number) => (f < 0.01 ? '<1%' : `${Math.round(f * 100)}%`);

/** A posição na seção, com dois dígitos: os destaques e as gavetas contam juntos. */
export const posicao = (i: number) => String(i + 1).padStart(2, '0');

const enderecoDe = (site: string) => site.replace(/^https?:\/\//, '').replace(/\/$/, '');

type Janela = Projetos['janela'];

/**
 * A máquina aguenta um site rodando ao lado da cena? Pergunta à régua de
 * qualidade: o nível que quem visita escolheu, ou o ideal que a cena mediu (o
 * nível em vigor, enquanto ela ainda mede). A taxa em 30 é o último recurso do
 * motor, e também responde que não.
 */
function maquinaAguenta(): boolean {
  const m = qualidade.ler();
  if (!m) return true;
  const nivel = m.manual ? m.q : (m.ideal ?? m.q);
  return nivel >= NIVEL_MINIMO && m.fps > 30;
}

/**
 * O código de barras dos commits: **um traço por commit**, no dia em que ele
 * aconteceu dentro da janela de doze meses. É o retrato de quem não tem site:
 * pequeno na linha da gaveta, e grande, com os meses riscados, dentro dela.
 *
 * Um `<path>` só para todos, com `non-scaling-stroke`: o desenho estica na
 * largura e o traço continua com 1px.
 */
function CodigoDeBarras({ datas, janela, altura, meses }: { datas: string[]; janela: Janela; altura: number; meses?: boolean }) {
  const de = Date.parse(janela.de);
  const largura = Math.max(1, Date.parse(janela.ate) - de);
  const tracos = datas
    .map((d) => {
      const x = ((Date.parse(d) - de) / largura) * 1000;
      return x >= 0 && x <= 1000 ? `M${x.toFixed(1)} 0V${altura}` : '';
    })
    .join('');
  const riscos = meses ? Array.from({ length: 11 }, (_, k) => `M${(((k + 1) / 12) * 1000).toFixed(1)} 0V${altura}`).join('') : '';

  return (
    <svg className={styles.barras} viewBox={`0 0 1000 ${altura}`} preserveAspectRatio="none" aria-hidden="true">
      {riscos ? <path className={styles.mes} d={riscos} /> : null}
      <path className={styles.base} d={`M0 ${altura}H1000`} />
      {tracos ? <path className={styles.tracos} d={tracos} /> : null}
    </svg>
  );
}

/**
 * As linguagens em trechos: uma barra dividida pelo tamanho de cada uma, um
 * degrau de branco por trecho (a paleta não tem outra coisa), e a legenda embaixo
 * com a mesma amostra ligando uma à outra. As três maiores têm nome; o resto vira
 * um último trecho, o mais apagado. Sem `titulo`, é só a barra.
 */
function Linguagens({ lista, titulo }: { lista: Repositorio['linguagens']; titulo?: string }) {
  const nomeadas = lista.slice(0, MAX_LINGUAGENS);
  const resto = Math.max(0, 1 - nomeadas.reduce((soma, l) => soma + l.fracao, 0));
  const trechos = resto >= 0.005 ? [...nomeadas.map((l) => l.fracao), resto] : nomeadas.map((l) => l.fracao);
  const barra = (
    <span className={styles.trechos} aria-hidden="true">
      {trechos.map((f, k) => (
        // o trecho é a posição dele na barra: não há identidade além dela
        <span key={k} style={{ flexGrow: f, '--tom': TONS[k], '--k': k } as React.CSSProperties} />
      ))}
    </span>
  );
  if (!titulo) return barra;

  return (
    <div className={styles.linguagens}>
      <span className={styles.rotulo}>{titulo}</span>
      {barra}
      <span className={styles.legenda}>
        {nomeadas.map((l, k) => (
          <span key={l.nome} className={styles.lingua}>
            <span className={styles.amostra} style={{ '--tom': TONS[k] } as React.CSSProperties} aria-hidden="true" />
            {l.nome}
            <span className={styles.fracao}>{porcento(l.fracao)}</span>
          </span>
        ))}
      </span>
    </div>
  );
}

/**
 * Os números do repositório. **Estrela e fork só aparecem quando existem**: um
 * "0" em cada projeto pessoal diria menos sobre o projeto do que sobre a contagem.
 */
function Dados({ repo }: { repo: Repositorio }) {
  const t = useT();
  const dados: [string, string | number][] = [
    [t.projetos.rotulos.commits, repo.commits],
    ...(repo.estrelas > 0 ? [[t.projetos.rotulos.estrelas, repo.estrelas] as [string, number]] : []),
    ...(repo.forks > 0 ? [[t.projetos.rotulos.forks, repo.forks] as [string, number]] : []),
    [t.projetos.rotulos.desde, anoMes(repo.criadoEm)],
    [t.projetos.rotulos.atualizado, anoMes(repo.atualizadoEm)],
  ];
  return (
    <dl className={styles.dados}>
      {dados.map(([rotulo, valor]) => (
        <div key={rotulo}>
          <dt>{rotulo}</dt>
          <dd>{valor}</dd>
        </div>
      ))}
    </dl>
  );
}

function Links({ repo }: { repo: Repositorio }) {
  const t = useT();
  return (
    <div className={styles.links}>
      <a className={styles.link} href={repo.url} target="_blank" rel="noreferrer">
        {t.projetos.codigo}
      </a>
      {repo.site ? (
        <a className={styles.link} href={urlExterna(repo.site)} target="_blank" rel="noreferrer">
          {t.projetos.aoVivo}
        </a>
      ) : null}
    </div>
  );
}

function Topicos({ lista }: { lista: string[] }) {
  if (!lista.length) return null;
  return (
    <ul className={styles.topicos}>
      {lista.map((tp) => (
        <li key={tp}>{tp}</li>
      ))}
    </ul>
  );
}

interface SessaoProps {
  /** os destaques que voltaram do GitHub com site, na ordem escolhida */
  repos: Repositorio[];
  ativo: boolean;
}

/**
 * A sessão: os projetos em destaque, **rodando ao vivo** numa janela só, um por
 * vez, com uma aba para cada.
 *
 * **O site chega rodando**, sem clique, e por isso há três freios:
 *
 * - só existe com a seção em cena. Fora dela a janela fica vazia: nem o site,
 *   nem a foto, que só é pedida a `api/preview` quando alguém a vê;
 * - numa máquina que a régua de qualidade mede abaixo de `NIVEL_MINIMO`, ou com
 *   movimento reduzido, a sessão chega **pausada**: a foto do site, com o botão
 *   de rodar no meio. A decisão é tomada uma vez, quando a seção entra, e um
 *   site que já roda não é pausado no meio;
 * - quem pausa ou roda na mão decide pelo resto da visita.
 *
 * **Com um destaque só não há abas**, pela regra dos passos de Jogos e da
 * Carreira: um controle de um item não diz nada.
 *
 * A janela não tem barra de navegador: o estado, o endereço e o botão de pausar
 * ficam na barra embaixo dela, como a legenda de uma figura.
 */
export function Sessao({ repos, ativo }: SessaoProps) {
  const t = useT();
  const reduzido = useReducedMotion();
  const [foco, setFoco] = useState(0);
  /** o que quem visita pediu na mão; `null` deixa a decisão com a máquina */
  const [pedido, setPedido] = useState<boolean | null>(null);
  const [aguenta, setAguenta] = useState(true);
  // a régua é consultada uma vez por entrada, durante o render (ver `react.md`):
  // depois de rodar, `ativo === emCena`, e a condição não vale mais
  const [emCena, setEmCena] = useState(false);
  if (ativo !== emCena) {
    setEmCena(ativo);
    if (ativo) setAguenta(maquinaAguenta());
  }

  const indice = Math.min(foco, repos.length - 1);
  const repo = repos[indice];
  const nome = nomeLegivel(repo.nome);
  const site = urlExterna(repo.site ?? '') ?? '';
  const rodando = ativo && (pedido ?? (aguenta && !reduzido));
  const pausado = ativo && !rodando;

  const total = repos.length;
  const andar = useCallback((d: number) => setFoco((f) => Math.min(total - 1, Math.max(0, Math.min(f, total - 1) + d))), [total]);
  useArrowKeys(ativo && total > 1, andar);

  return (
    <div className={styles.sessao}>
      {total > 1 ? (
        <div className={styles.abas} role="group" aria-label={t.a11y.destaques}>
          {repos.map((r, i) => (
            <button key={r.id} type="button" className={styles.aba} aria-pressed={i === indice} onClick={() => setFoco(i)}>
              <span className={styles.num} aria-hidden="true">
                {posicao(i)}
              </span>
              {nomeLegivel(r.nome)}
            </button>
          ))}
        </div>
      ) : null}

      <figure className={styles.janela}>
        {/* a `key` refaz a janela a cada projeto: a entrada roda de novo, e o site anterior sai */}
        <div className={styles.vista} key={repo.id}>
          {rodando ? (
            <>
              <span className={styles.espera}>{t.projetos.carregando}</span>
              <iframe
                src={site}
                title={format(t.a11y.previa, { nome })}
                // o site é de outro lugar: roda os scripts dele, e nada além
                sandbox="allow-scripts allow-same-origin allow-popups"
                // aparece quando chega, por cima da espera; o estado é do nó, como o `hidden` das fotos
                onLoad={(e) => {
                  e.currentTarget.dataset.pronto = '';
                }}
              />
            </>
          ) : pausado ? (
            <>
              <img
                src={`api/preview?repo=${encodeURIComponent(repo.id)}`}
                alt={format(t.a11y.previa, { nome })}
                // sem a foto, a moldura de 1px volta a aparecer, como em toda imagem da página
                onError={(e) => {
                  e.currentTarget.hidden = true;
                }}
              />
              <button type="button" className={styles.tocar} onClick={() => setPedido(true)}>
                <span className={styles.seta} aria-hidden="true" />
                {t.projetos.rodarAoVivo}
              </button>
            </>
          ) : null}
        </div>

        <figcaption className={styles.barra}>
          <span className={styles.estado}>
            {rodando ? <span className={styles.pulso} aria-hidden="true" /> : null}
            {rodando ? t.projetos.rodando : t.projetos.pausado}
          </span>
          <span className={styles.url}>{enderecoDe(site)}</span>
          <span className={styles.risco} aria-hidden="true" />
          <button type="button" className={styles.link} onClick={() => setPedido(!rodando)}>
            {rodando ? t.projetos.pausar : t.projetos.rodar}
          </button>
        </figcaption>
      </figure>

      <div className={styles.ficha} key={repo.id}>
        <div className={styles.info}>
          <div className={styles.topo}>
            <span className={styles.dono}>{repo.id.split('/')[0]} /</span>
            {repo.arquivado ? <span className={comum.estado}>{t.projetos.arquivado}</span> : null}
          </div>
          <h3 className={styles.nome}>{nome}</h3>
          {repo.descricao ? <p className={styles.descricao}>{repo.descricao}</p> : null}
          <Topicos lista={repo.topicos} />
          <Links repo={repo} />
        </div>
        <div className={styles.info}>
          {repo.linguagens.length ? <Linguagens lista={repo.linguagens} titulo={t.projetos.linguagens} /> : null}
          <Dados repo={repo} />
        </div>
      </div>
    </div>
  );
}

interface GavetaProps {
  repo: Repositorio;
  /** os doze meses que o código de barras cobre, iguais para todos */
  janela: Janela;
  /** a posição na seção, contando os destaques antes dela */
  numero: number;
  /** a posição entre as gavetas: escalona a entrada */
  ordem: number;
}

/**
 * Uma gaveta: um projeto secundário, em geral sem site, numa linha que abre.
 *
 * Fechada, a linha diz o número, o nome, a descrição, a linguagem principal e o
 * ano de commits em miniatura. **Aberta, o retrato do projeto é o ano de
 * commits**, grande e com os meses riscados, ao lado do texto inteiro, dos
 * tópicos, das linguagens e dos números. Não há janela nem foto: se a gaveta
 * tiver site, ele é só mais um link.
 *
 * É um `<details>`, e todas têm o mesmo `name`: abrir uma fecha a outra, e o
 * teclado e o leitor de tela recebem o comportamento do navegador.
 */
export function Gaveta({ repo, janela, numero, ordem }: GavetaProps) {
  const t = useT();
  const { lang } = useLanguage();
  // os doze meses da janela, no idioma da página, a partir do mês em que ela começa
  const meses = useMemo(() => {
    const curto = new Intl.DateTimeFormat(lang, { month: 'short', timeZone: 'UTC' });
    const inicio = new Date(janela.de);
    return Array.from({ length: 12 }, (_, k) =>
      curto.format(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth() + k, 1)).replace('.', ''),
    );
  }, [lang, janela.de]);

  return (
    <details className={styles.gaveta} name="projetos" style={{ '--ordem': ordem } as React.CSSProperties}>
      <summary className={styles.alca}>
        <span className={styles.num} aria-hidden="true">
          {posicao(numero)}
        </span>
        <h3 className={styles.titulo}>{nomeLegivel(repo.nome)}</h3>
        <span className={styles.resumo}>{repo.descricao || `github.com/${repo.id}`}</span>
        <span className={styles.principal}>
          {repo.linguagens[0]?.nome}
          {repo.linguagens.length ? <Linguagens lista={repo.linguagens} /> : null}
        </span>
        <CodigoDeBarras datas={repo.datasRecentes} janela={janela} altura={18} />
        <span className={styles.ponta} aria-hidden="true" />
      </summary>

      <div className={styles.aberto}>
        <div className={styles.info}>
          {repo.arquivado ? <span className={comum.estado}>{t.projetos.arquivado}</span> : null}
          {repo.descricao ? <p className={styles.descricao}>{repo.descricao}</p> : null}
          <Topicos lista={repo.topicos} />
          <Links repo={repo} />
        </div>
        <div className={styles.retrato}>
          <span className={styles.rotulo}>{t.projetos.atividade}</span>
          <div className={styles.ano}>
            <CodigoDeBarras datas={repo.datasRecentes} janela={janela} altura={46} meses />
            <div className={styles.meses} aria-hidden="true">
              {meses.map((m) => (
                <span key={m}>{m}</span>
              ))}
            </div>
          </div>
          {repo.linguagens.length ? <Linguagens lista={repo.linguagens} titulo={t.projetos.linguagens} /> : null}
          <Dados repo={repo} />
        </div>
      </div>
    </details>
  );
}

/**
 * A sessão sem o dado: as abas, a janela vazia, a barra e a ficha por chegar,
 * com as mesmas classes, então a seção não pula quando o GitHub responde.
 */
export function SessaoMolde({ abas }: { abas: number }) {
  return (
    <div className={styles.sessao}>
      {abas > 1 ? (
        <div className={styles.abas}>
          {Array.from({ length: abas }, (_, i) => (
            <span key={i} className={styles.aba}>
              <Traco w="9ch" />
            </span>
          ))}
        </div>
      ) : null}
      <div className={styles.janela}>
        <div className={styles.vista} />
        <div className={styles.barra}>
          <Traco w="18ch" />
          <span className={styles.risco} />
        </div>
      </div>
      <div className={styles.ficha}>
        <div className={styles.info}>
          <span className={styles.dono}>
            <Traco w="10ch" />
          </span>
          <span className={styles.nome}>
            <Traco w="12ch" />
          </span>
          <span className={styles.descricao}>
            <Traco w="36ch" />
          </span>
        </div>
      </div>
    </div>
  );
}

/** Uma gaveta sem o dado: a linha fechada, com o número que ela vai ter. */
export function GavetaMolde({ numero }: { numero: number }) {
  return (
    <div className={styles.gaveta}>
      <div className={styles.alca}>
        <span className={styles.num}>{posicao(numero)}</span>
        <span className={styles.titulo}>
          <Traco w="12ch" />
        </span>
        <span className={styles.resumo}>
          <Traco w="30ch" />
        </span>
      </div>
    </div>
  );
}
