import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { secoesDoModo, type ModoKey, type SectionKey } from '~/content';
import { Credit } from '~/hud/Credit';
import { Hud } from '~/hud/Hud';
import { LanguageToggle } from '~/hud/LanguageToggle';
import { ModeHeader } from '~/hud/ModeHeader';
import { Notice } from '~/hud/Notice';
import { NovaGauge } from '~/hud/NovaGauge';
import { useNovaHint } from '~/hud/useNovaHint';
import { Version } from '~/hud/Version';
import { useT } from '~/i18n/useLanguage';
import { NavMenu } from '~/navigation/NavMenu';
import { rotaInicial, salvarModo, useHashRoute, type Rota } from '~/navigation/useHashRoute';
import { useSectionScroll } from '~/navigation/useSectionScroll';
import { NOVA_NIVEIS } from '~/scene/scenePlan';
import { SpaceCanvas } from '~/scene/SpaceCanvas';
import { AboutSection } from '~/sections/about/AboutSection';
import { ContactSection } from '~/sections/contact/ContactSection';
import { HeroSection } from '~/sections/hero/HeroSection';
import { JourneySection } from '~/sections/journey/JourneySection';
import { ProjectsSection } from '~/sections/projects/ProjectsSection';
import type { SectionProps } from '~/sections/types';
import styles from './App.module.css';

/**
 * Qual componente responde por cada chave de seção.
 *
 * É o único lugar do projeto que faz essa ligação, e existe porque a **ordem
 * deixou de ser fixa**: com dois modos, cada um com a sua lista, o JSX não pode
 * mais escrever as seções de cima para baixo. Nenhuma seção ganha conhecimento
 * novo com isso — a assinatura é a mesma para todas (ver `sections/types.ts`).
 */
const MONTAR: Record<SectionKey, (p: SectionProps) => React.ReactNode> = {
  inicio: (p) => <HeroSection {...p} />,
  sobre: (p) => <AboutSection {...p} />,
  projetos: (p) => <ProjectsSection {...p} />,
  experiencia: (p) => <JourneySection {...p} />,
  contato: (p) => <ContactSection {...p} />,
};

/**
 * Como a página abriu: o endereço, ou o que ficou da última visita, ou o padrão.
 *
 * Lido no escopo do módulo, uma vez, porque é um fato do carregamento e não
 * estado: reler no render daria respostas diferentes conforme o hash fosse sendo
 * reescrito pela própria navegação.
 */
const ROTA_INICIAL = rotaInicial();

/**
 * Montagem da página.
 *
 * Três planos empilhados: o canvas ao fundo, o HUD fixo por cima dele e o
 * contêiner de seções (com `scroll-snap`) na frente. Só o contêiner rola — o
 * documento tem `overflow: hidden`.
 *
 * O App é a única peça que conhece **o modo em vigor e a lista de seções dele**.
 * Cada seção sabe se está ativa, que número ocupa e em que lado do site está;
 * nenhuma sabe qual é a sua vizinha nem quantas existem.
 *
 * **Trocar de modo mantém a seção, quando ela existe do outro lado.** Quem está
 * lendo o Sobre não deve ser jogado para o topo por ter trocado de lado; quem está
 * numa seção que só existe de um lado vai para o Início, porque não há para onde
 * mais ir. O destino fica num ref e é alcançado num efeito de layout, nunca no
 * mesmo passo do `setModo`: a rolagem precisa que o contêiner **já tenha** as
 * seções novas, senão o alvo cai fora da altura que existe e é limitado.
 *
 * Também é ele quem liga a supernova ao seu medidor: a cena avisa que uma
 * estrela foi acesa, com o nível que a carga atingiu, e o HUD desenha a recarga
 * **daquele nível**. Os dois lados leem a mesma `NOVA_NIVEIS`, então o círculo
 * fecha exatamente quando o próximo disparo passa a ser aceito.
 *
 * Um contador e um número são todo o estado que isso custa, e eles mudam uma vez
 * por disparo. O que acontece **durante** a carga (o poço, o plasma, a
 * supermassiva, o estalo de cada promoção) vive inteiro na cena, sob o dedo do
 * visitante: é onde a informação já está, e o React não precisa render por quadro
 * para mostrá-la.
 *
 * O mesmo contador alimenta a dica da supernova: o aviso do canto superior
 * esquerdo só existe enquanto ele estiver em zero (ver `useNovaHint`).
 */
