# Portfólio — arquitetura e decisões

Documento vivo. **Atualizar sempre que uma camada, seção ou animação for adicionada/alterada.**

SPA em React 19 + TypeScript + Vite. Tema espacial, paleta estritamente monocromática, cinco seções
navegáveis por rolagem com snap.

```
npm install
npm run dev          # servidor de desenvolvimento
npm run build        # tsc -b && vite build
npm run lint         # só a checagem de tipos
npm run check:i18n   # confere se pt.json e en.json continuam paralelos
```

---

## Como o projeto se divide

| Pasta | Papel | Conhece |
|---|---|---|
| `src/engine/` | Motor de cena em canvas 2D. Uma camada por elemento visual. | nada do projeto |
| `src/content/` | Dicionários JSON, tipos e registro de imagens. | nada |
| `src/i18n/` | Idioma corrente, detecção e persistência. | `content` |
| `src/scene/` | Ponte React ↔ motor e a cena de cada seção. | `engine`, `content` |
| `src/navigation/` | Rolagem por seções, teclado e menu. | `content`, `i18n` |
| `src/hud/` | Anéis, mira, seletor de idioma, crédito, versão. | `i18n` |
| `src/sections/` | Uma pasta por seção. | `content`, `i18n`, componentes |
| `src/components/` | Peças genéricas (`Figure`). | nada |
| `src/hooks/` | Hooks transversais (`useReducedMotion`). | nada |

A dependência só aponta para baixo nessa tabela. **Nenhuma seção importa outra**, e nenhuma sabe o
próprio índice — recebe apenas `ativo: boolean`. Quem conhece a lista de seções é o `App`.

O alias `~` aponta para `src/`: mover um arquivo de pasta não quebra os imports dos vizinhos.

---

## Direção visual

- Preto profundo, **paleta estritamente monocromática** (preto/branco). Sem cor, sem gradiente
  colorido. A única exceção é o vermelho da marca UFMG, que é logo de terceiro.
- Estética sci-fi/HUD minimalista: linhas de 1px, tracejados finos, tipografia mono
  (IBM Plex Mono 200/300/400).
- Tudo sutil. A intensidade foi reduzida várias vezes na fase de design (nebulosa, halo, borda do
  horizonte) — ao mexer nesses valores, mexer para baixo.

---

## Motor de cena (`src/engine/`)

`createStage(canvas, layers)` é dono do canvas, do DPR (teto 2), do resize, do ponteiro, do relógio,
do rAF e da pausa em aba oculta. É a única peça que fala com o navegador — por isso `destroy()`
basta para desmontar a cena inteira.

Camada = `{ name, z, enabled, resize(env), update(env), draw(ctx, env) }`.
Ordem do array = ordem de `update`; `z` = ordem de desenho.

`env`: `W H dpr cx cy t dt mouse{x,y,active} camera{k,moving,progress,fade} bus{}`.
`env.bus` é o barramento entre camadas — hoje só `bus.gravity`, publicada pelo `BlackHole` e lida
pelo `Starfield`. **Uma camada nunca importa outra.**

### Camadas

| Camada | Arquivo | z | Notas |
|---|---|---|---|
| `Nebula` | `layers/nebula.ts` | 0 | Buffer de 128px, 5 massas brancas em deriva, repintado a 12fps e ampliado pela GPU. alpha 0.16. |
| `Starfield` | `layers/starfield.ts` | 10 | ~1120 estrelas (densidade por área), TypedArrays, repulsão do ponteiro por mola, gravidade via LUT, 8 baldes de opacidade = 8 `fill()`/quadro. Cintilar lento (±22%). |
| `Constellations` | `layers/constellations.ts` | 12 | Figuras do céu real. Estrelas herdam as propriedades do `Starfield`; linha de 1px num único `stroke()`; posições do quadro em `vx_/vy_` pré-alocados. `opacity` em 0 tira a camada do `update` **e** do `draw`. |
| `BlackHole` | `layers/blackHole.ts` | 20 | Raio `0.14·min(W,H)`. Plasma 96×96 por LUT de senos a 20fps (alpha .22), 260 poeiras em órbita kepleriana, halo .18/.06 até 3.4R (degradês em cache por centro/raio/força), horizonte preto + borda **preta** suavizando — nunca borda brilhante. |
| `Meteors` | `layers/meteors.ts` | 30 | Pool de 3, intervalo 4–13s, rastro por gradiente linear. |

