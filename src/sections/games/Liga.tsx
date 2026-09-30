import { useMemo } from 'react';
import type { Liga as DadosLiga, Partida } from '~/data/types';
import { format } from '~/content';
import { useInclinacao } from '~/hooks/useInclinacao';
import { useLanguage, useT } from '~/i18n/useLanguage';
import { haQuanto } from '../haQuanto';
import comum from '../section.module.css';
import { useRemoto } from '~/hooks/useRemoto';
import { EstadoRemoto } from '../EstadoRemoto';
import { LIGA_MOLDE } from './liga.molde';
import styles from './Liga.module.css';

/**
 * As artes do jogo que não vêm da API, guardadas no projeto em webp pequeno: a
 * borda de nível (21 temas) e o brasão de maestria (1 a 10). O original da Riot
 * tem ~300KB cada; o `glob` põe todas no build, mas a página só baixa as que usa.
 */
const BORDAS = import.meta.glob<string>('../../assets/lol/borda-*.webp', {
  eager: true,
  import: 'default',
});
const BRASOES = import.meta.glob<string>('../../assets/lol/maestria-*.webp', {
  eager: true,
  import: 'default',
});

/**
 * A borda muda com o nível, como no cliente do jogo: um tema até o 29, outro do
 * 30 ao 49, e daí um a cada 25 níveis até o 500, que é o 21º.
 */
function borda(nivel: number) {
  const tema = nivel < 30 ? 1 : nivel < 50 ? 2 : Math.min(21, 3 + Math.floor((nivel - 50) / 25));
  return BORDAS[`../../assets/lol/borda-${tema}.webp`];
}

/** O brasão para no 10: dali em diante o jogo só troca o número. */
const brasao = (nivel: number) =>
  BRASOES[`../../assets/lol/maestria-${Math.min(10, Math.max(1, nivel))}.webp`];

const duracao = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const kda = (p: Partida) => ((p.abates + p.assistencias) / Math.max(1, p.mortes)).toFixed(1);

/** O pódio põe o primeiro no meio; o DOM continua na ordem, para o leitor de tela. */
const LUGAR = [2, 1, 3];

/**
 * A carta do invocador: o ícone dentro da borda do nível, o nível na placa, o
 * nick e a região. Inclina com o ponteiro como o retrato do Sobre
 * (`useInclinacao`).
 */
function Carta({ perfil }: { perfil: DadosLiga['perfil'] }) {
  const t = useT();
  const { alvoRef, brilhoRef } = useInclinacao<HTMLDivElement>({ grauX: 10, grauY: 12 });

  return (
    <div ref={alvoRef} className={styles.carta}>
      <div className={styles.brasao}>
        <img className={styles.icone} src={perfil.icone} alt="" loading="lazy" />
        <img className={styles.borda} src={borda(perfil.nivel)} alt="" loading="lazy" />
        <span className={styles.nivel} aria-hidden="true">
          {perfil.nivel}
        </span>
        <span className={comum.oculto}>{format(t.jogos.lol.nivel, { n: String(perfil.nivel) })}</span>
      </div>
      <span className={styles.nick}>{perfil.nome}</span>
      <span className={styles.regiao}>{perfil.regiao}</span>
      <span ref={brilhoRef} className={comum.brilho} aria-hidden="true" />
    </div>
  );
}

