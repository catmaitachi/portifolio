import { useCallback, useMemo, useState } from 'react';
import { isPerfil, PERFIL_PADRAO, secoesDoPerfil, type PerfilKey, type SectionKey } from '~/content';

const CHAVE = 'portfolio.perfil';

export interface Profile {
  perfil: PerfilKey;
  /** a ordem de rolagem que o perfil produz */
  secoes: SectionKey[];
  escolher: (p: PerfilKey) => void;
}

/**
 * Perfil de acesso escolhido, persistido como o idioma.
 *
 * Guardar a escolha não é conveniência de implementação: quem voltar ao
 * portfólio provavelmente volta pelo mesmo motivo, e obrigá-lo a reafirmar isso
 * a cada visita transformaria uma preferência numa pergunta.
 *
 * A leitura do `localStorage` é tolerante de propósito. Ela pode falhar (janela
 * anônima, cookies bloqueados) e pode devolver um perfil que não existe mais
 * numa versão futura — nos dois casos o padrão assume, porque um portfólio que
 * não abre por causa de uma preferência guardada errou a ordem das prioridades.
 */
export function useProfile(): Profile {
  const [perfil, setPerfil] = useState<PerfilKey>(() => {
    try {
      const salvo = localStorage.getItem(CHAVE);
      if (isPerfil(salvo)) return salvo;
    } catch {
      /* sem armazenamento: o padrão serve */
    }
    return PERFIL_PADRAO;
  });

  const escolher = useCallback((p: PerfilKey) => {
    setPerfil(p);
    try {
      localStorage.setItem(CHAVE, p);
    } catch {
      /* a escolha vale para esta visita mesmo sem poder ser guardada */
    }
  }, []);

  // a ordem só muda quando o perfil muda: sem o memo, cada render do `App`
  // entregaria um array novo ao `NavMenu` e o faria re-renderizar de graça
  const secoes = useMemo(() => secoesDoPerfil(perfil), [perfil]);

  return { perfil, secoes, escolher };
}
