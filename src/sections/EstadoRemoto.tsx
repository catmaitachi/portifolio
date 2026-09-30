import type { CSSProperties, ReactNode } from 'react';
import { useT } from '~/i18n/useLanguage';
import styles from './EstadoRemoto.module.css';

/** Os estados em que a seção não tem o dado para desenhar. */
export type SemDado = 'carregando' | 'erro' | 'vazio';

interface EstadoRemotoProps {
  estado: SemDado;
  /**
   * O texto no lugar do de `remoto`, para um vazio que tem motivo próprio: em
   * Projetos, "nada selecionado ainda" diz mais que "nada por aqui".
   */
  texto?: string;
  /**
   * A forma da seção, sem o conteúdo: as mesmas caixas e grades que ela
   * desenha quando o dado chega, montadas com as classes dela e com `Traco` no
   * lugar do texto. Esperando, a forma respira sozinha, sem texto à vista;
   * vazia ou com erro, ela fica parada e apagada, com o aviso por cima.
   */
  children?: ReactNode;
}

/**
 * O que a seção mostra quando não há o que mostrar, ainda ou nunca.
 *
 * As seções que leem dado de fora têm exatamente os mesmos três estados, e
 * escrever a linha em cada uma seria vários lugares para manter a mesma frase e
 * o mesmo `aria-busy`. Os textos vêm de `remoto` nos dicionários, como todo o
 * resto.
 *
 * **A forma é a da seção**, e não um bloco genérico. Uma linha solta no lugar
 * de uma parede de capas faz a página pular quando o dado chega, e diz menos
 * sobre o que vem: a moldura já conta que ali vão capas.
 *
 * **Esperar e falhar não são a mesma coisa**, e a distinção é o motivo de a
 * função de `api/` nunca responder 200 com corpo vazio: sem ela, uma chave
 * errada apareceria aqui como "nada por aqui ainda", e a página afirmaria uma
 * coisa que não sabe.
 */
export function EstadoRemoto({ estado, texto, children }: EstadoRemotoProps) {
  const t = useT();
  const aviso = (
    <p
      className={styles.estado}
      data-estado={estado}
      /* enquanto busca, o conteúdo ainda não é conteúdo; é a mesma marca que a
         bio cifrada usa enquanto se decifra */
      aria-busy={estado === 'carregando' || undefined}
      role="status"
    >
      {texto ?? t.remoto[estado]}
    </p>
  );

  if (!children) return aviso;

  return (
    <div className={styles.molde} data-estado={estado}>
      {/* desenho: quem usa leitor de tela ouve só o aviso */}
      <div className={styles.forma} aria-hidden="true" inert>
        {children}
      </div>
      {aviso}
    </div>
  );
}

/** Uma linha de texto que ainda não chegou, na altura da fonte de onde está. */
export function Traco({ w = '60%' }: { w?: string }) {
  return <span className={styles.traco} style={{ '--w': w } as CSSProperties} />;
}
