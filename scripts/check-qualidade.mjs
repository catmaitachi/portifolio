/**
 * Confere as regras do modo automático da qualidade (`src/engine/stage.ts`).
 *
 * Empacota o palco com esbuild e o roda em Node, com um canvas falso e um relógio
 * de mentira: cada quadro custa o que a "máquina" da simulação diz, pela
 * resolução e pela densidade que o nível pediu. Três máquinas:
 *
 * - boa: tem que chegar perto do ideal e ficar;
 * - boa, com um tranco de 1s a cada 8s (a página, não o canvas): não pode cair
 *   para o mínimo, que era o defeito da regra antiga;
 * - fraca: no piso ainda passa do limite, e tem que ir a 0 e à taxa de 30;
 * - celular: núcleo lento, que com o limite do computador ia ao mínimo e com o do
 *   toque (40%) tem que ficar no meio da escala;
 * - navegador preso a 30 quadros (modo de economia do celular): a cena é leve, e
 *   tem que mirar 30 sem baixar a qualidade.
 *
 * E a partida por um limite guardado: a cena começa no ideal dele.
 *
 * uso: npm run check:qualidade
 */
import { build } from 'esbuild';

const { outputFiles } = await build({
  entryPoints: ['src/engine/stage.ts'],
  bundle: true,
  format: 'esm',
  write: false,
  platform: 'neutral',
});
const codigo = `data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`;

let relogio = 0;
Object.defineProperty(globalThis, 'performance', { value: { now: () => relogio }, configurable: true });
let proximoQuadro = null;
globalThis.requestAnimationFrame = (cb) => ((proximoQuadro = cb), 1);
globalThis.cancelAnimationFrame = () => {};
globalThis.ResizeObserver = class {
  observe() {}
  disconnect() {}
};
globalThis.window = { devicePixelRatio: 1, addEventListener() {}, removeEventListener() {} };
globalThis.document = { hidden: false, addEventListener() {}, removeEventListener() {} };

const { createStage } = await import(codigo);

/** um contexto 2D que aceita qualquer chamada e não faz nada */
const ctx = new Proxy({}, { get: (_, k) => (k === 'canvas' ? undefined : () => {}), set: () => true });

/**
 * Roda uma máquina por `segundos` de cena e devolve o palco e o histórico do nível.
 * `custo(px, densidade)` é o trabalho de um quadro em ms; `tranco(t)` diz se a página
 * está ocupada naquele instante (os quadros atrasam sem o canvas ter culpa).
 */
function simular({ custo, segundos, tranco = () => false, preparar, opcoes, hz = 60 }) {
  relogio = 0;
  const canvas = { clientWidth: 1600, clientHeight: 900, width: 0, height: 0, dataset: {}, getContext: () => ctx };
  let env;
  const camada = {
    name: 'custo',
    z: 0,
    update(e) {
      env = e;
    },
    draw() {
      relogio += custo((canvas.width * canvas.height) / 1e6, env.densidade);
    },
  };
  const stage = createStage(canvas, [camada], opcoes);
  preparar?.(stage);
  const historico = [];
  let t = 0;
  while (t < segundos * 1000) {
    relogio = t;
    const cb = proximoQuadro;
    proximoQuadro = null;
    cb(t);
    // a página ocupada empurra o próximo quadro, como um tranco de verdade
    const ocupado = tranco(t / 1000) ? 30 : 0;
    const vsync = 1000 / hz;
    const fim = Math.max(relogio + ocupado, t + vsync);
    t = Math.ceil(fim / vsync - 1e-9) * vsync;
    if (historico.length === 0 || t - historico[historico.length - 1].t >= 1000) {
      historico.push({ t, ...stage.qualidade.ler() });
    }
  }
  return { stage, historico, final: stage.qualidade.ler() };
}

const falhas = [];
const conferir = (ok, msg) => {
  console.log(`${ok ? 'ok  ' : 'FALHA'} ${msg}`);
  if (!ok) falhas.push(msg);
};
const f2 = (v) => (v === null ? '—' : v.toFixed(2));

// boa: ~3,5ms por quadro com tudo cheio, o limite (25% de um núcleo) é 4,2ms
const boa = (px, dens) => 0.8 + 1.2 * px + 0.9 * dens;
{
  const { final } = simular({ custo: boa, segundos: 120 });
  conferir(final.limite !== null, `boa: a média do limite fechou (${f2(final.limite)})`);
  conferir(
    final.ideal !== null && Math.abs(final.q - final.ideal) < 0.12,
    `boa: o nível ${f2(final.q)} fica perto do ideal ${f2(final.ideal)}`,
  );
}

// boa com trancos: 1s de página ocupada a cada 8s
{
  const { final, historico } = simular({ custo: boa, segundos: 180, tranco: (s) => s % 8 < 1 });
  const minimo = Math.min(...historico.slice(30).map((h) => h.q));
  conferir(final.q >= 0.5, `trancos: o nível termina em ${f2(final.q)}, não no mínimo`);
  conferir(minimo >= 0.3, `trancos: depois de 30s o nível nunca passa de ${f2(minimo)} para baixo`);
}

// fraca: 5ms só de base, acima do limite até no piso
{
  const fraca = (px, dens) => 5 + 1.5 * px + 1 * dens;
  const { historico } = simular({ custo: fraca, segundos: 90 });
  const noPiso = historico.slice(20).every((h) => h.q === 0);
  const trinta = historico.some((h) => h.fps === 30);
  conferir(noPiso, 'fraca: fica no nível 0');
  conferir(trinta, 'fraca: usa a taxa de 30 como último recurso');
}

// celular: o piso já custa ~27% de um núcleo, acima do limite do computador e folgado no do toque
{
  const celular = (px, dens) => 3.5 + 1 * px + 1 * dens;
  const comum = simular({ custo: celular, segundos: 90 }).final;
  const toque = simular({ custo: celular, segundos: 90, opcoes: { consumo: 0.4 } }).final;
  conferir(comum.q < 0.15, `celular com o limite do computador: fica embaixo (${f2(comum.q)})`);
  conferir(toque.q >= 0.3 && toque.fps === 60, `celular com o limite do toque: ${f2(toque.q)} a ${toque.fps}fps`);
}

// navegador preso a 30 quadros, com a cena leve
{
  const { final } = simular({ custo: boa, segundos: 90, hz: 30 });
  conferir(final.fps === 30, `teto de 30 do navegador: a cena mira 30 (${final.fps})`);
  conferir(final.q >= 0.7, `teto de 30 do navegador: a qualidade fica (${f2(final.q)})`);
}

// a partida por um limite guardado
{
  const { historico } = simular({ custo: boa, segundos: 2, preparar: (s) => s.qualidade.comecar({ limite: 0.8, ideal: 0.7 }) });
  conferir(Math.abs(historico[0].q - 0.7) < 0.01, `guardado: começa no ideal (${f2(historico[0].q)})`);
}

if (falhas.length) {
  console.error(`\n${falhas.length} regra(s) quebrada(s).`);
  process.exit(1);
}
console.log('\nregras do modo automático em ordem.');
