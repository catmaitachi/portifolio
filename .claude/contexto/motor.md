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

O desenho da estrela seguiu o mesmo caminho e mora em `engine/star.ts`: os sprites, o tamanho na
tela, a deriva, o alongamento da lente e o `dentroDoAlcance` que decide se o puxão é gravidade de
verdade. Três camadas desenham estrelas (`Starfield`, `Supernova`, `Constellations`) e elas ficam lado
a lado no mesmo céu, então divergir ali é visível na hora — antes disso os números estavam
duplicados em duas delas com uma nota pedindo que mudassem juntos.

O plasma seguiu o mesmo caminho e mora em `engine/plasma.ts`: `criarPlasma(size)` devolve um buffer e
um `pintar(t)`, e o `BlackHole` e a `Supernova` criam cada um o seu. Aqui as duas não precisam
concordar em nada, mas o efeito é por pixel e traz junto uma máscara, uma tabela de contraste e um
`ImageData` — duplicar isso numa segunda camada seria duplicar o trecho mais caro do motor.

### Camadas

| Camada | Arquivo | z | Notas |
|---|---|---|---|
| `Nebula` | `layers/nebula.ts` | 0 | Buffer de 128px, 5 massas brancas em deriva, repintado a 12fps e ampliado pela GPU. alpha 0.16. |
| `Starfield` | `layers/starfield.ts` | 10 | ~354 estrelas num 1280×720 (densidade por área), TypedArrays, repulsão do ponteiro por mola, gravidade de `engine/gravity.ts` e cintilar via LUT, 8 baldes de opacidade. O desenho é o sprite de `engine/star.ts` por `drawImage`, com deriva ambiente de 8px e a lente da gravidade esticando o brilho. Cintilar lento (±22%). |
| `Constellations` | `layers/constellations.ts` | 12 | Figuras do céu real. Estrelas herdam as propriedades do `Starfield`; linha de 1px num único `stroke()`; as estrelas saem do mesmo sprite de `engine/star.ts`, sem deriva e sem lente; posições do quadro em `vx_/vy_` pré-alocados. As arestas se desenham das pontas para dentro quando a camada aparece (`drawTime`). `opacity` em 0 tira a camada do `update` **e** do `draw`. |
| `BlackHole` | `layers/blackHole.ts` | 20 | Raio `0.14·min(W,H)`. Plasma 96×96 por LUT de senos a 20fps (alpha .22), 260 poeiras em órbita kepleriana, halo .18/.06 até 3.4R (degradês em cache por centro/raio/força), horizonte preto + borda **preta** suavizando — nunca borda brilhante. |
| `Supernova` | `layers/supernova.ts` | 14 | A estrela que o visitante carrega e acende. Pressionar abre um poço (`bus.well`) que aperta em quatro níveis; soltar explode com força, alcance, duração e recarga daquele nível. Pool de 12 estrelas (guardadas em fração da tela), uma onda de cada vez, carga e recarga no relógio do motor. Plasma a partir do nível 2 (criado na primeira vez), estrela massiva num buffer de disco no 3, e no 4 ela implode com um pico de 3,2× no puxão e vira um horizonte de 22px com poeira. Degradês em cache com `globalAlpha`, e nem o pulso nem o raio da estrela entram na chave do cache. Ociosa custa três comparações. |
| `Meteors` | `layers/meteors.ts` | 30 | Pool de 3, intervalo 4–13s, rastro por gradiente linear. |

### O brilho, a deriva e a lente

Uma estrela **não é um ponto**. O desenho vem de `engine/star.ts`, que assa o `Star()` do shader
do Galaxy pixel a pixel em dois sprites — o brilho (núcleo saturado mais halo) e as oito pontas — e
as três camadas que desenham estrelas usam os mesmos. É o arranjo de `gravity.ts` e `plasma.ts`, e
aqui pesa mais: elas ficam lado a lado no mesmo céu, e uma desenhada com outra linguagem salta aos
olhos.

**A consequência que motivou tudo:** esticar um borrão dá um rastro suave; esticar um ponto dava um
risco de 1px, que foi o que existiu aqui por uma versão e não se parecia com gravidade.

