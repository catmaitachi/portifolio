import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DICT, type Lang } from '~/content';
import { LanguageContext, type LanguageValue } from './context';
import { detectarIdioma, salvarIdioma } from './detect';

/**
 * Provedor de idioma.
 *
 * Trocar de idioma é um `setState`: nada recarrega e o canvas não é remontado —
 * o motor de cena vive fora da árvore do React e é agnóstico a idioma.
 *
 * O estado inicial vem de um inicializador preguiçoso, então `localStorage` e
 * `navigator.language` são lidos uma vez, e não a cada render.
 *
 * O idioma é refletido em `<html lang>` por efeito, e não nos dois callbacks de
 * troca: a primeira carga também precisa dele. Um visitante detectado como `en`
 * ficava com o `lang="pt-BR"` do `index.html` até trocar de idioma na mão — e é
 * esse atributo que escolhe o dicionário de hifenização dos parágrafos.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(detectarIdioma);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const definir = useCallback((proximo: Lang) => {
    salvarIdioma(proximo);
    setLang(proximo);
  }, []);

  const alternar = useCallback(() => {
    setLang((atual) => {
      const proximo: Lang = atual === 'pt' ? 'en' : 'pt';
      salvarIdioma(proximo);
      return proximo;
    });
  }, []);

  const value = useMemo<LanguageValue>(
    () => ({ lang, t: DICT[lang], alternar, definir }),
    [lang, alternar, definir],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
