import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

/**
 * A versão exibida na página vem do `package.json`, nunca de uma string escrita à
 * mão: publicar uma versão e mostrar outra é o tipo de divergência que ninguém
 * percebe. Do `semver` só entram `major.minor` — o `patch` não interessa a quem
 * está lendo o rodapé.
 *
 * A leitura é por `readFileSync` em vez de `import ... with { type: 'json' }`
 * para não depender do modo de resolução de módulos do TypeScript neste arquivo.
 */
const { version } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string };

const VERSAO = `v${version.split('.').slice(0, 2).join('.')}`;

// `~` aponta para src/: imports entre módulos não dependem da profundidade da pasta.
export default defineConfig({
  base: './',
  plugins: [react()],
  define: { __VERSAO__: JSON.stringify(VERSAO) },
  resolve: {
    alias: { '~': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2022',
    // o motor de cena é pesado e independente da UI: sai num chunk próprio,
    // baixado em paralelo com o bundle da aplicação.
    rollupOptions: {
      output: {
        manualChunks: (id) => (id.includes('/src/engine/') ? 'space-engine' : undefined),
      },
    },
  },
});
