import { useT } from '~/i18n/useLanguage';
import styles from './EstadoRemoto.module.css';

interface EstadoRemotoProps {
  estado: 'carregando' | 'erro' | 'vazio';
}

/**
 * A linha que aparece quando não há o que mostrar, ainda ou nunca.
 *
 * As três seções que leem dado de fora têm exatamente os mesmos três estados, e
 * escrever a linha em cada uma seria três lugares para manter a mesma frase e o
 * mesmo `aria-busy`. Os textos vêm de `remoto` nos dicionários, como todo o
 * resto.
 *
 * **Esperar e falhar não são a mesma coisa**, e a distinção é o motivo de a
 * função de `api/` nunca responder 200 com corpo vazio: sem ela, uma chave
 * errada apareceria aqui como "nada por aqui ainda", e a página afirmaria uma
 * coisa que não sabe.
 */
export function EstadoRemoto({ estado }: EstadoRemotoProps) {
  const t = useT();

  return (
    <p
      className={styles.estado}
      data-estado={estado}
      /* enquanto busca, o conteúdo ainda não é conteúdo; é a mesma marca que a
         bio cifrada usa enquanto se decifra */
      aria-busy={estado === 'carregando' || undefined}
      role="status"
    >
      {t.remoto[estado]}
    </p>
  );
}
