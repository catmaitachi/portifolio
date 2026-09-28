import { PROJETOS } from '~/content';
import type { Projetos } from '~/data/types';
import { useRemoto } from '~/hooks/useRemoto';
import { useT } from '~/i18n/useLanguage';
import { EstadoRemoto } from '../EstadoRemoto';
import { PerfilExterno } from '../PerfilExterno';
import comum from '../section.module.css';
import type { SectionProps } from '../types';
import styles from './ProjectsSection.module.css';
import { Projeto } from './Projeto';

/** A escolha vai inteira no endereço, e é ele a chave do cache da borda. */
const CAMINHO = `api/github?repos=${encodeURIComponent(PROJETOS.join(','))}`;

/**
 * Projetos pessoais: os repositórios escolhidos a dedo, em vitrine.
 *
 * Só projeto pessoal, e o dado de cada um vem do GitHub (`api/github`): a
 * escolha mora em `shared.json → projetos`, e nome, descrição, linguagens e
 * números são o que o repositório diz de si. **Sem escolha nenhuma não há o que
 * buscar**: a seção diz que nada foi selecionado ainda e não chama a função.
 *
 * Cada projeto é uma linha, com a foto do site dele numa janela (ver
 * `Projeto`), e as linhas se seguem na rolagem. A órbita 3D de cartões que
 * existia aqui saiu: ela mostrava um projeto por vez e escondia os outros atrás
 * de um giro, e a vitrine mostra todos, cada um com o site.
 */
export function ProjectsSection({ ativo, indice }: SectionProps) {
  const t = useT();
  const escolhidos = PROJETOS.length > 0;
  // repositório não muda enquanto alguém olha para ele: busca uma vez por entrada, sem repetir
  const remoto = useRemoto<Projetos>(CAMINHO, ativo && escolhidos);
  const lista = remoto.estado === 'pronto' ? remoto.dados.repositorios : [];

  return (
    <section
      className={`${comum.secao} ${comum.rolavel} ${styles.secao}`}
      aria-label={t.nav.projetos}
    >
      <div className={`${comum.bloco} ${styles.bloco}`} data-ativo={ativo || undefined}>
        <p className={comum.indice}>
          <span>{indice}</span>
          <span className={comum.indiceRisco} aria-hidden="true" />
        </p>

        <div className={comum.cabecalho}>
          <div className={comum.linhaTitulo}>
            <h2 className={comum.titulo}>{t.projetos.titulo}</h2>
            <PerfilExterno secao="projetos" />
          </div>
          <p className={comum.intro}>{t.projetos.intro}</p>
        </div>

        {!escolhidos ? (
          <EstadoRemoto estado="vazio" texto={t.projetos.vazio} />
        ) : remoto.estado !== 'pronto' ? (
          <EstadoRemoto estado={remoto.estado} />
        ) : lista.length === 0 ? (
          // escolhidos, mas nenhum voltou: todos privados, renomeados ou apagados
          <EstadoRemoto estado="vazio" />
        ) : (
          <ol className={styles.lista}>
            {lista.map((r, i) => (
              <li key={r.id}>
                <Projeto repo={r} janela={remoto.dados.janela} indice={i} />
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