### Contrato de desempenho

Obrigatório para qualquer camada nova:

- zero alocação por quadro (TypedArrays criados no `resize`);
- trigonometria pesada → LUT (`fastSin`);
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

### Câmera

`stage.camera.zoomOut(26, 1.5)` — a intro começa dentro do horizonte e recua em 1,5s (ease
`1−(1−p)⁴`). Durante o zoom, gravidade e repulsão ficam desligadas e estrelas fora da tela são
descartadas. `camera.fade` (0→1 entre 35% e 85% do trajeto) controla a entrada da nebulosa.

Com `prefers-reduced-motion: reduce` o zoom não acontece e os tweens de cena têm duração zero.

---

## Cena por seção (`src/scene/`)

`SpaceCanvas` é a **única** ponte entre React e o motor. O canvas fica fora do ciclo de render e a
única coisa que atravessa a fronteira é a seção ativa — trocar de idioma, abrir um projeto ou
navegar na linha do tempo não toca na cena. O motor entra por `import()` dinâmico e sai num chunk
próprio no build; nada da primeira pintura depende dele.

`scenePlan.ts` guarda a cena como **dado**:

- o buraco negro existe só na seção `inicio` — `tween(bh, 'strength', 0, 1.8)` encolhe e apaga (o
  raio é `R0·strength·camera.k`), o que lê como afastamento;
- cada outra seção tem um céu próprio, e a troca é um cruzamento de opacidades;
- **cada seção ocupa uma diagonal diferente do céu.** Nunca repetir as coordenadas de um `placement`
  entre seções — a troca fica invisível.

`tween(obj, key, to, dur)` interpola qualquer propriedade num rAF próprio, cancelando o anterior na
mesma propriedade.

**Adicionar uma seção com céu próprio:** uma entrada em `CEUS`. O `SpaceCanvas` monta a camada e a
liga/desliga sozinho.

---

## Idiomas (i18n)

**Nenhuma string literal na interface** — inclusive os rótulos de acessibilidade. Todo texto vem de
`src/content/pt.json` e `en.json`, lidos por `useT()`.

- `content/types.ts` é o contrato; `content/index.ts` o aplica com `satisfies`. Chave faltando ou
  estado inventado **quebra o build**, não a tela do visitante.
- `npm run check:i18n` pega o que o tipo não pega: listas fora de ordem, item presente em só um
  idioma, marcador `{}` diferente entre os idiomas.
- Texto com valor variável usa **marcador**, nunca concatenação:
  `"assunto": "Contato pelo portfólio — {nome}"` + `format(texto, { nome })`. A ordem das palavras é
  do idioma, não do código.
- O idioma fica no estado do `LanguageProvider`, persistido em `localStorage` (`portfolio.lang`) e
  semeado por `navigator.language` na primeira visita. Trocar idioma é um `setState`: nada recarrega
  e o canvas não é remontado.
- **Regra de layout:** conteúdo em EN costuma ser ~20% mais curto que PT. Nada de largura fixa
  calculada em cima de uma frase — usar `min-width` e `text-wrap: pretty`.

Idiomas: **PT** (padrão) e **EN**.

---

## Editar o conteúdo

Tudo que é texto ou dado do portfólio vive em `src/content/`. Nenhuma dessas edições exige tocar em
componente.

| Arquivo | O que guarda |
|---|---|
| `pt.json` / `en.json` | Todo o texto, nos dois idiomas. Mesmas chaves, mesmas listas, mesma ordem. |
| `shared.json` | O que não muda entre idiomas: ordem das seções, canais de contato, escala óptica dos logos. |
| `assets.ts` | Registro de imagens. JSON não importa arquivo, e o Vite precisa do `import` para versionar o asset. |

### Adicionar um projeto

Uma entrada em `projetos.lista` nos **dois** dicionários, com a mesma `key` e na mesma posição:

```json
{
  "key": "meu-projeto",
  "nome": "Meu Projeto",
  "linha": "Uma linha de resumo, sob o nome.",
  "descricao": "Texto do painel que cobre o cartão quando aberto.",
  "ano": "2026",
  "papel": "Full stack",
  "stack": ["React", "TypeScript"],
  "estado": "ativo",
  "url": "https://exemplo.com"
}
```

