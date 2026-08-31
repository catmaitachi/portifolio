import { SECOES } from '~/content';
import { Credit } from '~/hud/Credit';
import { Hud } from '~/hud/Hud';
import { LanguageToggle } from '~/hud/LanguageToggle';
import { NavMenu } from '~/navigation/NavMenu';
import { useSectionScroll } from '~/navigation/useSectionScroll';
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
 */
export function App() {
  const { ref, indice, irPara } = useSectionScroll();
  const chaveAtiva = SECOES[indice]?.key ?? 'inicio';

  return (
    <div className={styles.palco}>
      <SpaceCanvas secao={chaveAtiva} />
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
    </div>
  );
}
