import { useState } from 'react';
import { format, urlExterna } from '~/content';
import type { Projetos, Repositorio } from '~/data/types';
import { useT } from '~/i18n/useLanguage';
import { Traco } from '../EstadoRemoto';
import comum from '../section.module.css';
import { nomeLegivel } from './nome';
import styles from './Projeto.module.css';

/** Linguagens com nome na legenda; o resto vira o último trecho da barra. */
const MAX_LINGUAGENS = 3;
/** Os degraus de branco dos trechos, da maior linguagem para o resto. */
const TONS = [1, 0.6, 0.36, 0.18];

/** `2026-09-09T20:45:28Z` vira `2026.09`, o ano.mês do resto da página. */
const anoMes = (iso: string) => iso.slice(0, 7).replace('-', '.');

/** Fração de linguagem em porcentagem, sem mentir que um resto de 0,3% é zero. */
const porcento = (f: number) => (f < 0.01 ? '<1%' : `${Math.round(f * 100)}%`);

type Janela = Projetos['janela'];

/**
 * O código de barras dos commits: **um traço por commit**, no dia em que ele
 * aconteceu dentro da janela de doze meses. Mora na janela de quem não tem site,
 * no lugar da foto: é o retrato do projeto que existe quando não há página.
 *
 * Um `<path>` só para todos, com `non-scaling-stroke`: o desenho estica na
 * largura e o traço continua com 1px.
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
 * As linguagens em trechos: uma barra dividida pelo tamanho de cada uma, um
 * degrau de branco por trecho (a paleta não tem outra coisa), e a legenda embaixo
 * com a mesma amostra ligando uma à outra. As três maiores têm nome; o resto vira
 * um último trecho, o mais apagado.
 */