- `estado`: `ativo` / `arquivado` (barra cheia) ou `definir` (barra vazia). **`definir` é vaga**:
  gira na órbita, mas não abre descrição.
- `url` vazia esconde o link *ver ao vivo*.
- `banner` vazio deixa a moldura de espaço reservado. Para preencher, importe a imagem em
  `assets.ts` e ponha a URL aqui.

### Adicionar uma experiência

Uma entrada em `experiencia.lista` nos dois dicionários. A lista está em **ordem cronológica**
(mais antiga à esquerda) e o evento ativo inicial é o mais recente.

```json
{
  "key": "empresa-2026-01",
  "cargo": "Cargo",
  "org": "Organização",
  "periodo": "2026.01",
  "tipo": "estagio",
  "bullets": ["Até três atividades."],
  "stack": ["Até", "quatro", "itens"]
}
```

`tipo` precisa existir em `experiencia.tipos` (`academico`, `evento`, `estagio`, `freela`).
`periodo` é **ano.mês** e é rótulo, não posição — o espaçamento na curva é sempre uniforme.

### Adicionar uma formação

1. o logo em `src/assets/logos/` (branco sobre transparente, margens recortadas);
2. uma linha em `LOGOS` (`assets.ts`);
3. a escala óptica em `shared.json → logos`;
4. uma entrada em `formacoes.lista` nos dois dicionários, com o mesmo `slot`.

`estado`: `concluido` (barra 100%), `cursando` (50%) ou `pretensao` (0%, tracejado e apagado).

### Trocar o retrato

Solte o arquivo em `src/assets/`, importe-o em `assets.ts` e atribua a `RETRATO`. Vazio = moldura de
espaço reservado. Hoje é `src/assets/retrato.jpg`: o design apontava direto para o avatar do GitHub,
e uma imagem servida por terceiro deixa o retrato à mercê de uma indisponibilidade — além de escapar
do versionamento do Vite.

### Adicionar uma seção

1. entrada em `shared.json → secoes` (a ordem ali **é** a ordem de rolagem);
2. a chave em `nav`, nos dois dicionários, e em `SectionKey` (`content/types.ts`);
3. um componente em `src/sections/`, montado no `App`;
4. opcionalmente, um céu em `scene/scenePlan.ts`.

---

## Seções e navegação

Contêiner `.rolagem` (fixo, `scroll-snap-type: y mandatory`, barra oculta) sobre o canvas; cada
seção tem `height: 100%` e `scroll-snap-align: start`. **Só ele rola** — o documento tem
`overflow: hidden`. O canvas e o HUD ficam fixos atrás.

Sobre, Projetos, Trajetória e Contato compartilham a mesma **composição aberta** (`section.module.css`,
puxada por `composes`): índice + risco, título grande, conteúdo sem moldura, bordas de 1px a 13% com
raio de 2px. Entram por opacidade + 26px de deslocamento quando a seção é a ativa.

`useSectionScroll` lê o índice num rAF por rajada de scroll e só faz `setState` quando ele **muda**.
O teclado (↑/↓, PageUp/Down, Home/End) é global, mas **sai do caminho quando o foco está num campo
de texto** — senão a navegação roubaria o cursor do formulário de contato.

Menu vertical à direita: rótulo + risco de 1px que cresce (12px → 34px) na seção ativa. No mobile é
uma faixa horizontal que desliza para pôr a seção ativa no centro (`--navdx`, medido em coordenadas
de layout `offsetLeft`/`offsetWidth` — imunes ao `transform` já aplicado ao próprio nav).

**No mobile o risco ativo cresce em escala, não em largura** — e isso não é cosmético. `--navdx` é
medido **um quadro depois** da troca de seção; se a largura do risco fizesse parte do layout, a
faixa inteira estaria reflowando durante os 0.45s da transição e a medida sairia sobre uma geometria
que ainda ia se acomodar. O traço ativo parava exatamente 11px — `(34−12)/2` — fora do centro, para
o lado de onde veio. Com `--nav-risco-w` fixo e o crescimento em `scaleX`, o layout da faixa é
invariante: a medida continua vindo do DOM, sem número duplicado no JS, e acerta o centro em
qualquer índice. Os comprimentos vivem sem unidade (`--nav-risco: 12`, `--nav-risco-ativo: 34`)
justamente para que a escala seja a razão entre eles.

