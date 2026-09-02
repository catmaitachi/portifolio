import { Fragment, useCallback, useState } from 'react';
import type { SectionKey } from '~/content';
import { Credit } from '~/hud/Credit';
import { Hud } from '~/hud/Hud';
import { LanguageToggle } from '~/hud/LanguageToggle';
import { Notice } from '~/hud/Notice';
import { NovaGauge } from '~/hud/NovaGauge';
import { ProfilePicker } from '~/hud/ProfilePicker';
import { useNovaHint } from '~/hud/useNovaHint';
import { useProfile } from '~/hud/useProfile';
import { Version } from '~/hud/Version';
import { useT } from '~/i18n/useLanguage';
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

interface Montagem {
  ativo: boolean;
  indice: string;
}

/**
 * Qual componente responde por cada chave de seção.
 *
 * É o único lugar do projeto que faz essa ligação, e existe porque a **ordem
 * deixou de ser fixa**: com o perfil de acesso reordenando a rolagem, o JSX não
 * pode mais listar as seções de cima para baixo. Nenhuma seção ganha
 * conhecimento novo com isso — ela continua recebendo só `ativo` e o número que
 * lhe cabe.
 */
const MONTAR: Record<SectionKey, (p: Montagem) => React.ReactNode> = {
  inicio: () => <HeroSection />,
  sobre: (p) => <AboutSection {...p} />,
  projetos: (p) => <ProjectsSection {...p} />,
  experiencia: (p) => <JourneySection {...p} />,
  contato: (p) => <ContactSection {...p} />,
};

/**
 * Montagem da página.
 *
 * Três planos empilhados: o canvas ao fundo, o HUD fixo por cima dele e o
 * contêiner de seções (com `scroll-snap`) na frente. Só o contêiner rola — o
 * documento tem `overflow: hidden`.
 *
 * O App é a única peça que conhece a lista de seções **e a ordem em que elas
 * saem**. Cada seção só sabe se está ativa e que número ocupa; nenhuma sabe qual
 * é a sua vizinha.
 *
 * O perfil de acesso é dele pelo mesmo motivo: escolher um perfil é reordenar a
 * rolagem, e a ordem é a única coisa que o App sabe e as seções não. A cena não
 * é tocada por isso — `CEUS` é indexado por **chave**, então cada seção leva o
 * próprio céu para onde for.
 *
 * Também é ele quem liga a supernova ao seu medidor: a cena avisa que uma
 * estrela foi acesa e o HUD desenha a recarga. Os dois recebem o **mesmo**
 * `DURACAO.novaRecarga`, então o círculo fecha exatamente quando o próximo
 * disparo passa a ser aceito. Um contador é todo o estado que isso custa, e ele
 * muda no máximo uma vez a cada recarga.
 *
 * O mesmo contador alimenta a dica da supernova: o aviso do canto superior
 * esquerdo só existe enquanto ele estiver em zero (ver `useNovaHint`).
 */
export function App() {
  const { perfil, secoes, escolher } = useProfile();
  const { ref, indice, irPara } = useSectionScroll(secoes.length);
  const chaveAtiva = secoes[indice] ?? 'inicio';
  const [novas, setNovas] = useState(0);
  const aoAcender = useCallback(() => setNovas((n) => n + 1), []);
  const dica = useNovaHint(novas);
  const t = useT();

  return (
    <div className={styles.palco}>
      <SpaceCanvas secao={chaveAtiva} onNova={aoAcender} />
      <Hud ativo={chaveAtiva === 'inicio'} />
      <LanguageToggle />
      <ProfilePicker perfil={perfil} escolher={escolher} ativo={chaveAtiva === 'inicio'} />

      <div ref={ref} className={styles.rolagem}>
        {/**
         * `Fragment`, nunca um elemento de embrulho: as seções precisam ser
         * **filhas diretas** de `.rolagem` para o `scroll-snap` valer, e o filtro
         * da supernova exige que o alvo do toque seja a caixa de uma `<section>`
         * — uma `<div>` no meio quebraria os dois de uma vez.
         */}
        {secoes.map((key, i) => (
          <Fragment key={key}>
            {/* o número é a posição na ordem escolhida; a abertura não numera */}
            {MONTAR[key]({ ativo: chaveAtiva === key, indice: String(i).padStart(2, '0') })}
          </Fragment>
        ))}
      </div>

      <NavMenu secoes={secoes} indice={indice} irPara={irPara} />
      <Credit />
      <Version />
      <NovaGauge disparo={novas} segundos={DURACAO.novaRecarga} />
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