/** As três maiores maestrias num pódio: o degrau tem a altura dos pontos. */
function Podio({ maestrias }: { maestrias: DadosLiga['maestrias'] }) {
  const t = useT();
  const { lang } = useLanguage();
  const maior = maestrias[0]?.pontos ?? 1;
  const pontos = useMemo(() => new Intl.NumberFormat(lang), [lang]);

  return (
    <ol className={styles.podio}>
      {maestrias.map((m, i) => (
        <li
          key={m.campeao}
          className={styles.lugar}
          style={{ '--ordem': LUGAR[i], '--altura': m.pontos / maior } as React.CSSProperties}
        >
          <span className={styles.campeao}>
            <img src={m.icone} alt="" loading="lazy" />
            <img className={styles.brasaoMaestria} src={brasao(m.nivel)} alt="" loading="lazy" />
          </span>
          <span className={styles.nome}>{m.campeao}</span>
          <span className={styles.pontos}>
            M{m.nivel} · {pontos.format(m.pontos)}
            <span className={comum.oculto}> {t.jogos.lol.pontos}</span>
          </span>
          <span className={styles.degrau} aria-hidden="true">
            {i + 1}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Uma linha por partida: o fio do resultado, o campeão, os números e os itens. */
function Partidas({ partidas }: { partidas: Partida[] }) {
  const t = useT();
  const { lang } = useLanguage();
  const { lol } = t.jogos;

  return (
    <ol className={styles.partidas}>
      {partidas.map((p) => (
        <li key={p.id} className={styles.partida} data-derrota={!p.vitoria || undefined}>
          <span className={styles.resultado} aria-hidden="true" />
          <img className={styles.icone} src={p.icone} alt={p.campeao} loading="lazy" />
          <span className={styles.numeros}>
            <span className={styles.kda}>
              {p.abates} <i>/</i> {p.mortes} <i>/</i> {p.assistencias}
            </span>{' '}
            <span className={styles.razao}>
              {kda(p)} KDA · {p.cs} CS
            </span>
            <span className={styles.sub}>
              {p.vitoria ? lol.vitoria : lol.derrota} · {lol.filas[p.fila] ?? lol.outraFila} ·{' '}
              {duracao(p.duracao)}
            </span>
          </span>
          <span className={styles.lado}>
            <span className={styles.itens} aria-hidden="true">
              {p.itens.map((src, i) =>
                // a posição é a identidade do espaço: o 7º é sempre o acessório
                src ? <img key={i} src={src} alt="" loading="lazy" /> : <i key={i} />,
              )}
            </span>
            <span className={styles.quando}>{haQuanto(p.fim, lang)}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/** A carta e o pódio lado a lado, e as partidas numa gaveta embaixo. */
function Conteudo({ dados }: { dados: DadosLiga }) {
  const t = useT();
  const { lol } = t.jogos;

  return (
    <div className={styles.liga}>
      <div className={styles.topo}>
        <Carta perfil={dados.perfil} />
        <div className={styles.bloco}>
          <h4 className={comum.tituloLista}>{lol.maestria}</h4>
          <Podio maestrias={dados.maestrias} />
        </div>
      </div>
      {/* as partidas numa gaveta, fechada ao chegar: é o detalhe, e a carta e o
          pódio já dizem quem joga. `<details>` dá o teclado e o estado de graça */}
      <details className={styles.gaveta}>
        <summary className={styles.alca}>
          <h4 className={comum.tituloLista}>{lol.partidas}</h4>
          <span className={`${comum.ponta} ${styles.seta}`} aria-hidden="true" />
        </summary>
        <Partidas partidas={dados.partidas} />
        {/* a lista não é o histórico inteiro, e quem joga o modo sente falta dele */}
        <small className={styles.nota}>{lol.semDesordem}</small>
      </details>
    </div>
  );
}

/**
 * O League of Legends: a carta do invocador e o pódio das maestrias lado a lado,
 * e as últimas partidas embaixo, na largura toda, numa gaveta que abre no título.
 *
 * O dado vem de `api/riot` (ver `dados.md`), uma vez por entrada da seção.
 * Esperando, ou quando a Riot falha (chave vencida, por exemplo), a forma é a
 * mesma desenhada com `LIGA_MOLDE`, apagada, com o aviso por cima.
 *
 * As artes são identidade do jogo e ficam coloridas, como as capas da Steam.
 */
export function Liga({ ativo }: { ativo: boolean }) {
  const liga = useRemoto<DadosLiga>('api/riot', ativo);

  if (liga.estado === 'pronto') return <Conteudo dados={liga.dados} />;
  return (
    <EstadoRemoto estado={liga.estado}>
      <Conteudo dados={LIGA_MOLDE} />
    </EstadoRemoto>
  );
}