Fora da seção `inicio` o HUD cai para opacidade .16.

---

## HUD

Diâmetro `82.35vmin`, calculado para que o **anel interno (inset 33%) coincida com o horizonte**
(28vmin). Quatro anéis: inset 33% / 20% / 9% / 0, girando alternadamente em 60s / 96s / 150s
(o externo é estático — é a referência parada contra a qual os outros se movem).

Cronograma da abertura:

1. `0–1.5s` zoom out (canvas)
2. `1.5–2.9s` anéis se formam **de baixo para cima**, do interno ao externo, 0.22s entre eles
   (`ringIn` com `clip-path`)
3. `2.9s` mira (4 ticks cardinais) surge com `miraIn` e passa a pulsar em cascata

Depois, na página: etiqueta 3.5s → nome 3.75s (`tituloIn`: borrão + `letter-spacing` fechando) →
legenda 4.5s → menu 4.9s → crédito 5.2s → seletor de idioma 5.4s → versão 5.6s.

Tudo em `transform` e `clip-path` = compositor da GPU, zero custo de CPU.

### Versão

`Version` fica no canto inferior direito, alinhada ao mesmo recuo do menu e do seletor
(`max(3.2vw, 26px)`). No mobile vai para o centro e encosta no rodapé, com o mesmo recuo de borda do
seletor de idioma no topo (`max(2.4vh, 20px)`) — os dois são espelho um do outro. O crédito não
disputa espaço ali: em ≤640px ele sai de cena, porque a faixa de baixo é do menu.

O número **não é uma string escrita no componente nem uma chave de dicionário**: vem do `version` do
`package.json` por `define` do Vite (`__VERSAO__`, tipado em `vite-env.d.ts`), reduzido a
`major.minor`. Publicar uma versão e exibir outra é uma divergência que ninguém percebe até
constranger. E ela fica fora do i18n de propósito: `v1.0` é dado, não texto — uma chave por idioma
só criaria dois lugares para errar.

### `@keyframes` vive no módulo que o usa

**Nunca declarar `@keyframes` num CSS global para usá-lo de dentro de um `.module.css`.** CSS Modules
escopa os **dois** lados — o nome no `@keyframes` *e* o nome escrito em `animation`. Um keyframe
global chamado `fina` nunca casa com o `_fina_a1b2c_1` que o módulo passa a pedir: a animação
simplesmente não roda, sem erro de build e sem aviso no console.

Foi assim que a abertura inteira ficou morta por um tempo (anéis parados, mira sem pulso, crédito
descentralizado). `animation: :global(nome)` **não** é saída: o parser do PostCSS recusa o `:` no
valor. A saída é declarar o keyframe no próprio módulo — `fina` está duplicado em três (Hero,
NavMenu, LanguageToggle), e quatro linhas repetidas custam menos que uma animação que não roda.

Corolário: **layout não pode morar só no estado final de uma animação.** O crédito é centrado por um
`transform: translateX(-50%)` na própria regra, e os riscos já nascem com `width: 34px` — `creditIn`
e `creditLine` só refazem o caminho até lá. Quando a animação falhou, foi esse acoplamento que virou
um bug visível em vez de uma entrada mais seca.

---

## Responsivo por tokens

Cada componente declara seus tokens com os valores base **na própria regra**, e cada media query só
os **redefine**. Nada de duplicar padding/altura em regra nova, nada de `!important`.

| Onde | Tokens |
|---|---|
| `section.module.css` | `--pt --pb --px --gap` |
| `AboutSection` | `--cols --corpo-gap --retrato --txt --pfs --plh` |
| `EducationCarousel` | `--bw` |
| `ProjectsSection` | `--pcw --pch --pbh --ph --pr --pperspectiva --pcard` |
| `JourneySection` | `--exph --exp-cargo --exp-per --exp-curva --exp-rail --exp-fantasma --exp-gap --exp-txt --exp-topo` |
| `ContactSection` | `--form-cols --enviar-just` |
| `NavMenu` | `--nav-top --nav-bottom --nav-left --nav-right --nav-tx --nav-ty --nav-dir --nav-align --nav-gap --nav-risco --nav-risco-ativo --nav-risco-w --nav-risco-esc --nav-risco-rot` |
| `LanguageToggle` | `--lang-left --lang-right --lang-tx` |
| `Version` | `--ver-bottom --ver-left --ver-right --ver-tx` |