export function App() {
  const [modo, setModo] = useState<ModoKey>(ROTA_INICIAL.modo);
  const secoes = useMemo(() => secoesDoModo(modo), [modo]);
  const { ref, indice, irPara, seguirFracao, soltarFracao } = useSectionScroll(secoes.length);
  const chaveAtiva = secoes[indice] ?? 'inicio';

  /**
   * Seção a alcançar quando a lista mudar, sem animação.
   *
   * Começa com a do endereço: abrir `#pessoal/contato` precisa **posicionar** a
   * página, não desfilar por tudo o que vem antes na frente de quem chegou.
   */
  const destinoRef = useRef<SectionKey | null>(ROTA_INICIAL.secao);

  useLayoutEffect(() => {
    const destino = destinoRef.current;
    if (destino === null) return;
    destinoRef.current = null;
    const i = secoes.indexOf(destino);
    // não achou, ou é o próprio Início: começa do começo
    irPara(i > 0 ? i : 0, false);
  }, [secoes, irPara]);

  // um lugar só para persistir o lado, qualquer que tenha sido o caminho até ele
  useEffect(() => {
    salvarModo(modo);
  }, [modo]);

  const trocarModo = useCallback(
    (alvo: ModoKey) => {
      if (alvo === modo) return;
      destinoRef.current = chaveAtiva;
      setModo(alvo);
    },
    [modo, chaveAtiva],
  );

  /** Um item da prévia do cabeçalho: pode ser do modo em vigor ou do outro. */
  const irParaSecao = useCallback(
    (alvo: ModoKey, secao: SectionKey) => {
      if (alvo === modo) {
        // dentro do mesmo modo é um trajeto de verdade, e a rolagem é suave
        const i = secoes.indexOf(secao);
        if (i >= 0) irPara(i);
        return;
      }
      destinoRef.current = secao;
      setModo(alvo);
    },
    [modo, secoes, irPara],
  );

  const rota = useMemo<Rota>(() => ({ modo, secao: chaveAtiva }), [modo, chaveAtiva]);
  const aoNavegar = useCallback(
    (r: Rota) => {
      if (r.modo !== modo) {
        destinoRef.current = r.secao;
        setModo(r.modo);
        return;
      }
      const i = secoes.indexOf(r.secao);
      if (i >= 0) irPara(i, false);
    },
    [modo, secoes, irPara],
  );
  useHashRoute(rota, aoNavegar);

  const [nova, setNova] = useState({ disparo: 0, recarga: NOVA_NIVEIS[0].recarga });
  const aoAcender = useCallback((nivel: number) => {
    setNova((n) => ({ disparo: n.disparo + 1, recarga: NOVA_NIVEIS[nivel - 1].recarga }));
  }, []);
  const dica = useNovaHint(nova.disparo);
  const t = useT();

  return (
    <div className={styles.palco}>
      <SpaceCanvas secao={chaveAtiva} onNova={aoAcender} />
      <Hud ativo={chaveAtiva === 'inicio'} />
      <ModeHeader modo={modo} trocar={trocarModo} irParaSecao={irParaSecao} />
      <LanguageToggle />

      <div ref={ref} className={styles.rolagem}>
        {/**
         * `Fragment`, nunca um elemento de embrulho: as seções precisam ser
         * **filhas diretas** de `.rolagem` para o `scroll-snap` valer, e o filtro
         * da supernova exige que o alvo do toque seja a caixa de uma `<section>`
         * — uma `<div>` no meio quebraria os dois de uma vez, sem erro nenhum.
         */}
        {secoes.map((key, i) => (
          <Fragment key={key}>
            {MONTAR[key]({
              ativo: chaveAtiva === key,
              // a posição na ordem do modo; o Início é o 00 e não mostra número
              indice: String(i).padStart(2, '0'),
              modo,
            })}
          </Fragment>
        ))}
      </div>

      <NavMenu
        secoes={secoes}
        indice={indice}
        irPara={irPara}
        seguirFracao={seguirFracao}
        soltarFracao={soltarFracao}
      />
      <Credit />
      <Version />
      <NovaGauge disparo={nova.disparo} segundos={nova.recarga} />
      <Notice
        aberto={dica.visivel}
        titulo={t.aviso.nova.titulo}
        texto={t.aviso.nova.texto}
        rotuloFechar={t.aviso.fechar}
        onFechar={dica.fechar}
      />
    </div>
  );
}
