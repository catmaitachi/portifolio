## Motor de cena (`src/engine/`)

`createStage(canvas, layers)` é dono do canvas, do DPR (teto 2), do resize, do ponteiro, do relógio,
do rAF e da pausa em aba oculta. É a única peça que fala com o navegador — por isso `destroy()`
basta para desmontar a cena inteira.

Camada = `{ name, z, enabled, resize(env), update(env), draw(ctx, env) }`.
Ordem do array = ordem de `update`; `z` = ordem de desenho.

`env`: `W H dpr cx cy t dt mouse{x,y,active} camera{k,moving,progress,fade} bus{}`.
`env.bus` é o barramento entre camadas: `bus.gravity`, publicada pelo `BlackHole`, e `bus.well` e
`bus.shock`, publicadas pela `Supernova` (a carga e a explosão) — as três lidas pelo `Starfield`, que
não sabe quem as publicou. `well` é do **mesmo tipo** que `gravity`, então o consumidor soma os dois
poços com o mesmo `puxar`.
**Uma camada nunca importa outra.**

O puxão do buraco negro mora em `engine/gravity.ts`, e as duas camadas que o sentem (`Starfield` e
`Supernova`) importam **de lá**, não uma da outra. Elas precisam concordar: as estrelas acesas ficam
lado a lado com as do campo no mesmo céu, e uma conta divergente salta aos olhos. O módulo separa
**preparar** de **puxar** por causa do contrato de desempenho — `reach²` e a recíproca do alcance não
podem ser recalculadas nas ~1120 estrelas de cada quadro, então cada camada guarda o próprio campo
preparado e o próprio destino, e nada ali é estado compartilhado.

O plasma seguiu o mesmo caminho e mora em `engine/plasma.ts`: `criarPlasma(size)` devolve um buffer e
um `pintar(t)`, e o `BlackHole` e a `Supernova` criam cada um o seu. Aqui as duas não precisam
concordar em nada, mas o efeito é por pixel e traz junto uma máscara, uma tabela de contraste e um
`ImageData` — duplicar isso numa segunda camada seria duplicar o trecho mais caro do motor.

### Camadas

| Camada | Arquivo | z | Notas |
|---|---|---|---|
| `Nebula` | `layers/nebula.ts` | 0 | Buffer de 128px, 5 massas brancas em deriva, repintado a 12fps e ampliado pela GPU. alpha 0.16. |
| `Starfield` | `layers/starfield.ts` | 10 | ~1120 estrelas (densidade por área), TypedArrays, repulsão do ponteiro por mola, gravidade de `engine/gravity.ts` e cintilar via LUT, 8 baldes de opacidade = 8 `fill()`/quadro. Estrela com raio < 1px vai como `rect`, não `arc` — são 82% delas. Cintilar lento (±22%). Um segundo passe por balde desenha o brilho em cruz e o streak num `stroke()` só. |
| `Constellations` | `layers/constellations.ts` | 12 | Figuras do céu real. Estrelas herdam as propriedades do `Starfield`; linha de 1px num único `stroke()`; posições do quadro em `vx_/vy_` pré-alocados. As arestas se desenham das pontas para dentro quando a camada aparece (`drawTime`). `opacity` em 0 tira a camada do `update` **e** do `draw`. |
| `BlackHole` | `layers/blackHole.ts` | 20 | Raio `0.14·min(W,H)`. Plasma 96×96 por LUT de senos a 20fps (alpha .22), 260 poeiras em órbita kepleriana, halo .18/.06 até 3.4R (degradês em cache por centro/raio/força), horizonte preto + borda **preta** suavizando — nunca borda brilhante. |
| `Supernova` | `layers/supernova.ts` | 14 | A estrela que o visitante carrega e acende. Pressionar abre um poço (`bus.well`) que aperta em quatro níveis; soltar explode com força, alcance, duração e recarga daquele nível. Pool de 12 estrelas (guardadas em fração da tela), uma onda de cada vez, carga e recarga no relógio do motor. Plasma a partir do nível 2 (criado na primeira vez), estrela massiva num buffer de disco no 3, e no 4 ela implode com um pico de 3,2× no puxão e vira um horizonte de 22px com poeira. Degradês em cache com `globalAlpha`, e nem o pulso nem o raio da estrela entram na chave do cache. Ociosa custa três comparações. |
| `Meteors` | `layers/meteors.ts` | 30 | Pool de 3, intervalo 4–13s, rastro por gradiente linear. |