Faixas: `≤640px` (mobile: coluna única, nav horizontal, seletor centrado) e `≤720px de altura`
(telas baixas: retrato 150px, texto 22vh, paddings menores). **A segunda vem depois na cascata de
propósito** — em paisagem curta ela ganha nos tokens compartilhados, porque ali o gargalo é a altura.

`prefers-reduced-motion: reduce` zera animações e transições no CSS; o que vive em JavaScript
(deriva do carrossel, inclinação do retrato, zoom da câmera) consulta `useReducedMotion`.

---

## Seleção de texto

O padrão da página é **`user-select: none`** (`reset.css`, no `body`), e o conteúdo reabre a seleção
por **elemento**, não por classe: `h1 h2 h3 p li input textarea`. Título, subtítulo e parágrafo já
são esses elementos em toda a página, então a regra vale para o que existe hoje e para o que for
escrito depois — não há uma lista de classes para manter em sincronia.

O motivo é interação, não estética: metade da página é **superfície de arraste** (órbita de Projetos,
curva da Trajetória, carrossel de formações). Arrastar um controle não pode pintar meia tela de azul,
e uma seleção acidental engole o `pointerup` que decide se houve clique ou arrasto.

`input`/`textarea` **não são opcionais** na lista de exceções: no Safari, um `user-select: none`
herdado chega a impedir a digitação no campo. Por isso também o `-webkit-user-select` duplicado — o
Safari só dispensa o prefixo a partir da 17, e a sintaxe de faixa (`width <= 640px`) já roda desde a
16.4.

As exceções moram no módulo de quem as pede, nunca no global:

| Onde | O quê | Por quê |
|---|---|---|
| `section.module.css → .indice` | `none` | é `<p>` por semântica, mas lê como marcador: ninguém copia "01" |
| `HeroSection → .etiqueta` | `none` | ornamento do nome, entre dois riscos |
| `JourneyEntry → .numero` | `none` | copiar a atividade não deve trazer a numeração junto |
| `JourneyEntry → .org` | `text` | subtítulo do cargo, e `<span>` não entra na regra global |
| `ProjectCard → .linha` | `text` | idem, resumo sob o nome do projeto |
| `ContactSection → .email` | `text` | é um `<a>`, e existe justamente para ser copiado |

---

## Seção "Sobre"

- Seção com `overflow-y: auto` e centragem por **margens automáticas**
  (`.rolavel > *:first-child { margin-top: auto }` / `:last-child { margin-bottom: auto }`): fica
  centrada quando cabe e **rola** quando não cabe, sem cortar o topo. `justify-content: center`
  faria o conteúdo alto transbordar para fora do alcance da rolagem.
  **Toda seção rolável nova precisa de `.rolavel`.**
- Filhos com `flex: none` — sem `flex-shrink`, que antes comprimia e clipava os badges.
- Bloco de parágrafos com rolagem própria (`--txt`, barra de 3px, `overscroll-behavior: contain`):
  chegar ao fim da bio não pode encadear a rolagem para a seção.
- Retrato (`PortraitCard`): inclina seguindo o ponteiro com brilho especular, escrito **direto no
  `style`** dentro de um rAF coalescido. Um `setState` por `pointermove` re-renderizaria a seção
  dezenas de vezes por segundo para mudar dois números de `transform`.

### Carrossel de formações

Grade estática **enquanto os badges cabem**; vira carrossel só quando não cabem. Um `ResizeObserver`
compara `clientWidth` com `n·(bw+gap) − gap`, e **`bw`/`gap` são lidos do DOM**
(`children[0].offsetWidth`, `columnGap`) — nenhum número de layout duplicado no JS, então mexer no
CSS não exige mexer no hook.

- Badge de 312px (`--bw`; 246px no mobile): 3 × 312 + 2 × 12 = os 960px do bloco acima.
- Modo carrossel: trilho com **duas cópias** da lista; o laço reposiciona `(scrollWidth+gap)/2`, que
  é exatamente uma cópia mais o seu gap (a emenda é imperceptível).
