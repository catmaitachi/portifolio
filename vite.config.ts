import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { existsSync, readFileSync } from 'node:fs';
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

/**
 * As funções de `api/` também respondem em desenvolvimento.
 *
 * Em produção quem as serve é a Vercel; aqui elas são carregadas pelo próprio
 * Vite (`ssrLoadModule`, com HMR de graça) e recebem o `req`/`res` do servidor de
 * desenvolvimento. Sem isto seria preciso um segundo comando (`vercel dev`) e a
 * CLI da Vercel instalada só para abrir o projeto.
 *
 * É **só desenvolvimento**: o plugin tem `apply: 'serve'` e nada disto entra no
 * build.
 *
 * Os segredos vêm de `.env.local` para o `process.env`, porque é de lá que as
 * funções os leem — na Vercel elas encontram as variáveis do painel no mesmo
 * lugar, e o código não precisa saber em qual dos dois está.
 *
 * **A leitura é por requisição, não na subida.** Um segredo acrescentado com o
 * servidor no ar não fazia efeito, e o sintoma era a função respondendo que a
 * variável faltava enquanto ela estava no arquivo, à vista. São dois `readFile`
 * numa rota que já vai atravessar a rede; a confusão custava mais.
 */
function apiEmDesenvolvimento(): Plugin {
  let modo = 'development';
  return {
    name: 'api-local',
    apply: 'serve',
    configResolved(config) {
      modo = config.mode;
    },
    configureServer(servidor) {
      servidor.middlewares.use(async (req, res, proximo) => {
        const rota = /^\/api\/([a-z0-9-]+)(?:\?|$)/.exec(req.url ?? '');
        if (!rota) return proximo();
        Object.assign(process.env, loadEnv(modo, process.cwd(), ''));
        // rota que não existe é 404, e não o 500 do módulo que falhou ao carregar
        if (!existsSync(fileURLToPath(new URL(`./api/${rota[1]}.ts`, import.meta.url)))) {
          res.statusCode = 404;
          res.end();
          return;
        }
        try {
          const modulo = (await servidor.ssrLoadModule(`/api/${rota[1]}.ts`)) as {
            default: (q: typeof req, s: typeof res) => Promise<void>;
          };
          await modulo.default(req, res);
        } catch (e) {
          servidor.ssrFixStacktrace(e as Error);
          res.statusCode = 500;
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ erro: (e as Error).message }));
        }
      });
    },
  };
}

// `~` aponta para src/: imports entre módulos não dependem da profundidade da pasta.
export default defineConfig({
  base: './',
  plugins: [react(), apiEmDesenvolvimento()],
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
