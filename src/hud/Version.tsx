import styles from './Version.module.css';

/**
 * Versão do projeto, no canto inferior direito.
 *
 * O número vem do `package.json` pelo `define` do Vite (`__VERSAO__`), não de uma
 * string escrita aqui: a versão publicada e a versão exibida não podem divergir.
 *
 * Não passa pelo i18n de propósito — "v1.0" não é texto, é um dado idêntico nos
 * dois idiomas, e uma chave por idioma só criaria dois lugares para errar.
 */
export function Version() {
  return <span className={styles.versao}>{__VERSAO__}</span>;
}