### Deriva, cruz e streak

Três coisas que o campo de estrelas ganhou no `draw`, e **só no `draw`**: nada disso entra em
`sdx`/`sdy`, porque ali passariam pela mola, pelo puxão e pelo teste de streak.

- **A deriva ambiente** (0,9px de amplitude a 0,16 de velocidade) reaproveita a fase do cintilar
  (`sph`), então não custa um array novo. Ela some durante o zoom da intro, como o ponteiro e a
  gravidade: um céu que ainda está chegando não lê como ambiente, lê como tremor. E entra **depois**
  da transformação da câmera, senão o zoom a multiplicaria por 26.
- **O brilho em cruz** é das estrelas com raio ≥ 1.1, que é o começo real da faixa grande no
  `resize`. Com o `R_QUADRADO` (=1) entrariam também as pequenas entre 1.0 e 1.05, e a cruz deixaria
  de ser a marca das maiores. Cada braço mede 2,4 raios: o maior dá ~9,5px, um terço do espaçamento
  típico entre estrelas. Mais que isso e a cruz vira ruído.
- **O streak só existe com gravidade de verdade**, `bus.gravity` ou `bus.well`. O deslocamento
  grande sozinho não basta: a repulsão do ponteiro empurra na mesma ordem de grandeza, e um traço
  atrás do cursor não é gravidade, é rastro de mouse. O teste é `dentroDoAlcance`, função pura sobre
  os dois campos que o quadro já preparou. Ele é uma **fração** (0,2) do deslocamento, com teto de
  46px: com o deslocamento cru, 60% dos traços encostavam no teto e todos ficavam do mesmo tamanho,
  que é o oposto do que o traço existe para dizer.

**O desenho é em lote, e isso não é preciosismo.** O alcance do buraco negro é `raio·6.2`, ~625px
numa tela 1280×720, e o deslocamento de equilíbrio já passa dos 16px em cerca de 60% dele: na seção
Início cerca de 140 estrelas são candidatas a traço em qualquer quadro. Um `stroke()` por estrela
seriam centenas de chamadas por quadro, o tempo todo. Como está, o quadro custa no máximo
**8 `fill()` + 8 `stroke()`**, e esse número não depende de quantas estrelas estão sendo puxadas.

As posições do segundo passe são **recomputadas**, não guardadas: um array a mais por quadro é
alocação. A conta precisa ser a mesma do primeiro passe (mesma deriva, mesmo zoom, mesmo corte de
bordas), senão a cruz sai do lugar do ponto.

Para os dois campos preparados chegarem ao `draw`, `temGrav`/`temPoco` viraram estado de escopo da
camada. `update` roda sempre antes do `draw` no mesmo quadro (ordem do array em `createStage`).

As estrelas acesas da supernova ganham os mesmos dois desenhos, com os mesmos números, porque ficam
lado a lado com as do campo no mesmo céu. Lá o pool é de 12, então o `stroke()` sai por estrela e
não em lote. `dentroDoAlcance` está duplicado nas duas camadas com a nota de sempre: **uma camada
nunca importa outra**, e mexer num número pede mexer no outro.

### Contrato de desempenho

Obrigatório para qualquer camada nova:

- zero alocação por quadro (TypedArrays criados no `resize`);
- trigonometria pesada → LUT (`fastSin`/`fastCos`);
- efeitos de pixel → buffer pequeno + `drawImage` ampliado, abaixo de 60fps;
- desenho em lote (agrupar por opacidade, um `fill()` por grupo);
- camada desligada precisa custar zero.

### Constelações

