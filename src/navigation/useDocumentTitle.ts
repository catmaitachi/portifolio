import { useEffect } from 'react';
import { format, type ModoKey, type SectionKey } from '~/content';
import { useT } from '~/i18n/useLanguage';

/**
 * O título da aba acompanha onde o visitante está.
 *
 * A página é uma só e nunca recarrega, então sem isto a aba diria a mesma coisa
 * do começo ao fim — e com o endereço já mudando de seção, quem abrisse dois
 * lugares do site em duas abas não teria como distingui-las. O histórico do
 * navegador tem o mesmo problema: ele guarda o título de cada entrada, e são as
 * trocas de modo que viram entrada (ver `useHashRoute`).
 *
 * **No Início a parte é a etiqueta do modo, não o nome da seção.** "Início" não
 * diz em que lado do site alguém está, e é justamente ali que os dois lados
 * mostram a mesma seção com textos diferentes.
 *
 * O texto sai do dicionário como todo o resto, com marcador em vez de
 * concatenação: a ordem das palavras é do idioma, e inverter as duas partes é
 * editar uma string em vez de mexer aqui. E ele muda junto com o idioma de
 * graça, porque `t` está nas dependências.
 */
export function useDocumentTitle(modo: ModoKey, secao: SectionKey): void {
  const t = useT();

  useEffect(() => {
    const parte = secao === 'inicio' ? t.modos[modo].etiqueta : t.nav[secao];
    document.title = format(t.documento, { parte, nome: t.hero.nome });
  }, [t, modo, secao]);
}
