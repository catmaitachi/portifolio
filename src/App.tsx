import { useCallback, useState } from 'react';
import { SECOES } from '~/content';
import { Credit } from '~/hud/Credit';
import { Hud } from '~/hud/Hud';
import { LanguageToggle } from '~/hud/LanguageToggle';
import { NovaGauge } from '~/hud/NovaGauge';
import { Version } from '~/hud/Version';
import { NavMenu } from '~/navigation/NavMenu';
import { useSectionScroll } from '~/navigation/useSectionScroll';
import { DURACAO } from '~/scene/scenePlan';
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
 * estrela foi acesa e o HUD desenha a recarga. Os dois recebem o **mesmo**
 * `DURACAO.novaRecarga`, então o círculo fecha exatamente quando o próximo
 * disparo passa a ser aceito. Um contador é todo o estado que isso custa, e ele
 * muda no máximo uma vez a cada recarga.
 */
export function App() {
  const { ref, indice, irPara } = useSectionScroll();
  const chaveAtiva = SECOES[indice]?.key ?? 'inicio';
  const [novas, setNovas] = useState(0);
  const aoAcender = useCallback(() => setNovas((n) => n + 1), []);

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

      <NavMenu indice={indice} irPara={irPara} />
      <Credit />
      <Version />
      <NovaGauge disparo={novas} segundos={DURACAO.novaRecarga} />
    </div>
  );
}