Dois números não são cópia literal do shader, e não deveriam ser:

- **a queda do halo é `1/d²`, não `1/d`.** Lá o campo é avaliado por fragmento com
  `uGlowIntensity = 0.3`, o que dá halo fraco e núcleo nítido de graça. Aqui o sprite é *reduzido*
  até o tamanho da estrela na tela: assar com 0,3 põe o núcleo em meio pixel e o filtro bilinear o
  come; assar com 1 deixa o halo três vezes mais forte que o de lá, e o céu vira uma parede de
  bolhas com 4,7% de luminância média. Com o expoente 2 o núcleo fica nos 5% do raio e o halo cai
  para o nível do componente (0,111 contra 0,100 em d=0,15);
- **a afiação dos raios é 380, não 1000.** Pelo mesmo motivo de escala: 1000 daria um traço de
  0,48px na tela, que some na redução. 380 devolve os ~1,3px que o componente mostra.

Em ambos, copiar o número seria menos fiel que copiar o resultado.

**A densidade acompanha o brilho.** `density` foi de 3250 para 2600 px² por estrela: um ponto de 1px
pedia volume para o céu ler como céu, um brilho de 14 a 34px tem presença, e amontoá-los vira névoa.
São 354 estrelas num 1280×720, com 0,09% de luminância média — pontos nítidos sobre preto.

**A deriva** (8px, em períodos de 12s e 30s) vive só no `draw`. Somada ao deslocamento ela entraria
na mola, no puxão e no teste da lente, e um céu que respira viraria um céu sempre sendo puxado. Os
períodos são diferentes em X e Y de propósito: o vagar é de Lissajous, não um circulinho. Ela entra
por `camera.fade` durante o zoom da intro, senão haveria um pulo de 8px no quadro em que ele termina.

**A lente** estica o brilho na direção do deslocamento, e é o que substituiu o traço:

- **só com gravidade de verdade** — `bus.gravity` ou `bus.well`, nunca a repulsão do ponteiro, que
  empurra na mesma ordem de grandeza mas leria como rastro de mouse. O portão é `dentroDoAlcance`;
- **o alongamento está ao quadrado**, e é o que faz o buraco negro parecer estar num lugar. No shader
  o que estica não é o deslocamento, é o **gradiente** dele: o campo desloca com `1/d` e estica com
  `1/d²`, então longe do centro as estrelas andam muito e deformam pouco. Aqui o deslocamento vem da
  mola, que satura, e usá-lo cru esticava 70% do céu a 2x — uma tela inteira borrada. Ao quadrado a
  mediana cai para perto de 1,2x e só o miolo chega a 2,4x;
- **estica no comprimento e mantém a largura.** Comprimir no eixo curto, que é o que uma lente faz,
  devolveria o risco fino; assim o rastro é sempre ao menos tão largo quanto a estrela;
- **o alfa cai com `1/√s`**, porque um borrão esticado espalha a mesma luz por mais área. Sem isso a
  estrela puxada ficaria mais brilhante que a parada.

**O custo.** No pior caso — seção Início, buraco negro em presença total e carga no último nível —
são ~700 `drawImage` e ~620 `setTransform` por quadro, com 0,8ms de lógica em JS e nenhum degradê
recriado. A assadura dos dois sprites custa 3,8ms, uma vez, junto do `import()` do motor.

**`setTransform` é destrutivo.** O palco monta a matriz uma vez no `resize` e o laço só devolve
`globalAlpha` e `globalCompositeOperation` entre camadas. Quem mexer nela **tem** de devolvê-la ao
sair: as três camadas de estrelas fazem isso na última linha do `draw`.

As estrelas das figuras não têm deriva nem lente, e cada exclusão tem motivo próprio: a deriva
desmancharia a forma, que é justamente o que se quer reconhecer; e a lente seria promessa falsa,
porque o `update` de lá só tem ponteiro e mola, nunca `puxar` — esticar o que não se move seria
desenhar uma física que não existe.

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
