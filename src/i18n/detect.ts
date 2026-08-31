import { isLang, type Lang } from '~/content';

export const CHAVE_ARMAZENAMENTO = 'portfolio.lang';

const LANG_PADRAO: Lang = 'pt';

/**
 * Escolha inicial do idioma, em ordem de prioridade:
 * escolha salva → idioma do navegador → português.
 *
 * O `try/catch` cobre navegação privada e cookies bloqueados, onde só ler o
 * `localStorage` já lança.
 */
export function detectarIdioma(): Lang {
  try {
    const salvo = localStorage.getItem(CHAVE_ARMAZENAMENTO);
    if (isLang(salvo)) return salvo;
  } catch {
    /* armazenamento indisponível: segue para o navegador */
  }

  const nav = typeof navigator !== 'undefined' ? navigator.language : '';
  if (nav.toLowerCase().startsWith('pt')) return 'pt';
  if (nav.toLowerCase().startsWith('en')) return 'en';
  return LANG_PADRAO;
}

/** Persiste a escolha. Falhar aqui não pode derrubar a troca de idioma. */
export function salvarIdioma(lang: Lang): void {
  try {
    localStorage.setItem(CHAVE_ARMAZENAMENTO, lang);
  } catch {
    /* sem persistência: o idioma vale só para esta visita */
  }
}