O catálogo (`engine/catalog/constellations.ts`) guarda **ascensão reta (h), declinação (°) e
magnitude aparente** reais. A projeção equirretangular (comprimida por `cos(dec)`) e a normalização
pela caixa acontecem no `resize` — por isso a forma é fiel e a proporção, correta. Magnitude menor =
estrela maior e mais brilhante.

Disponíveis: `cancer`, `ursaMajor`, `pegasus`, `phoenix`, `orion`, `crux`, `cassiopeia`, `cygnus`.

Detalhes que já custaram uma iteração e não devem ser desfeitos:

- **Órion** segue uma carta específica: 19 estrelas, cabeça só com Meissa (os ombros não se ligam
  entre si, passam por ela), tronco, cinturão de três, pernas fechadas embaixo (Saiph–Rigel), braço
  erguido (μ→ξ) com a clava **aberta** no alto (χ¹–ξ–ν–χ²) e o arco do escudo (π¹…π⁶) ligado a
  Bellatrix. **Sem espada.** Versões com triângulo φ na cabeça, espada ou clava fechada foram
  descartadas.
- **Pégaso** guarda a RA de Algenib/Alpheratz como **24.2/24.1**. Sem esse desdobramento a volta das
  24h rasga o Grande Quadrado ao meio na projeção.
- **Fênix** tem duas juntas (κ e β) de onde saem os raios, ψ–δ fechando a asa e α–ε fechando o
  triângulo da cabeça.

Posicionamento: `placements: [{ key, x, y, size, rotate, flip }]` — `x/y` em fração da tela, `size`
em fração de `min(W,H)`.

### As figuras se desenham das pontas

Quando a camada volta a aparecer, as arestas entram **uma a uma, do miolo para as pontas**, e cada
linha cresce de dentro para fora: a figura se abre a partir do próprio centro.

Achar o miolo é um problema de grafo, não de geometria. Uma primeira busca em largura a partir de
**todas as pontas** (vértices de grau 1) dá, para cada vértice, a distância até a ponta mais
próxima; o mais central é o que ficou mais longe de todas elas. Uma segunda busca, agora a partir
dele, dá a distância ao centro — e é ela que **ordena** as arestas e as **orienta**. São duas buscas
porque o centro precisa ser encontrado antes de servir de semente. Figura fechada (um ciclo, sem
nenhum grau 1) não tem ponta nem miolo: ali qualquer vértice serve de começo.

**O ritmo acelera.** Os inícios não são igualmente espaçados: saem de `k^0.62`, e com expoente menor
que 1 a curva sobe rápido no começo, o que deixa os primeiros intervalos longos e os últimos curtos.
A figura hesita nas primeiras linhas e se fecha em rajada — que é como um traçado ganha corpo, e o
contrário de um metrônomo.

Tudo isso é calculado no `resize`, e o que sobra por quadro é uma interpolação por aresta (com o
recíproco da duração pré-calculado, para não haver uma divisão por aresta por quadro).

Três coisas que decorrem disso:

- **A própria camada percebe que está aparecendo** (`opacity` cruzando de ~0 para cima) e reinicia o
  relógio. O `scenePlan` continua só mexendo em `opacity` — ele não sabe que existe um traçado aqui
  dentro, e um céu novo o ganha de graça.
- **Passado o traçado, o custo volta a zero**: o laço tem um `if` fora dele e nenhuma conta a mais
  por aresta. É o estado na esmagadora maioria dos quadros.
- **`drawTime: 0` desliga**, e é o que o `SpaceCanvas` passa com `prefers-reduced-motion`.

### Câmera

`stage.camera.zoomOut(26, 1.5)` — a intro começa dentro do horizonte e recua em 1,5s (ease
`1−(1−p)⁴`). Durante o zoom, gravidade e repulsão ficam desligadas e estrelas fora da tela são
descartadas. `camera.fade` (0→1 entre 35% e 85% do trajeto) controla a entrada da nebulosa.

Com `prefers-reduced-motion: reduce` o zoom não acontece e os tweens de cena têm duração zero.
