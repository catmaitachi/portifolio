/// <reference types="vite/client" />

/**
 * Versão exibida no HUD, injetada pelo Vite (`define`) a partir do
 * `package.json` — ver `vite.config.ts`. É constante de build, não variável de
 * ambiente: não existe em tempo de execução fora do bundle.
 */
declare const __VERSAO__: string;