- Rolagem **nativa** (swipe e inércia de graça) + deriva de ~34px/s num rAF com acumulador subpixel.
  Arraste, roda do mouse e ←/→ com foco pausam a deriva por 2,2s.

---

## Seção "Projetos"

**Carrossel em órbita 3D** (`useOrbit`). Os cartões ocupam pontos de um círculo horizontal; para
cada um, `ang = (i − ativo)·2π/n` dá `sen` (deslocamento em X) e `cos` (profundidade). Da
profundidade saem `escala` (.62→1), `foco` (opacidade) e `camada` (`z-index` 100±50). Um
`rotateY(−sen·34°)` inclina os laterais para dentro e o palco tem `perspective`.

O giro parece um anel de verdade, mas **todo texto continua de frente**: um anel com `preserve-3d`
esconderia os cartões de trás por `backface-visibility`, e com n=3 isso seria dois terços da lista.

**Nada de rAF**: `ativo` muda e as `transition` de `transform`/`opacity` (.95s) fazem a volta.
Girar: clique num cartão lateral, ←/→ com foco no palco, arraste de 46px ou os traços-índice abaixo.
O arraste é decidido no `pointerup` justamente para o clique no cartão continuar vivo.

`foco` tem **piso alto** (`.52 + .48·prof`; vaga `.34 + .3·prof`): com n=3 a profundidade dos
laterais é só .25 e um falloff linear os apagaria por completo no céu preto.

**Descrição cobre o cartão**: painel `inset: 0` sobre o cartão inteiro (por isso o cartão é
`position: relative`), de `translateY(100%)` a 0. O link *ver ao vivo* só entra na tabulação quando
aberto. Sair da seção fecha o painel.

Marcador geométrico por cartão: dois contornos de 1px com raio/rotação próprios, escolhidos pelo
índice entre quatro variantes.

---

## Seção "Trajetória"

**Curva animada + ficha estruturada.** Um palco de altura fixa (`--exph`) onde todas as fichas ficam
sobrepostas (`inset: 0`) e só a ativa aparece — opacidade + 18px de deslocamento, sem rAF, e o palco
não pula ao trocar. A ficha é uma grade `--exp-rail 1fr`: trilho com índice, risco em degradê e o
tipo escrito na vertical (`writing-mode`); no conteúdo, o período como **número fantasma**
(opacidade .075) atrás do cargo, organização com ponto, atividades numeradas e a stack em chips de 1px.

A geometria é matemática pura em `timelineGeometry.ts` — sem React e sem DOM.

- A onda está ancorada no **tempo**, não na tela: `y = 66 − 42·sen(2π(u − ⅛))` amostrada em 216
  pontos cobrindo **três janelas** (u de −1 a 2), calculada uma única vez. Navegar é um `translateX`
  no `<g>` — a onda anda junto com os nós e o caminho **nunca é recalculado**.
- Duas cópias do caminho: a cinza inteira e a branca de progresso, **cortada por um `clipPath`
  vertical** que vem do passado e para exatamente na data ativa. A curva é função de x, então a
  borda vertical do corte cai sobre o nó — erro de 0px por construção.
  *Tracejado com `pathLength` foi descartado: com `non-scaling-stroke` o dash é medido em pixels de
  tela e a escala do viewBox não é uniforme, então o traço passava do ponto.*
- Quatro `<circle>` com `<animateMotion>` de 39s (defasados em 13s) mantêm um pulso viajando pela curva.
- `vector-effect="non-scaling-stroke"` mantém 1px apesar do esticamento não uniforme.

**Janela de seis eventos, passo uniforme.** O espaçamento é sempre `1/5` da largura (`VAGAS=6`,
`PASSO`) — mais entradas não poluem a linha, elas entram pela janela, que desliza. A data é
**rótulo, não posição** (formato **ano.mês**). Com menos de seis entradas o grupo fica centrado
(`base`).

Os nós são **botões HTML por cima** do SVG, não `<circle>`: precisam de área de toque de 38px, foco
de teclado e um rótulo que não estica junto com o `preserveAspectRatio="none"`. Ficam posicionados
em `left/top` como % do mesmo viewBox. O rótulo troca de lado conforme a curva sobe ou desce.

