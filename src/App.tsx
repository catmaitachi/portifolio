import { useCallback, useState } from 'react';
import { SECOES } from '~/content';
import { Credit } from '~/hud/Credit';
import { Hud } from '~/hud/Hud';
import { LanguageToggle } from '~/hud/LanguageToggle';
import { Notice } from '~/hud/Notice';
import { NovaGauge } from '~/hud/NovaGauge';
import { useNovaHint } from '~/hud/useNovaHint';
import { Version } from '~/hud/Version';
import { useT } from '~/i18n/useLanguage';
import { NavMenu } from '~/navigation/NavMenu';
import { useSectionScroll } from '~/navigation/useSectionScroll';
import { NOVA_NIVEIS } from '~/scene/scenePlan';
import { SpaceCanvas } from '~/scene/SpaceCanvas';
import { AboutSection } from '~/sections/about/AboutSection';
import { ContactSection } from '~/sections/contact/ContactSection';
import { HeroSection } from '~/sections/hero/HeroSection';
import { JourneySection } from '~/sections/journey/JourneySection';
import { ProjectsSection } from '~/sections/projects/ProjectsSection';
import styles from './App.module.css';

/**
 * Montagem da página.
 *
 * Três planos empilhados: o canvas ao fundo, o HUD fixo por cima dele e o
 * contêiner de seções (com `scroll-snap`) na frente. Só o contêiner rola — o
 * documento tem `overflow: hidden`.
 *
 * O App é a única peça que conhece a lista de seções. Cada seção só sabe se está
 * ativa; nenhuma sabe qual é a sua vizinha nem o seu índice.
 *
 * Também é ele quem liga a supernova ao seu medidor: a cena avisa que uma
 * estrela foi acesa, com o nível que a carga atingiu, e o HUD desenha a recarga
 * **daquele nível**. Os dois lados leem a mesma `NOVA_NIVEIS`, então o círculo
 * fecha exatamente quando o próximo disparo passa a ser aceito.
 *
 * Um contador e um número são todo o estado que isso custa, e eles mudam uma vez
 * por disparo. O que acontece **durante** a carga (o poço, o plasma, o horizonte,
 * o estalo de cada promoção) vive inteiro na cena, sob o dedo do visitante: é
 * onde a informação já está, e o React não precisa render por quadro para
 * mostrá-la.
 *
 * O mesmo contador alimenta a dica da supernova: o aviso do canto superior
 * esquerdo só existe enquanto ele estiver em zero (ver `useNovaHint`).
 */
export function App() {
  const { ref, indice, irPara, seguirFracao, soltarFracao } = useSectionScroll();
  const chaveAtiva = SECOES[indice]?.key ?? 'inicio';
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
      <LanguageToggle />

      <div ref={ref} className={styles.rolagem}>
        <HeroSection />
        <AboutSection ativo={chaveAtiva === 'sobre'} />
        <ProjectsSection ativo={chaveAtiva === 'projetos'} />
        <JourneySection ativo={chaveAtiva === 'experiencia'} />
        <ContactSection ativo={chaveAtiva === 'contato'} />
      </div>

      <NavMenu
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
