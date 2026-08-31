import { useEffect, useState } from 'react';

const CONSULTA = '(prefers-reduced-motion: reduce)';

/**
 * Preferência de menos movimento, reativa.
 *
 * O CSS já trata suas próprias animações (ver `styles/reset.css`); este hook
 * existe para o que o CSS não alcança — a deriva do carrossel, a inclinação do
 * retrato e o zoom de abertura da câmera, que vivem em JavaScript e canvas.
 *
 * É reativo porque a preferência do sistema pode mudar com a página aberta.
 */
export function useReducedMotion(): boolean {
  const [reduzido, setReduzido] = useState(
    () => typeof matchMedia === 'function' && matchMedia(CONSULTA).matches,
  );

  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const mq = matchMedia(CONSULTA);
    const aoMudar = () => setReduzido(mq.matches);
    mq.addEventListener('change', aoMudar);
    return () => mq.removeEventListener('change', aoMudar);
  }, []);

  return reduzido;
}