function Linguagens({ lista, titulo }: { lista: Repositorio['linguagens']; titulo: string }) {
  const nomeadas = lista.slice(0, MAX_LINGUAGENS);
  const resto = Math.max(0, 1 - nomeadas.reduce((soma, l) => soma + l.fracao, 0));
  const trechos = resto >= 0.005 ? [...nomeadas.map((l) => l.fracao), resto] : nomeadas.map((l) => l.fracao);

  return (
    <div className={styles.linguagens}>
      <span className={styles.rotulo}>{titulo}</span>
      <span className={styles.trechos} aria-hidden="true">
        {trechos.map((f, k) => (
          // o trecho é a posição dele na barra: não há identidade além dela
          <span key={k} style={{ flexGrow: f, '--tom': TONS[k], '--k': k } as React.CSSProperties} />
        ))}
      </span>
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
 * Um projeto sem o dado: a janela vazia e as linhas do texto por chegar, com as
 * mesmas classes, então a vitrine não pula quando o GitHub responde. As larguras
 * são em `ch` porque a coluna do texto se ajusta ao conteúdo.
 */
export function ProjetoMolde({ indice }: { indice: number }) {
  return (
    <article className={styles.projeto} style={{ '--ordem': indice } as React.CSSProperties}>
      <div className={styles.janela}>
        <div className={styles.vista} />
        <div className={styles.endereco}>
          <Traco w="18ch" />
          <span className={styles.risco} />
        </div>
      </div>
      <div className={styles.info}>
        <span className={styles.dono}>
          <Traco w="10ch" />
        </span>
        <span className={styles.nome}>
          <Traco w="12ch" />
        </span>
        <span className={styles.descricao}>
          <Traco w="36ch" />
          <Traco w="28ch" />
        </span>
      </div>
    </article>
  );
}

interface ProjetoProps {
  repo: Repositorio;
  /** os doze meses que o código de barras cobre, iguais para todos */
  janela: Janela;
  /** a posição na lista: escalona a entrada */
  indice: number;
}

/**
 * Um projeto, em vitrine: a janela com o site dele e o que o repositório diz de
 * si ao lado.
 *
 * **A janela mostra a foto do site**, que vem de `api/preview`, e o botão dela
 * troca a foto pelo site rodando de verdade, ali dentro. A foto é o estado de
 * sempre porque o site ao vivo carrega a página inteira do projeto (scripts,
 * imagens) e fica rodando enquanto o visitante lê outra coisa. **Sem site**, a
 * janela mostra o código de barras dos commits, que é o retrato do projeto que
 * existe.
 *
 * **A janela não tem barra de navegador.** Sem as três bolinhas do macOS, que
 * eram a única citação de outro sistema na página: a foto fica emoldurada em
 * 1px, e o endereço vira a legenda embaixo dela, com o estado ("no ar", com o
 * ponto que pulsa, ou "só código").
 *
 * **Estrela e fork só aparecem quando existem**: um "0" em cada projeto pessoal
 * diria menos sobre o projeto do que sobre a contagem.
 */
export function Projeto({ repo, janela, indice }: ProjetoProps) {
  const t = useT();
  const [vivo, setVivo] = useState(false);
  const nome = nomeLegivel(repo.nome);
  const site = repo.site ? urlExterna(repo.site) : '';
  const endereco = site ? site.replace(/^https?:\/\//, '').replace(/\/$/, '') : `github.com/${repo.id}`;

  const dados: [string, string | number][] = [
    [t.projetos.rotulos.commits, repo.commits],
    ...(repo.estrelas > 0 ? [[t.projetos.rotulos.estrelas, repo.estrelas] as [string, number]] : []),
    ...(repo.forks > 0 ? [[t.projetos.rotulos.forks, repo.forks] as [string, number]] : []),
    [t.projetos.rotulos.desde, anoMes(repo.criadoEm)],
    [t.projetos.rotulos.atualizado, anoMes(repo.atualizadoEm)],
  ];

  return (
    <article className={styles.projeto} style={{ '--ordem': indice } as React.CSSProperties}>
      <figure className={styles.janela}>
        <div className={styles.vista} data-vivo={vivo || undefined}>
          {!site ? (
            <div className={styles.semSite}>
              <CodigoDeBarras datas={repo.datasRecentes} janela={janela} />
              <span>{t.projetos.atividade}</span>
            </div>
          ) : vivo ? (
            <iframe
              src={site}
              title={format(t.a11y.previa, { nome })}
              // o site é de outro lugar: roda os scripts dele, e nada além
              sandbox="allow-scripts allow-same-origin allow-popups"
            />
          ) : (
            <img
              src={`api/preview?repo=${encodeURIComponent(repo.id)}`}
              alt={format(t.a11y.previa, { nome })}
              loading="lazy"
              // sem a foto, a moldura de 1px volta a aparecer, como em toda imagem da página
              onError={(e) => {
                e.currentTarget.hidden = true;
              }}
            />
          )}
          {site ? (
            <button type="button" className={styles.alternar} aria-pressed={vivo} onClick={() => setVivo((v) => !v)}>
              {vivo ? t.projetos.parar : t.projetos.rodar}
            </button>
          ) : null}
        </div>

        <figcaption className={styles.endereco}>
          <span className={styles.url}>{endereco}</span>
          <span className={styles.risco} aria-hidden="true" />
          <span className={styles.estado}>
            {site ? <span className={styles.pulso} aria-hidden="true" /> : null}
            {site ? t.projetos.noAr : t.projetos.soCodigo}
          </span>
        </figcaption>
      </figure>

      <div className={styles.info}>
        <div className={styles.topo}>
          <span className={styles.dono}>{repo.id.split('/')[0]} /</span>
          {repo.arquivado ? <span className={comum.estado}>{t.projetos.arquivado}</span> : null}
        </div>
        <h3 className={styles.nome}>{nome}</h3>
        {repo.descricao ? <p className={styles.descricao}>{repo.descricao}</p> : null}

        {repo.topicos.length ? (
          <ul className={styles.topicos}>
            {repo.topicos.map((tp) => (
              <li key={tp}>{tp}</li>
            ))}
          </ul>
        ) : null}

        {repo.linguagens.length ? <Linguagens lista={repo.linguagens} titulo={t.projetos.linguagens} /> : null}

        <dl className={styles.dados}>
          {dados.map(([rotulo, valor]) => (
            <div key={rotulo}>
              <dt>{rotulo}</dt>
              <dd>{valor}</dd>
            </div>
          ))}
        </dl>

        <div className={styles.links}>
          <a className={styles.link} href={repo.url} target="_blank" rel="noreferrer">
            {t.projetos.codigo}
          </a>
          {site ? (
            <a className={styles.link} href={site} target="_blank" rel="noreferrer">
              {t.projetos.aoVivo}
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}
