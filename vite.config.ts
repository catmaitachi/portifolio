import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// `~` aponta para src/: imports entre módulos não dependem da profundidade da pasta.
export default defineConfig({
  base: './',
  plugins: [react()],
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
