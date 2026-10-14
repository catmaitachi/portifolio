import { DESTAQUES, PROJETOS } from '~/content';
import type { Projetos, Repositorio } from '~/data/types';
import { useRemoto } from '~/hooks/useRemoto';
import { useT } from '~/i18n/useLanguage';
import { EstadoRemoto, type SemDado } from '../EstadoRemoto';
import { PerfilExterno } from '../PerfilExterno';
import comum from '../section.module.css';
import type { SectionProps } from '../types';
import styles from './ProjectsSection.module.css';
import { Gaveta, GavetaMolde, Sessao, SessaoMolde } from './Projeto';

/** A escolha vai inteira no endereço, e é ele a chave do cache da borda. */
const CAMINHO = `api/github?repos=${encodeURIComponent(PROJETOS.join(','))}`;

/**
 * Quem vai para a sessão e quem vai para as gavetas.
 *
 * **Destaque é quem foi escolhido como destaque e tem site.** Um destaque sem
 * site desce para o topo das gavetas, em vez de abrir uma aba com uma janela
 * vazia. A ordem das duas listas é a de `shared.json`, e não a da resposta.
 */
function separar(repos: Repositorio[]) {
  const porId = new Map(repos.map((r) => [r.id.toLowerCase(), r]));
  const escolhidos = PROJETOS.flatMap((id) => porId.get(id.toLowerCase()) ?? []);
  const destaque = (r: Repositorio) => Boolean(r.site) && DESTAQUES.some((id) => id.toLowerCase() === r.id.toLowerCase());
  return { sessao: escolhidos.filter(destaque), gavetas: escolhidos.filter((r) => !destaque(r)) };
}

/**
 * A seção sem o dado: a sessão e as gavetas vazias, que já se sabe quantas são
 * pela escolha. Supõe que todo destaque tem site, que é o combinado.
 */
function Molde({ estado, texto, abas, gavetas }: { estado: SemDado; texto?: string; abas: number; gavetas: number }) {
  return (
    <EstadoRemoto estado={estado} texto={texto}>
      <div className={styles.pilha}>
        {abas > 0 ? <SessaoMolde abas={abas} /> : null}
        {gavetas > 0 ? (
          <div className={styles.lista} data-sozinha={abas === 0 || undefined}>
            {Array.from({ length: gavetas }, (_, i) => (
              <GavetaMolde key={i} numero={abas + i} />
            ))}
          </div>
        ) : null}
      </div>
    </EstadoRemoto>
  );
}

/**
 * Projetos pessoais: os repositórios escolhidos a dedo, em dois andares.
 *
 * Só projeto pessoal, e o dado de cada um vem do GitHub (`api/github`): a
 * escolha mora em `shared.json → projetos`, e nome, descrição, linguagens e
 * números são o que o repositório diz de si. **Sem escolha nenhuma não há o que
 * buscar**: a seção diz que nada foi selecionado ainda e não chama a função.
 *
 * **Em cima, a sessão**: os destaques, que têm site, rodando ao vivo numa
 * janela só, um por aba (ver `Sessao`). **Embaixo, as gavetas**: os secundários,
 * em geral sem site, uma linha cada, que abre (ver `Gaveta`). A numeração é uma
 * só: se os destaques vão até o 05, a primeira gaveta é a 06.
 *
 * **Cada andar existe sozinho.** Sem gavetas, a seção acaba na ficha do
 * destaque; sem destaques, ela é só as gavetas, a partir do 01 e sem o título
 * delas, e nenhum site é carregado.
 */
export function ProjectsSection({ ativo, indice }: SectionProps) {
  const t = useT();
  const escolhidos = PROJETOS.length > 0;
  // repositório não muda enquanto alguém olha para ele: busca uma vez por entrada, sem repetir
  const remoto = useRemoto<Projetos>(CAMINHO, ativo && escolhidos);
  const { sessao, gavetas } = separar(remoto.estado === 'pronto' ? remoto.dados.repositorios : []);

  return (
    <section className={`${comum.secao} ${comum.rolavel} ${styles.secao}`} aria-label={t.nav.projetos}>
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
          <Molde estado="vazio" texto={t.projetos.vazio} abas={0} gavetas={1} />
        ) : remoto.estado !== 'pronto' ? (
          <Molde estado={remoto.estado} abas={DESTAQUES.length} gavetas={PROJETOS.length - DESTAQUES.length} />
        ) : sessao.length + gavetas.length === 0 ? (
          // escolhidos, mas nenhum voltou: todos privados, renomeados ou apagados
          <Molde estado="vazio" abas={0} gavetas={1} />
        ) : (
          <div className={styles.pilha}>
            {sessao.length ? <Sessao repos={sessao} ativo={ativo} /> : null}
            {gavetas.length ? (
              <div className={styles.gavetas}>
                {sessao.length ? <h3 className={comum.tituloLista}>{t.projetos.outros}</h3> : null}
                <ol className={styles.lista} data-sozinha={sessao.length === 0 || undefined}>
                  {gavetas.map((r, i) => (
                    <li key={r.id}>
                      <Gaveta repo={r} janela={remoto.dados.janela} numero={sessao.length + i} ordem={i} />
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
