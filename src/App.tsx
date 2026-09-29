import { lazy, memo, Suspense, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { TELAS, telaPorChave, type SectionKey, type TelaKey } from '~/content';
import { Canais } from '~/hud/Canais';
import { Hud } from '~/hud/Hud';
import { NovaGauge } from '~/hud/NovaGauge';
import { Opcoes } from '~/hud/Opcoes';
import { SectionNav } from '~/navigation/SectionNav';
import { Tela } from '~/navigation/Tela';
import { useDocumentTitle } from '~/navigation/useDocumentTitle';
import { rotaInicial, useHashRoute, type Rota } from '~/navigation/useHashRoute';
import { camera } from '~/scene/camera';
import { NOVA_NIVEIS, SECAO_DO_BURACO_NEGRO } from '~/scene/scenePlan';
import { SpaceCanvas } from '~/scene/SpaceCanvas';
import { AboutSection } from '~/sections/about/AboutSection';
import { ContactSection } from '~/sections/contact/ContactSection';
import { FilmsSection } from '~/sections/films/FilmsSection';
import { GamesSection } from '~/sections/games/GamesSection';
import { HeroSection } from '~/sections/hero/HeroSection';
import { JourneySection } from '~/sections/journey/JourneySection';
import { MusicSection } from '~/sections/music/MusicSection';
import { ProjectsSection } from '~/sections/projects/ProjectsSection';
import type { SectionProps } from '~/sections/types';
import styles from './App.module.css';

/**
 * Qual componente responde por cada chave de seção.
 *
 * É o único lugar do projeto que faz essa ligação. Em que tela cada seção mora,
 * e em que ordem, é dado (`shared.json → telas`), e nenhuma seção ganha
 * conhecimento com isso: a assinatura é a mesma para todas (ver
 * `sections/types.ts`).
 *
 * **Cada seção é `memo`.** As duas props são valores simples, então uma seção só
 * renderiza de novo quando uma delas muda para ela, ou quando o idioma muda. Sem
 * isso, cada estrela acesa (o `setNova` lá embaixo) re-renderizava a página
 * inteira justamente no quadro da explosão, que é o quadro em que o canvas mais
 * trabalha.
 */
const MONTAR: Record<SectionKey, React.ComponentType<SectionProps>> = {
  inicio: memo(HeroSection),
  sobre: memo(AboutSection),
  projetos: memo(ProjectsSection),
  experiencia: memo(JourneySection),
  musica: memo(MusicSection),
  jogos: memo(GamesSection),
  filmes: memo(FilmsSection),
  contato: memo(ContactSection),
};

/**
 * Como a página abriu: o endereço, ou o começo do site.
 *
 * Lido no escopo do módulo, uma vez, porque é um fato do carregamento e não
 * estado: reler no render daria respostas diferentes conforme o hash fosse sendo
 * reescrito pela própria navegação.
 */
const ROTA_INICIAL = rotaInicial();

/**
 * O painel de calibragem dos pisos da qualidade (`hud/Pisos`), só com `?pisos` no
 * endereço. Vem por `lazy`: quem não o pede não baixa o código dele.
 */
const Pisos = new URLSearchParams(window.location.search).has('pisos') ? lazy(() => import('~/hud/Pisos')) : null;

/**
 * O que a cena faz quando a tela muda: o salto, e o buraco negro indo embora se
 * a tela nova não abre com ele. Voltar à que abre com ele não precisa de nada
 * aqui: ela avisa a presença ao abrir, com a rolagem em que estava.
 */
const abreComBuraco = (tela: TelaKey): boolean => telaPorChave(tela).partes[0] === SECAO_DO_BURACO_NEGRO;

function trocouDeTela(para: TelaKey) {
  camera.saltar();
  if (!abreComBuraco(para)) camera.buraco(0);
}

// quem abre o site direto numa tela sem ele não pode ver o buraco negro na abertura
if (!abreComBuraco(ROTA_INICIAL.tela)) camera.buraco(0);

/**
 * Montagem da página.
 *
 * Três planos empilhados: o canvas ao fundo, o HUD fixo por cima dele e as telas
 * na frente. Cada tela rola por dentro, e o documento tem `overflow: hidden`.
 *
 * O App é a única peça que sabe **em que tela e em que seção** o visitante está.
 * A tela diz qual seção dela ocupa a janela (a da rolagem, numa pilha) ou qual
 * aba está aberta, e daqui isso vai para a cena, o HUD, o endereço e o título da
 * aba.
 *
 * Também é ele quem liga a supernova ao seu medidor: a cena avisa que uma
 * estrela foi acesa, com o nível que a carga atingiu, e o HUD desenha a recarga
 * **daquele nível**. Os dois lados leem a mesma `NOVA_NIVEIS`, então o círculo
 * fecha exatamente quando o próximo disparo passa a ser aceito.
 */
export function App() {
  const [tela, setTela] = useState<TelaKey>(ROTA_INICIAL.tela);
  /** a seção de cada tela que ocupa a janela, como a rolagem a vê */
  const [nasPilhas, setNasPilhas] = useState<Partial<Record<TelaKey, SectionKey>>>({});

  const parte: SectionKey = nasPilhas[tela] ?? telaPorChave(tela).partes[0];

  /**
   * Os contêineres das telas, para levar uma pilha até a seção que o endereço
   * pede. Um registrador por tela, criado uma vez: um novo a cada render faria o
   * React soltar e religar a ref a cada render.
   */
  const conteineres = useRef(new Map<TelaKey, HTMLDivElement>());
  const registrar = useMemo(() => {
    const r = {} as Record<TelaKey, (el: HTMLDivElement | null) => void>;
    for (const t of TELAS) {
      r[t.key] = (el) => {
        if (el) conteineres.current.set(t.key, el);
        else conteineres.current.delete(t.key);
      };
    }
    return r;
  }, []);

  /**
   * Leva uma pilha até a seção que a rota pede, sem animação.
   *
   * Seca de propósito: abrir `#profile/contact` precisa **posicionar** a tela, não
   * desfilar por tudo o que vem antes na frente de quem chegou. A tela pode estar
   * escondida quando isso acontece (a troca de tela vem no mesmo passo), e tudo
   * bem: escondida por `visibility`, ela continua tendo layout e rolagem.
   */
  const posicionar = useCallback((r: Rota, suave = false) => {
    const alvo = telaPorChave(r.tela);
    const el = conteineres.current.get(r.tela);
    const i = alvo.partes.indexOf(r.parte);
    if (!el || i < 0) return;
    const secao = el.children[i] as HTMLElement | undefined;
    const topo = i === 0 || !secao ? 0 : secao.offsetTop;
    const semMovimento = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (suave && !semMovimento) el.scrollTo({ top: topo, behavior: 'smooth' });
    else el.scrollTop = topo;
  }, []);

  // na abertura as telas ainda não existiam quando a rota foi lida
  useLayoutEffect(() => {
    posicionar(ROTA_INICIAL);
  }, [posicionar]);

  /**
   * Chegar por endereço (voltar, avançar, hash editado na barra). O
   * posicionamento é feito aqui, e não num efeito: uma rota dentro da mesma tela
   * não muda estado nenhum quando a seção pedida é a que já está registrada, e o
   * efeito nunca rodaria.
   */
  /**
   * A tela em vigor, lida pelos caminhos de navegação sem entrar nas
   * dependências deles (ver `react.md`): é ela que decide se houve troca, e só
   * troca de tela dispara o salto da câmera.
   */
  const telaRef = useRef(tela);
  useLayoutEffect(() => {
    telaRef.current = tela;
  });

  const irPara = useCallback(
    (r: Rota) => {
      if (r.tela !== telaRef.current) trocouDeTela(r.tela);
      setTela(r.tela);
      posicionar(r);
    },
    [posicionar],
  );

  const irParaTela = useCallback((t: TelaKey) => {
    if (t === telaRef.current) return;
    trocouDeTela(t);
    setTela(t);
  }, []);

  /**
   * Uma subseção escolhida no cabeçalho. Na mesma tela a rolagem até ela é
   * suave, porque é a câmera andando até lá; para outra tela é seca, porque o
   * salto da troca já é o movimento.
   */
  const irParaParte = useCallback(
    (t: TelaKey, parte: SectionKey) => {
      const mesma = t === telaRef.current;
      if (!mesma) trocouDeTela(t);
      setTela(t);
      posicionar({ tela: t, parte }, mesma);
    },
    [posicionar],
  );

  /**
   * A rolagem de cada tela move a câmera do céu, e na tela que abre com o buraco
   * negro ela também o leva embora.
   *
   * O buraco negro encolhe pela **perspectiva** da viagem, `1 / (1 + 3,5·p)`: rápido
   * no começo, devagar depois, e no fim da tela ele ainda está lá, com um quinto do
   * tamanho, distante. Ele acompanha a viagem pelas estrelas pela tela inteira, e
   * não só enquanto o Início está à vista. Numa tela que não abre com ele a
   * presença é zero (ver `trocouDeTela`).
   */
  const aoRolar = useMemo(() => {
    const r = {} as Record<TelaKey, (p: number) => void>;
    for (const t of TELAS) {
      const temBuraco = abreComBuraco(t.key);
      r[t.key] = (p) => {
        camera.rolar(p);
        if (temBuraco) camera.buraco(1 / (1 + 3.5 * p));
      };
    }
    return r;
  }, []);

  const aoMudarParte = useMemo(() => {
    const r = {} as Record<TelaKey, (p: SectionKey) => void>;
    for (const t of TELAS) r[t.key] = (p) => setNasPilhas((n) => ({ ...n, [t.key]: p }));
    return r;
  }, []);

  const rota = useMemo<Rota>(() => ({ tela, parte }), [tela, parte]);
  useHashRoute(rota, irPara);
  useDocumentTitle(tela, parte);

  const [nova, setNova] = useState({ disparo: 0, recarga: NOVA_NIVEIS[0].recarga });
  const aoAcender = useCallback((nivel: number) => {
    setNova((n) => ({ disparo: n.disparo + 1, recarga: NOVA_NIVEIS[nivel - 1].recarga }));
  }, []);

  return (
    <div className={styles.palco}>
      <SpaceCanvas secao={parte} onNova={aoAcender} />
      <Hud ativo={parte === 'inicio'} />
      <Canais ativo={parte === 'inicio'} />
      <SectionNav tela={tela} parte={parte} irPara={irParaTela} irParaParte={irParaParte} />
      <Opcoes />

      {TELAS.map((t) => (
        <Tela
          key={t.key}
          config={t}
          ativa={t.key === tela}
          aoMudarParte={aoMudarParte[t.key]}
          montar={MONTAR}
          registrar={registrar[t.key]}
          aoRolar={aoRolar[t.key]}
        />
      ))}

      <NovaGauge disparo={nova.disparo} segundos={nova.recarga} />
      {Pisos && (
        <Suspense fallback={null}>
          <Pisos />
        </Suspense>
      )}
    </div>
  );
}