Navegação: arrastar a curva (deslocamento **fracionário** enquanto o dedo está na tela — arrastar
1/5 da largura = um evento), as setas ←/→ (com foco no palco **e também sem foco**, enquanto a seção
estiver ativa) ou os dois botões de 38px abaixo da curva, que apagam nas pontas.
A navegação **não é circular**: as pontas são pontas.

**Nada de régua de anos** — tentada e descartada na fase de design ("deixa muita informação").

---

## Seção "Contato"

Composição aberta de 840px. Sem moldura: índice + título, intro, o **e-mail como link gigante**
(risco que acende no hover), formulário reduzido a uma linha e três cartões de canal.

- **Envio por `mailto:`** (`useMailto`) — sem back-end: abre o cliente do visitante. Assunto e
  assinatura vêm de textos com marcador `{nome}`. Mensagem vazia → `contato.erro` por 3,6s.
- O nome é **opcional**; só a mensagem é obrigatória. Exigir nome para receber uma linha de texto
  perde a linha.
- É um `<form>` com `onSubmit` de propósito: dá o Enter de graça em qualquer campo.
- O status vai num `aria-live` e **reserva altura mesmo vazio**, senão a mensagem de erro empurraria
  os cartões ao aparecer.
- Canal sem `url` é espaço reservado: tracejado, apagado e fora da navegação.
- Ícones em `src/assets/icons/` — **glifos brancos locais, nunca CDN**: um ícone que não carrega
  deixa o cartão visualmente vazio e o visitante não descobre qual rede é. O LinkedIn usa a marca só
  com as letras (viewBox 448×512); a versão com placa vira um bloco branco.

---

## Acessibilidade

- `aria-label` no nav, no seletor de idioma, no carrossel de projetos, na linha do tempo e no grupo
  de canais — todos vindos de `a11y` no dicionário. **Textos de a11y também passam pelo i18n**,
  nunca literais no componente.
- `aria-current` no item de seção ativo e no nó ativo da linha do tempo.
- Carrosséis como `role="group"` focáveis, navegáveis por setas.
- Fichas de trajetória inativas ficam `inert`: um leitor de tela não deve encontrar quatro empregos
  empilhados no mesmo lugar.
- O que está fora da janela ou do painel fechado sai da tabulação (`tabIndex -1`).
- Foco visível só para navegação por teclado (`:focus-visible`).

---

## Pendências

- **Descrição do ClinPlay** é rascunho — o próprio texto avisa (`projetos.lista[0].descricao`, nos
  dois dicionários). Substituir pelo que o projeto realmente faz.
- **Dois projetos são vagas** (`vaga-02`, `vaga-03`, estado `definir`): giram na órbita e não abrem
  descrição. Preencher quando houver projeto.
- **Banners de projeto** ainda não existem; as molduras aparecem como espaço reservado.
- TikTok está sem `url` em `shared.json`, então aparece como "em breve".
- **Feito com Claude** não volta a aparecer no rodapé após alterar entre mobile para desktop, deve ser corrigido.
- Entrar na sessão de **Projetos** ou **Trajetoria** não habilita automaticamente o uso das setas para interação com os elementos, deve ser corrigido.
- É necessário realizar uma revisão de qualidade geral do projeto, para garantir organização, escalabilidade, consistência, desempenho, acessibilidade e boas práticas.
- Planejamento da nova feature **Super-Nova**: ao clicar com o mouse no espaço, uma nova estrela deve surgir, causando uma onda de energia que empurra as estrelas próximas, deve haver um tempo de recarga da funcionalidade, simbolizado por um circulo no canfo inferior esquerdo da tela que se forma na medida que funcionalidade recarrega e depois some quando está disponivel novamente. ( O planejamento deve levar em consideração os criterios de otimização e usabilidade do site, não podendo comprometer nenhum deles )
- Nos bagdes de formação, quando em curso, deve ser possível ver abaixo da barra a fração de conclusão do curso, por exemplo: 4/8, a barra deve ser preenchida de acordo com a fração, essa informação deve ser exibida no hover do mouse, e quando concluido, deve ser exibido a data de conclusão do curso, essa informação deve ser exibida no hover do mouse.
