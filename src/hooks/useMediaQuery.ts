import { useEffect, useState } from 'react';

/**
 * Uma media query como valor booleano reativo.
 *
 * Existe para o que o CSS não alcança: decisões que mudam **geometria**, não
 * estilo — quantas vagas cabem na janela da linha do tempo, por exemplo. O CSS
 * continua responsável por tudo que é aparência; quando a largura precisa mudar
 * um número que o JavaScript usa para calcular, ela precisa chegar até aqui.
 *
 * É reativo porque a largura muda com a rotação do aparelho e com o
 * redimensionamento da janela, e nenhuma das duas pode deixar a página operando
 * sobre a medida antiga.
 */
export function useMediaQuery(consulta: string): boolean {
  const [combina, setCombina] = useState(
    () => typeof matchMedia === 'function' && matchMedia(consulta).matches,
  );

  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const mq = matchMedia(consulta);
    const aoMudar = () => setCombina(mq.matches);
    // a largura pode ter mudado entre o primeiro render e este efeito
    aoMudar();
    mq.addEventListener('change', aoMudar);
    return () => mq.removeEventListener('change', aoMudar);
  }, [consulta]);

  return combina;
}

/** O `≤640px` do resto da página: onde o layout vira coluna. */
export const TELA_ESTREITA = '(width <= 640px)';
