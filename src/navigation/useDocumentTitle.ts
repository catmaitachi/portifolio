import { useEffect } from 'react';
import { format, type SectionKey, type TelaKey } from '~/content';
import { useT } from '~/i18n/useLanguage';

/**
 * O título da aba acompanha onde o visitante está.
 *
 * A página é uma só e nunca recarrega, então sem isto a aba diria a mesma coisa
 * do começo ao fim, e quem abrisse dois lugares do site em duas abas não teria
 * como distingui-las. O histórico do navegador tem o mesmo problema: ele guarda o
 * título de cada entrada, e são as trocas de tela que viram entrada (ver
 * `useHashRoute`).
 *
 * **No Início a parte é o nome da tela, não o da seção.** "Início" não diz nada
 * a quem olha a aba; "Dossiê" diz onde se está.
 *
 * O texto sai do dicionário como todo o resto, com marcador em vez de
 * concatenação: a ordem das palavras é do idioma, e inverter as duas partes é
 * editar uma string em vez de mexer aqui.
 */
export function useDocumentTitle(tela: TelaKey, parte: SectionKey): void {
  const t = useT();

  useEffect(() => {
    const nome = parte === 'inicio' ? t.telas[tela] : t.nav[parte];
    document.title = format(t.documento, { parte: nome, nome: t.hero.nome });
  }, [t, tela, parte]);
}
