import { useRef } from 'react';
import type { Jogo, Jogos } from '~/data/types';
import { useEscalaQueCabe } from '~/hooks/useEscalaQueCabe';
import { useInclinacao } from '~/hooks/useInclinacao';
import { useRemoto } from '~/hooks/useRemoto';
import { useT } from '~/i18n/useLanguage';
import { EstadoRemoto } from '../EstadoRemoto';
import { PerfilExterno } from '../PerfilExterno';
import comum from '../section.module.css';
import type { SectionProps } from '../types';
import styles from './GamesSection.module.css';

/** O "jogando agora" muda em minutos, não em segundos. */
const REPETIR = 60_000;

/** Minutos viram horas inteiras: 40min de um jogo não é informação, 12h é. */
const horas = (minutos: number) => Math.round(minutos / 60);

/**
 * A arte deitada do destaque, com a moldura que sobrevive à falta dela.
 *
 * O endereço é resolvido a cada resposta (ver `api/steam.ts`) e pode não vir.
 * `onError` esconde a imagem e deixa a moldura vazia de 1px, que é o mesmo
 * espaço reservado dos banners de projeto; sem isso sobraria o ícone de imagem
 * quebrada do navegador, a única coisa fora da paleta na página inteira.
 *
 * A moldura é também quem **inclina seguindo o ponteiro** (`useInclinacao`), com
 * o brilho especular do retrato do Sobre. Ela vale **só para o destaque**: na
 * pilha, apontar já é o que traz a carta para a frente, e uma inclinação por
 * cima disso seriam duas respostas para o mesmo gesto, escritas em dois
 * `transform` que se apagariam no mesmo elemento.
 */
function Arte({ capa }: { capa: string | null }) {
  const { alvoRef, brilhoRef } = useInclinacao<HTMLSpanElement>({
    grauX: 10,
    grauY: 12,
    escala: 1.04,
    perspectiva: 700,
  });

  return (
    <span ref={alvoRef} className={styles.arte}>
      {capa ? (
        <img
          src={capa}
          alt=""
          loading="lazy"
          onError={(e) => {
            e.currentTarget.hidden = true;
          }}
        />
      ) : null}
      <span ref={brilhoRef} className={comum.brilho} aria-hidden="true" />
    </span>
  );
}

/**
 * O conteúdo, quando ele existe.
 *
 * Separado do casco pela mesma razão de Música: os três estados da busca já são
 * um ramo, e o terceiro tem ramos próprios.
 */
function Conteudo({ dados }: { dados: Jogos }) {
  const t = useT();
  const destaque = dados.jogando ?? dados.recentes[0] ?? null;
  const aoVivo = Boolean(dados.jogando);

  if (!destaque) return <EstadoRemoto estado="vazio" />;

  // o destaque já apareceu grande; a grade é o que sobra
  const resto = dados.recentes.filter((g: Jogo) => g.id !== destaque.id);

  return (
    <>
      <a
        className={styles.destaque}
        href={destaque.url}
        target="_blank"
        rel="noreferrer"
        data-vivo={aoVivo || undefined}
      >
        <Arte capa={destaque.capa} />

        <span className={styles.corpo}>
          <span className={styles.rotulo}>
            {aoVivo && <span className={styles.pulso} aria-hidden="true" />}
            {aoVivo ? t.jogos.jogando : t.jogos.ultimo}
          </span>
          <span className={styles.nome}>{destaque.nome}</span>
          <span className={styles.tempos}>
            {destaque.minutosRecentes > 0 && (
              <span>
                {horas(destaque.minutosRecentes)}
                {t.jogos.horas} {t.jogos.duasSemanas}
              </span>
            )}
            <span className={styles.total}>
              {horas(destaque.minutosTotais)}
              {t.jogos.horas} {t.jogos.total}
            </span>
          </span>
        </span>
      </a>

      {resto.length > 0 && (
        <div className={styles.grupo}>
          <p className={styles.tituloLista}>{t.jogos.recentes}</p>
          <ul className={styles.pilha} style={{ '--total': resto.length } as React.CSSProperties}>
            {resto.map((g, i) => (
              <li
                key={g.id}
                className={styles.carta}
                style={{ '--ordem': i, '--fundo': resto.length - i } as React.CSSProperties}
              >
                <a className={styles.link} href={g.url} target="_blank" rel="noreferrer">
                  <span className={styles.capa}>
                    {g.capaAlta ? (
                      <img
                        src={g.capaAlta}
                        alt=""
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.hidden = true;
                        }}
                      />
                    ) : null}
                  </span>

                  <span className={styles.legenda}>
                    <span className={styles.nomePequeno}>{g.nome}</span>
                    <span className={styles.horasPequenas}>
                      {horas(g.minutosRecentes)}
                      {t.jogos.horas} {t.jogos.duasSemanas}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

/**
 * Jogos: o que está aberto agora, e o que rodou nas últimas duas semanas.
 *
 * O dado vem de `api/steam`. Como em Música, o destaque tem dois estados e o
 * segundo é o comum: **ninguém está jogando na maior parte do dia**, e aí o lugar
 * passa a ser o último jogo, com o rótulo dizendo que é passado.
 */
export function GamesSection({ ativo, indice }: SectionProps) {
  const t = useT();
  const secaoRef = useRef<HTMLElement>(null);
  useEscalaQueCabe(secaoRef);
  const jogos = useRemoto<Jogos>('api/steam', ativo, REPETIR);

  return (
    <section
      ref={secaoRef}
      className={`${comum.secao} ${comum.rolavel} ${styles.secao}`}
      aria-label={t.nav.jogos}
    >
      <div className={`${comum.bloco} ${styles.bloco}`} data-ativo={ativo || undefined}>
        <p className={comum.indice}>
          <span>{indice}</span>
          <span className={comum.indiceRisco} aria-hidden="true" />
        </p>

        <div className={comum.cabecalho}>
          <div className={comum.linhaTitulo}>
            <h2 className={comum.titulo}>{t.jogos.titulo}</h2>
            <PerfilExterno secao="jogos" />
          </div>
          <p className={comum.intro}>{t.jogos.intro}</p>
        </div>

        {jogos.estado === 'pronto' ? (
          <Conteudo dados={jogos.dados} />
        ) : (
          <EstadoRemoto estado={jogos.estado} />
        )}
      </div>
    </section>
  );
}
