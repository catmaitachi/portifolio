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
| `src/hud/` | Anéis, mira, seletor de idioma, crédito, versão, notificações. | `i18n` |
| `src/sections/` | Uma pasta por seção. | `content`, `i18n`, componentes |
| `src/components/` | Peças genéricas (`Figure`). | nada |
| `src/hooks/` | Hooks transversais (`useReducedMotion`, `useArrowKeys`, `useDecipher`). | nada |

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

### Cantos chanfrados

Todo retângulo de conteúdo com borda tem o canto **superior-esquerdo e o inferior-direito**
cortados em diagonal. Os outros dois seguem no raio de 2px de sempre — o chanfro em dois cantos
opostos dá direção ao bloco; nos quatro, a caixa vira um losango achatado e some a leitura de painel.

| Onde | Chanfro |
|---|---|
| `ProjectCard → .cartao` | 18px |
| `PortraitCard → .carta` | 14px |
| `ChannelCard → .canal` | 14px |
| `EducationCarousel → .badge` | 12px |
| `JourneySection → .seta` | 9px |
| `JourneyEntry → .chip` | 6px |

O tamanho acompanha o elemento: um chanfro fixo lê como recorte de canto num cartão grande e como
caixa amassada num chip de 21px de altura. **Nunca passar de metade do lado menor.**

A implementação é `corner-shape: bevel` + `border-radius: <chanfro> 2px`, dentro de um
`@supports (corner-shape: bevel)`. Três coisas decorreram disso e não devem ser desfeitas:

- **`clip-path` foi descartado.** Ele corta o elemento inteiro, e o `:focus-visible` do projeto tem
  `outline-offset: 3px` — o contorno de foco fica *fora* do border-box e seria apagado por completo.
  Um portfólio que perde o foco de teclado para ganhar um canto bonito trocou a coisa errada.
- **O `@supports` não é enfeite.** Sem ele, um navegador sem `corner-shape` aplicaria o
  `border-radius` grande e mostraria cantos bem arredondados — o oposto da estética de linha reta.
  Dentro do `@supports`, quem não tem a propriedade fica com os 2px de hoje.
- **A borda de 1px acompanha o corte sozinha**, e o mesmo vale para `border-style: dashed` (vaga,
  pretensão, canal sem `url`) e para o `overflow: hidden` do cartão e do retrato. Nada disso
  precisou de regra extra.

Ficam **de fora**, e por motivo: os campos do formulário de contato (`.entrada`, `.enviar`) são um
sublinhado de 1px, não uma caixa — não há canto para chanfrar; os marcadores geométricos do
`ProjectCard` (`.glifo`) são ornamento com raio e rotação próprios por índice; e tudo que é círculo
(anéis do HUD, nós da linha do tempo, medidor da supernova).

### Ícone da aba

`public/favicon.svg` — a cena da página reduzida a 32px: horizonte de eventos preto com borda
branca, uma órbita inclinada com duas estrelas e um punhado de estrelas soltas ao fundo. Preto e
branco, como o resto.

**Sem fundo.** O único preto do ícone é o miolo do horizonte; o resto é transparente e a barra de
abas aparece por trás. A consequência é que num tema de aba claro sobra só o disco preto — o anel e
as estrelas são brancos e somem. É a leitura desejada: o buraco negro continua sendo a forma, e o
campo estelar é o detalhe que se vê no tema escuro.

O `viewBox` é **32** para que as espessuras caiam em pixel inteiro quando a aba desenha a 16px — o
traço de 2 do horizonte vira 1px real. A órbita é desenhada **antes** do disco e some atrás dele no
meio: sobram as duas asas laterais, que é como um disco de acreção se lê quase de perfil.

SVG só, sem `.ico` nem PNG: é o formato que todos os navegadores atuais aceitam e o único que não
precisa de uma segunda cópia do desenho para manter em sincronia. No `index.html` o `href` é
**relativo** (`./favicon.svg`), como o `base: './'` do Vite — o portfólio também roda em subpasta.

---

## Motor de cena (`src/engine/`)

`createStage(canvas, layers)` é dono do canvas, do DPR (teto 2), do resize, do ponteiro, do relógio,
do rAF e da pausa em aba oculta. É a única peça que fala com o navegador — por isso `destroy()`
basta para desmontar a cena inteira.

Camada = `{ name, z, enabled, resize(env), update(env), draw(ctx, env) }`.
Ordem do array = ordem de `update`; `z` = ordem de desenho.

`env`: `W H dpr cx cy t dt mouse{x,y,active} camera{k,moving,progress,fade} bus{}`.
`env.bus` é o barramento entre camadas: `bus.gravity`, publicada pelo `BlackHole`, e `bus.shock`,
publicada pela `Supernova` — as duas lidas pelo `Starfield`, que não sabe quem as publicou.
**Uma camada nunca importa outra.**

### Camadas

| Camada | Arquivo | z | Notas |
|---|---|---|---|
| `Nebula` | `layers/nebula.ts` | 0 | Buffer de 128px, 5 massas brancas em deriva, repintado a 12fps e ampliado pela GPU. alpha 0.16. |
| `Starfield` | `layers/starfield.ts` | 10 | ~1120 estrelas (densidade por área), TypedArrays, repulsão do ponteiro por mola, gravidade e cintilar via LUT, 8 baldes de opacidade = 8 `fill()`/quadro. Estrela com raio < 1px vai como `rect`, não `arc` — são 82% delas. Cintilar lento (±22%). |
| `Constellations` | `layers/constellations.ts` | 12 | Figuras do céu real. Estrelas herdam as propriedades do `Starfield`; linha de 1px num único `stroke()`; posições do quadro em `vx_/vy_` pré-alocados. As arestas se desenham das pontas para dentro quando a camada aparece (`drawTime`). `opacity` em 0 tira a camada do `update` **e** do `draw`. |
| `BlackHole` | `layers/blackHole.ts` | 20 | Raio `0.14·min(W,H)`. Plasma 96×96 por LUT de senos a 20fps (alpha .22), 260 poeiras em órbita kepleriana, halo .18/.06 até 3.4R (degradês em cache por centro/raio/força), horizonte preto + borda **preta** suavizando — nunca borda brilhante. |
| `Supernova` | `layers/supernova.ts` | 14 | A estrela que o visitante acende. Pool de 12 estrelas (guardadas em fração da tela), uma onda de cada vez, recarga no relógio do motor. Depois de 4s a estrela passa a responder ao ponteiro. Ociosa custa duas comparações. |
| `Meteors` | `layers/meteors.ts` | 30 | Pool de 3, intervalo 4–13s, rastro por gradiente linear. |

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

## Super-Nova

Um toque no **vazio** acende uma estrela e solta uma onda de choque que empurra as estrelas
vizinhas. Tem recarga, e a recarga é desenhada por um anel no canto inferior esquerdo: o anel se
fecha enquanto a espera corre e some quando a funcionalidade volta. **Anel na tela = espere; sem
anel = pode.**

A feature atravessa três camadas do projeto, e cada uma sabe só a sua parte:

| Onde | O que decide |
|---|---|
| `engine/layers/supernova.ts` | a física e a recarga: onda, estrelas acesas, `disparar()` aceita ou recusa |
| `scene/SpaceCanvas.tsx` | **o que conta como toque no vazio** — conhecimento do DOM da página, não do motor |
| `hud/NovaGauge.tsx` | o anel de recarga, animado só por CSS |
| `hud/useNovaHint.ts` | quando sugerir a supernova a quem ainda não a descobriu (ver *A dica da supernova*) |

O `App` liga as pontas: recebe o aviso da cena e passa o **mesmo** `DURACAO.novaRecarga` para os
dois lados. Um círculo que fecha antes (ou depois) de o próximo disparo ser aceito mente para quem
está olhando.

**Por que o clique não chega ao canvas.** O contêiner de rolagem cobre a viewport inteira, e o
canvas fica atrás dele. Quem escuta é a janela, e o filtro é estrito: o alvo precisa ser o próprio
canvas ou a caixa de uma `<section>` — **nunca um descendente dela**. Clicar num cartão, num campo,
num botão ou no bloco de conteúdo é interação com a página, e a página vem primeiro. O par
`pointerdown`/`pointerup` com limite de `TOQUE_PARADO` px existe porque metade da tela é superfície
de arraste: um arraste da órbita, da curva ou da rolagem não pode terminar em estrela.

**Desempenho.** A onda vai para `env.bus.shock` e é o `Starfield` — que já percorre as ~1120
estrelas — quem a aplica, dentro do laço que já existe: sem onda, o custo é um `if` fora do laço.
`inner2`/`outer2` chegam prontos porque o teste é por estrela. Só o anel da frente empurra (o miolo
já foi varrido), e o empurrão entra como **deslocamento**, então a mola que já devolvia as estrelas
depois do ponteiro devolve estas também — nada aqui precisa lembrar de desfazer nada.

**A estrela nasce presa e solta depois.** Durante os primeiros `settle` segundos (4) ela ignora o
ponteiro: o cursor está exatamente em cima dela quando o clarão acontece, e uma estrela que fugisse
do dedo que a acendeu pareceria um erro. Passado esse tempo ela vira uma estrela como as outras — a
repulsão entra por uma rampa de 0,9s, nunca por um interruptor, e a mesma mola do `Starfield` a
devolve ao repouso quando o ponteiro sai. Os números da repulsão (110px, 26, mola 2.6) **espelham os
do `Starfield`**: uma camada não importa a outra, então mexer lá pede mexer aqui.

A força da onda está **calibrada contra o que a cena já tinha**: 620 px/s de pico desloca uma estrela em
~23px no auge da passagem da crista, a mesma ordem de grandeza da repulsão do ponteiro. Menos que
isso não lê como empurrão; muito mais e o céu sacode.

A recarga (3s) é maior que a onda (1,35s), e é essa folga que permite ao motor guardar **uma onda
só**. Encurtar a recarga para menos que a duração da onda quebra essa premissa — a partir daí seria
preciso um pool de ondas, e o `Starfield` teria de somar várias por estrela.

A recarga vive no **relógio do motor**, não num `setTimeout`: um cronômetro do navegador continua
andando com a aba escondida, e a cena não anda. E o medidor é uma animação de CSS de duração
`--recarga` — o React renderiza uma vez por disparo, não uma vez por quadro.

Com `prefers-reduced-motion: reduce` a supernova **não dispara**: a onda é movimento amplo e
inesperado, e o medidor perderia o sentido com as durações zeradas. É a mesma decisão do zoom da
câmera.

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
- `url` vazia esconde o link *ver ao vivo*. Escreva o endereço **completo**
  (`https://exemplo.com`): sem esquema, o `href` vira caminho relativo e o clique leva para
  `<raiz-do-portfólio>/exemplo.com`. `urlExterna()` (`content/links.ts`) prefixa `https://` quando
  falta, então o erro não chega ao visitante — mas o dado certo continua sendo o dado certo.
- `banner` é uma **chave de `BANNERS`** (`assets.ts`), não um caminho: o arquivo vai em
  `src/assets/banners/`, ganha uma linha em `BANNERS` e a mesma chave entra nos dois dicionários —
  JSON não importa arquivo, e o Vite precisa do `import` para versionar o asset. Ausente = a moldura
  de espaço reservado. Os banners são marcas dos próprios projetos e escapam da paleta
  monocromática pela mesma razão que o vermelho da UFMG: identidade de terceiro não se repinta.

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

```json
{
  "slot": "senac",
  "instituicao": "SENAC",
  "nivel": "Técnico",
  "curso": "Tecnologia da Informação",
  "estado": "concluido",
  "conclusao": "2022.12"
}
```

`estado`: `concluido` (barra 100%), `cursando` (a fração de `progresso`) ou `pretensao` (0%,
tracejado e apagado).

Os dois campos opcionais são o **detalhe** que a barra esconde e o hover revela (ver *Carrossel de
formações*):

- `conclusao` — quando terminou, em **ano.mês**, só para `concluido`;
- `progresso: { feito, total }` — etapas cumpridas, só para `cursando`. É ele que preenche a barra,
  o tempo todo; sem ele a barra volta aos 50% genéricos de antes.

Os dois são **dado, não texto**: vão idênticos nos dois dicionários, como a versão no rodapé. E
precisam estar nos dois — `npm run check:i18n` compara agora também os **campos de cada item** das
listas ligadas, justamente porque um campo opcional presente em só um idioma passa pelo TypeScript.

### Trocar o retrato

Solte o arquivo em `src/assets/`, importe-o em `assets.ts` e atribua a `RETRATO`. Vazio = moldura de
espaço reservado. Hoje é `src/assets/retrato.jpg`: o design apontava direto para o avatar do GitHub,
e uma imagem servida por terceiro deixa o retrato à mercê de uma indisponibilidade — além de escapar
do versionamento do Vite.

**Exporte em 720px de lado, JPEG qualidade 82** (~136 KB). A coluna do retrato mede ~269px no
desktop e 116–150px no mobile, então 720 já cobre DPR 2 com folga de zoom. O arquivo que estava aqui
tinha 2571px e 1,5 MB — mais de cinco vezes o JS e o CSS somados, para ser desenhado a um quarto do
tamanho. WebP foi medido e **não entrou**: no mesmo lado e qualidade ele economiza só ~8%, o que não
paga um `<picture>` e um segundo arquivo para manter em sincronia.

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

### As setas horizontais são da seção ativa

↑/↓ são da rolagem; **←/→ são de quem está na tela**. Chegar em Projetos ou em Trajetória rolando
já habilita as setas — não há clique prévio, porque quem rolou até ali não tem foco em lugar nenhum
e a tecla morreria no vazio.

Isso vive num lugar só: `useArrowKeys(ativo, andar)` (`src/hooks/`), que registra o listener na
janela **enquanto a seção está ativa** e o remove ao sair. Duas seções nunca disputam a mesma tecla,
porque fora da seção o listener não existe.

Corolário: os componentes de dentro (o palco da órbita, a curva do tempo) **não tratam ←/→**. Eles
continuam focáveis e rotulados, mas um segundo handler local só criaria a chance de um passo duplo —
foi assim que a órbita ficou dependente de foco. A exceção é o carrossel de formações, que trata a
seta no próprio elemento porque a seção Sobre não reivindica ←/→ para si.

`editandoTexto()` — a regra de "aqui a seta é do cursor" — mora junto do hook, e tanto a rolagem
quanto as seções a usam. Duplicada, ela sairia de sincronia no dia em que um campo novo aparecesse.

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

### Cada seção entra de um jeito

A moldura é comum — `.bloco[data-ativo]` traz opacidade + 26px —, mas **o conteúdo de cada seção
entra com um gesto próprio**. `inicio` já tinha o seu: o zoom da câmera saindo do horizonte.

| Seção | Entrada | Onde |
|---|---|---|
| Sobre | a bio chega cifrada e se decifra da esquerda para a direita, um parágrafo depois do outro | `hooks/useDecipher.ts` |
| Projetos | os cartões sobem, o do meio primeiro | `ProjectCard.module.css` |
| Trajetória | duas ondas opostas giram e param; os nós acendem atrás delas | `TimelineCurve.module.css` |
| Contato | os canais chegam das laterais, o do meio primeiro | `ChannelCard.module.css` |

Projetos sobe e Contato vem de lado — o curso é diferente, a gramática é a mesma. O cartão de
projeto anda **120px** contra os 46 do canal, e não é exagero: ele tem 436px de altura, e um pulo de
40px nele mal se lê. Distância de entrada acompanha o tamanho do elemento.

Quatro decisões valem para todas, e são o que mantém isso barato e escalável:

- **CSS onde dá, JS só onde não dá.** Três das quatro são `@keyframes` disparados por um atributo
  (`data-entrada`) — compositor da GPU, zero custo de CPU, nada de rAF. Só a decifragem precisa de
  JavaScript, porque ali o que muda é texto, não transformação.
- **A ordem sai de dado que já existe.** `--ordem` nos cartões de projeto vem de `geo.ordem`
  (`useOrbit`, distância circular ao cartão da frente); nos canais, da distância ao centro da grade;
  nos nós da linha do tempo, da posição **na janela** — nunca do índice na lista, que abriria buracos
  no ritmo quando a janela desliza. Acrescentar um projeto, um canal ou um emprego não pede nada no
  CSS.
- **`backwards`, nunca `forwards`.** O estado final dessas animações já é o estado natural do
  elemento; o que precisa ser coberto é o **atraso**. Com `forwards` a animação ficaria segurando o
  elemento depois de terminar, e o `:hover` e as transições do componente parariam de responder.
- **Sem quique.** A primeira versão dos cartões passava do lugar e voltava; era gesto de desenho
  animado e brigava com a régua de 1px do resto da página. O que dá caráter é a ordem das duas
  coisas — a opacidade chega antes do movimento, então o elemento se materializa e só depois assenta.

### As duas ondas da Trajetória

A curva tem um **par espelhado**: a mesma onda invertida no eixo, bem mais apagada
(`rgba(255,255,255,.05)` contra os `.12` da principal). Não há caminho novo para ela — `scaleY(-1)`
em torno de y=66 devolve exatamente a onda oposta, sobre o mesmo `d`.

**As duas andam sempre em sentidos opostos**, e isso vale nos dois momentos:

| Quando | Principal | Inversa |
|---|---|---|
| entrada da seção | corre de +820px até parar | corre de −820px até parar |
| navegar no tempo | `translateX(shiftX)` | `translateX(−shiftX)` |

Navegar abre e fecha o par como um fole, e é isso que dá leitura de rotação a uma figura que só
translada.

O curso de entrada vem do próprio desenho: o caminho cobre **três** janelas (u de -1 a 2), de
x=-868 a x=1868 num `viewBox` de 1000. Esses **868px de sobra de cada lado são o teto do
deslocamento** — passar deles descobre a ponta da curva e a onda aparece começando do nada no meio
da tela. Os 820 usados são esse limite com folga.

A animação de entrada mora num `<g>` **externo**: o de dentro carrega o `translateX` da janela,
escrito pelo JS, e uma animação de `transform` no mesmo elemento o apagaria — o mesmo motivo pelo
qual a entrada dos cartões de projeto mora no `.cartao` e não no `.orbe`. Anima `transform`, então
é trabalho de compositor e o custo não depende do tamanho da curva.

**Os pulsos só existem com a seção ativa.** Os quatro `<animateMotion>` são SMIL: não respondem a
`animation-play-state`, e o navegador não os pausa por estarem fora de vista — quatro animações de
caminho seguiriam rodando enquanto o visitante lê Contato. Desmontá-los é o único jeito de pararem,
e ao voltar reiniciam junto com a entrada.

**Só o ponto que virou o ativo cintila.** Fazer todos piscarem a cada passo enchia a linha de
movimento sem informação nenhuma: o que mudou foi *qual* nó está selecionado, e é esse que deve
responder.

Quem reinicia a animação é o próprio CSS — `data-frente` aparece, o `animation-name` passa de `none`
para `pontoAcende` e ela começa do zero. Sem `key`, sem remontagem, sem contador. (A `key` foi a
primeira tentativa e não é necessária; e o botão em volta nunca poderia remontar, porque é ele que
carrega a transição de `left`/`top` — o nó saltaria para a posição nova em vez de deslizar até ela.)

O componente decide só **quando**, com dois tokens que valem juntos:

| | `--pisca` | `--fila` |
|---|---|---|
| entrada da seção | 980ms — o ponto acende atrás das ondas | 90ms por posição, um depois do outro |
| passo no tempo | 0 | 0 — qualquer atraso aqui é só demora |

`--fila` existe justamente para o escalonamento poder ser **desligado**: `data-entrada` fica no
elemento enquanto a seção está ativa e não distingue "acabou de entrar" de "está navegando". O
estado que separa os dois é derivado durante o render (o padrão do React para "mudou a prop, ajusta
o estado"), então não custa um efeito nem um quadro pintado a mais.

**Um nó que chega pela ponta da janela não pode demorar a existir.** Ele é o passo em que o
visitante está esperando algo novo aparecer, e três tempos se somavam contra isso — a opacidade do
botão, a animação do ponto começando em zero e mergulhando duas vezes, e o crescimento do ponto
ativo. Somados davam quase um segundo entre invisível e apagado. As três alavancas hoje:

| O quê | Valor | Por quê |
|---|---|---|
| opacidade do nó | **0,14s** ao entrar, 0,4s ao sair | assimétrica de propósito: quem chega precisa estar lá, quem sai pode se apagar com calma |
| `pontoAcende` | **0,42s**, com vales em 0.45 e 0.7 | o piscar nunca apaga o ponto — um ponto que mergulha até quase nada lê como "ainda não carregou" |
| tamanho do ponto ativo | 0,32s | acompanha o resto em vez de arrastar |

O deslocamento segue nos 0,85s da curva nos dois casos: a posição pode levar o tempo da onda para
assentar, a presença não.

### A decifragem da bio

Um rAF só para todos os parágrafos (um por parágrafo seriam três relógios para o mesmo trabalho), a
15fps. A escrita vai direto em `textContent`: um `setState` por quadro re-renderizaria a seção
inteira para trocar uma string.

**O custo dominante não é o JavaScript, é o layout.** Mudar o texto de um `<p>` justificado e
hifenizado obriga o navegador a remontar as linhas do parágrafo inteiro, e isso pesa muito mais que
montar a string. Todas as decisões de desempenho aqui saem disso:

| Alavanca | O que era | O que é |
|---|---|---|
| `PASSO` (intervalo entre repinturas) | 45ms | **66ms** — é a alavanca principal; menos repinturas, menos relayouts |
| parágrafo que ainda não começou | resorteado a cada quadro | escreve a cifra **uma vez** e para |
| montagem da string | 400 sorteios + `join` de 400 | janela de 48 sorteios + três `slice` nativos |
| `ESCALONAMENTO` | 190ms | **420ms** — sendo maior que metade da duração, no máximo dois parágrafos decifram ao mesmo tempo |

O parágrafo à espera da sua vez era o pior dos quatro: além do trabalho invisível, ele custava um
relayout de texto justificado por quadro para um bloco que nem tinha começado a se decifrar. Além da
janela de 48 caracteres o texto fica na **cifra estática**, sorteada uma vez no setup — o olho só
percebe o embaralhamento na frente de onda.

O alfabeto é só ASCII técnico e Latin-1. A página inteira é IBM Plex Mono, e um glifo que a fonte não
tem vira caixa vazia — o efeito passaria de "texto cifrado" a "fonte quebrada". Katakana e blocos
foram descartados por isso.

Dois detalhes que já custaram uma iteração cada:

- **Espaços nunca são embaralhados**, e a hifenização fica **ligada** o tempo todo. Como a fonte é
  monoespaçada e o número de caracteres não muda, preservar os espaços mantém o comprimento de cada
  palavra; e como o navegador não hifeniza uma palavra cifrada — são símbolos, não letras — ela não
  troca de quebra enquanto pisca. Cada palavra que se resolve passa a poder hifenizar e acomoda a
  linha ali mesmo, então **a justificação acontece junto com a decifragem**. Desligar `hyphens`
  durante a animação, que foi a primeira tentativa, guardava todo o reajuste para o último quadro e
  o parágrafo pulava de uma vez.
- **Os textos entram por parâmetro, nunca lidos do DOM.** Numa troca de idioma o React escreve o
  texto novo e só depois o efeito antigo é desfeito: um cleanup que restaurasse "o que estava no nó"
  gravaria o idioma velho por cima do novo, e o efeito seguinte o leria como verdade. Foi assim que
  a bio parou de trocar de idioma para quem já estava na seção. Pelo mesmo motivo o cleanup só
  restaura quando a animação ficou pelo caminho.

Enquanto corre, o contêiner leva `aria-busy`: texto cifrado não é conteúdo. Com
`prefers-reduced-motion` nada disso acontece — o texto já nasce legível.

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

### Crédito: escondido por visibilidade, nunca por `display: none`

Em ≤640px o crédito sai de cena — mas com `--credito-vis: hidden`, não com `display: none`. Um
elemento com `display: none` sai da árvore de renderização e leva a animação junto: ao voltar para
desktop (rotação, janela redimensionada, DevTools), `creditIn` recomeça do zero, e como ela tem
**5.2s de atraso com `both`**, o crédito ficava mais de cinco segundos invisível — o que na tela lê
como "não voltou mais".

`visibility: hidden` mantém o elemento na árvore: a animação corre escondida e o crédito reaparece
no mesmo quadro em que a faixa larga volta. A visibilidade já o tira do clique e da tabulação, então
não precisa de `pointer-events` extra.

A regra vale para qualquer coisa do HUD que entre por animação atrasada e suma numa media query.

### Medidor da supernova

`NovaGauge` fica no canto inferior esquerdo, com os mesmos recuos do menu e da versão
(`max(3.2vw, 26px)`; no mobile sobe para `max(2.4vh, 20px)` e encosta na esquerda, onde não disputa
espaço com a versão centrada nem com a faixa do menu).

Só existe no DOM depois da primeira supernova, e `key={disparo}` é o que reinicia a animação a cada
estrela. A recarga inteira é CSS de duração `--recarga`; o perímetro do arco vem do componente
(`2π·r`), que é quem conhece o `r` do SVG. `aria-hidden` porque não há informação ali: é o retorno
visual de um gesto de ponteiro, e nada existe só por esse caminho.

Detalhe que já custou uma iteração: a animação de saída usa `forwards`, **nunca `both`**. Com
`backwards`, ela aplicaria o próprio estado inicial durante os segundos de atraso e passaria por
cima da animação de entrada, que vem antes na mesma lista. Pelo mesmo motivo o núcleo acende ao
longo da recarga em vez de pulsar `infinite`: uma animação infinita continuaria rodando depois de o
medidor apagar, e ele fica no DOM até um próximo disparo que pode nunca vir.

### Notificações

`Notice` (`hud/Notice.tsx`) é o **modelo** de notificação do HUD: painel no canto superior esquerdo,
com título curto, uma linha de texto e um botão de dispensar. É genérico — quem monta decide quando
o aviso aparece e o que ele diz. Props: `aberto`, `titulo`, `texto`, `rotuloFechar`, `onFechar`.

O painel é **preto sólido**, não translúcido como o resto do HUD. O aviso nasce sobre o céu, e uma
estrela, um meteoro ou uma onda de choque passando por trás de um texto de 11px tiram dele a leitura
de painel — o aviso é a única coisa do HUD que existe para ser lida, e por isso é a única que não
deixa a cena atravessar.

O canto superior esquerdo é o único que o HUD deixou vago (idioma no topo à direita, menu à direita,
versão embaixo à direita, medidor embaixo à esquerda). No mobile o aviso **desce** para
`max(7.4vh, 62px)`, porque lá o seletor de idioma passa a ocupar o centro do topo.

O painel **fica montado durante a animação de saída** e sai do DOM no `animationend` — checando
`e.target === e.currentTarget`, porque o evento borbulha e o risco lateral também é animado.
Desmontar no mesmo quadro em que `aberto` vira `false` faria o aviso sumir de uma vez, e um painel
que pisca e desaparece lê como falha de renderização. Vale aqui a mesma regra do medidor: a
animação de saída usa `forwards`, **nunca `both`**.

`role="status"` + `aria-live="polite"`: é uma sugestão, não um alerta — não deve interromper o que o
leitor de tela estiver dizendo. Os textos vivem em `aviso` nos dois dicionários, com `fechar` (o
rótulo do botão, que serve a qualquer aviso) e um bloco por notificação.

### A dica da supernova

A supernova é a única coisa da página que **ninguém descobre lendo**: não há botão nem rótulo, e
quem não clica no vazio nunca sabe que ela existe. `useNovaHint` (`hud/useNovaHint.ts`) decide
quando contar, e o `App` liga as pontas — o mesmo contador que alimenta o medidor de recarga.

A espera é de **6,5 s**, não dos 5 s que a ideia pedia: a abertura termina em 6,2 s (a versão entra
em 5,6 s e leva 0,6 s), e um aviso aos 5 s disputaria a entrada com o resto do HUD. 6,5 s é o
primeiro instante em que a tela já está parada. Depois de **13 s** o aviso se retira sozinho.

Três coisas apagam a dica, cada uma por um motivo diferente:

| Condição | Por quê |
|---|---|
| já acendeu uma estrela | descobriu; repetir para quem já sabe é ruído. Fica em `localStorage` (`portfolio.nova`), então não volta na próxima visita |
| `prefers-reduced-motion` | a supernova nem chega a disparar (ver `SpaceCanvas`) — convidar para o que não vai acontecer é pior que o silêncio |
| o visitante fechou o aviso | dispensar é resposta, não indiferença |

**Os dois cronômetros só correm com a aba visível** (`useEsperaVisivel`, no próprio arquivo). É a
mesma razão pela qual a recarga vive no relógio do motor, e aqui o efeito seria pior: o aviso
apareceria e expiraria enquanto o visitante está em outra aba, e a dica que existe para ser lida
nunca teria sido vista.

O aviso **não** é alvo de supernova: o filtro do `SpaceCanvas` exige que o alvo seja o canvas ou a
caixa de uma `<section>`, e o painel não é nem um nem outro. Clicar nele não acende estrela — o que
é o certo, senão o botão de dispensar acenderia uma.

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
| `AboutSection` | `--retrato-col --retrato-ar --cols --corpo-gap --retrato --coluna-max --txt --pfs --plh` |
| `EducationCarousel` | `--bw --detalhe-w --detalhe-ml` |
| `ProjectsSection` | `--pcw --pch --pbh --ph --pr --pperspectiva --pcard` |
| `JourneySection` | `--exph --exp-cargo --exp-per --exp-curva --exp-rail --exp-fantasma --exp-gap --exp-txt --exp-topo` |
| `ContactSection` | `--form-cols --enviar-just` |
| `NavMenu` | `--nav-top --nav-bottom --nav-left --nav-right --nav-tx --nav-ty --nav-dir --nav-align --nav-gap --nav-risco --nav-risco-ativo --nav-risco-w --nav-risco-esc --nav-risco-rot` |
| `LanguageToggle` | `--lang-left --lang-right --lang-tx` |
| `Version` | `--ver-bottom --ver-left --ver-right --ver-tx` |
| `NovaGauge` | `--nova-bottom --nova-left --nova-size` |
| `Notice` | `--aviso-top --aviso-left --aviso-w` |
| `Credit` | `--credito-vis` |

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

## Parágrafos justificados

Todo `<p>` é justificado (`reset.css`), e a regra vale **por elemento**, como a da seleção de texto:
parágrafo é `<p>` em toda a página, então ela alcança o que ainda não foi escrito.

`text-align: justify` sozinho abre rios de espaço em branco, e aqui o caso é o pior possível: a
página inteira é IBM Plex Mono, **monoespaçada**, então o ajuste não pode sair da largura dos
glifos — sobra tudo para o espaço entre palavras. São as outras três declarações que tornam a
justificação aceitável, e nenhuma delas é opcional:

| Declaração | O que resolve |
|---|---|
| `hyphens: auto` | quebra a palavra no fim da linha em vez de esticá-la — é o que o LaTeX faz |
| `hyphenate-limit-chars: 6 3 3` | recusa palavra de menos de 6 letras e nunca deixa menos de 3 de cada lado do hífen. O padrão (5 2 2) pica palavras curtas e o texto vira uma escada de hífens |
| `text-wrap: pretty` | o Chrome escolhe as quebras olhando o parágrafo inteiro, não linha a linha — a ideia do algoritmo do Knuth: tira o buraco de uma linha e o distribui pelas vizinhas |

**A hifenização depende de `<html lang>`**, e é por isso que o `LanguageProvider` reflete o idioma
por `useEffect` e não nos dois callbacks de troca. Antes, um visitante detectado como `en` ficava
com o `lang="pt-BR"` do `index.html` até trocar de idioma na mão — o que não tinha consequência
visível e passou a ter: texto inglês partido por regras do português.

Onde falta suporte (o Firefox ainda não tem `hyphenate-limit-chars`) o parágrafo continua
justificado e hifenizado, só com quebras menos bem escolhidas.

Duas exceções, e são os mesmos dois `<p>` que já se excluíam da seleção de texto — pela mesma razão,
não são texto corrido:

| Onde | O quê |
|---|---|
| `section.module.css → .indice` | `text-align: left` + `hyphens: manual` — lê como marcador |
| `HeroSection → .etiqueta` | idem; uma palavra só, e não há por que parti-la ao meio |

Ficam de fora por não serem `<p>`: os títulos, os chips, os rótulos do HUD e os `<li>` das
atividades da Trajetória — frases de uma linha, onde justificar não muda nada e hifenizar só
introduziria hífen.

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
- **A coluna de texto não passa da base do retrato.** O texto rola dentro do que sobra depois do
  título, em vez de descer sozinho ao lado de uma imagem que já acabou — numa tela de 1080px eram
  ~56px de sobra. O teto é `--coluna-max`, e quem cede altura é o `.texto`: `min-height: 0` deixa o
  `flex-shrink` ir abaixo do tamanho mínimo do conteúdo, e sem isso a base transborda de novo. Não
  há `flex-grow` — o texto cede altura, nunca reivindica.

  O número sai de onde já existia: `--retrato` deixou de ser `100%` e virou um **comprimento**
  (`28cqw`), então `--coluna-max` é ele vezes a proporção. Onde uma faixa responsiva troca
  `--retrato` por um valor fixo (150px em telas baixas), o teto acompanha sozinho. É para isso que o
  `.corpo` é um `container-type: inline-size`: o bloco tem `max-width`, então a coluna não é fração
  da viewport e `vw` não serviria. No mobile o retrato fica **acima** do texto e não há base a
  respeitar — `--coluna-max: none`.

  A proporção mora em `--retrato-ar` e o `PortraitCard` monta o `aspect-ratio` com ela
  (`1 / var(--retrato-ar)`), para a altura do retrato e o teto da coluna não saírem de sincronia.
- Retrato (`PortraitCard`): inclina seguindo o ponteiro com brilho especular, escrito **direto no
  `style`** dentro de um rAF coalescido. Um `setState` por `pointermove` re-renderizaria a seção
  dezenas de vezes por segundo para mudar dois números de `transform`.

### Carrossel de formações

Grade estática **enquanto os badges cabem**; vira carrossel só quando não cabem. Um `ResizeObserver`
compara `clientWidth` com `n·(bw+gap) − gap`, e **`bw`/`gap` são lidos do DOM**
(`children[0].offsetWidth`, `columnGap`) — nenhum número de layout duplicado no JS, então mexer no
CSS não exige mexer no hook. A leitura acontece **no `ResizeObserver`**, não por quadro: o gap é
`getComputedStyle`, e chamá-lo dentro do rAF obrigava o navegador a recalcular estilo 60 vezes por
segundo para um número que só muda quando o layout muda.

- Badge de 312px (`--bw`; 246px no mobile): 3 × 312 + 2 × 12 = os 960px do bloco acima.
- Modo carrossel: trilho com **duas cópias** da lista; o laço reposiciona `(scrollWidth+gap)/2`, que
  é exatamente uma cópia mais o seu gap (a emenda é imperceptível). A segunda cópia é `aria-hidden`:
  um leitor de tela não deve encontrar a mesma formação duas vezes.
- Rolagem **nativa** (swipe e inércia de graça) + deriva de ~34px/s num rAF com acumulador subpixel.
  Arraste, roda do mouse e ←/→ com foco pausam a deriva por 2,2s.
- O rAF só corre com o carrossel **na tela** (`IntersectionObserver`). A página tem cinco seções e
  uma está visível por vez: sem isso, o trilho continuaria escrevendo `scrollLeft` a cada quadro
  enquanto o visitante lê Contato, disputando quadro com a cena em canvas por um movimento que
  ninguém vê.

### O que o hover revela

O badge acende (borda e fundo) e a **barra encolhe para a esquerda**, abrindo espaço para o detalhe:
a data em `concluido`, a fração `feito/total` em `cursando`. Em `cursando` a barra é a fração real o
tempo todo — o hover só põe o número ao lado do que a barra já estava dizendo.

- Quem não tem detalhe **não acende**: um realce que não revela nada promete informação que não
  existe. É por isso que o gatilho é `[data-detalhe]`, e não o badge inteiro.
- O espaço sai da `.trilha` (`flex: 1`), então nada mais na linha se mexe. A margem negativa do
  detalhe cancela o `gap` do medidor enquanto ele está fechado — senão sobrariam 8px de respiro para
  um elemento de largura zero.
- Fecha por **largura**, não por `display`/`visibility`: o texto continua na árvore de
  acessibilidade, então a data e a fração existem para quem nunca vai passar um ponteiro por cima.
  E em `(hover: none)` ele já nasce aberto, senão seria inalcançável no celular.

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

**O arraste começa na faixa do cartão da frente**, não no palco inteiro. O palco é largo porque
precisa acomodar os cartões laterais, e capturar o gesto em toda essa largura fazia a órbita ser dona
de metade da seção. A faixa sai do DOM — centro do palco, `offsetWidth` do cartão com `data-frente`,
que é medida de **layout** e por isso não acompanha o `transform`: não balança durante o giro nem
duplica o `--pcw` do CSS no JavaScript. Só o início do gesto é filtrado; terminá-lo fora da faixa
continua valendo. O `cursor: grab` saiu do palco e foi para o **cartão da frente**, que é onde o
gesto passou a viver — uma mão aberta sobre a largura toda prometeria o que a maior parte dela não
atende mais. `:active` troca para `grabbing`, sem estado no React.

**O `click` que segue um arraste é engolido** por um listener de captura no palco, solto num
`setTimeout(0)` para não sobreviver a um gesto que não gerou clique. Sem isso o arraste sobre o
cartão da frente girava *e* o clique caía no cartão que estava ali, abrindo o painel de um cartão
que já tinha virado lateral. A captura no palco basta porque o React escuta na raiz do documento e
dispara `onClick` na subida, que deixa de acontecer.

**O cartão da frente é opaco** (`rgb(0 0 0 / 92%)`, contra os 42% dos demais). A órbita é fechada de
propósito — `--pr` foi reduzido para os cartões não passarem sob o menu — e por isso a caixa do
cartão da frente cobre um pedaço dos vizinhos: 2% em tela larga, 31% em janela média, 43% no mobile.
Com o preto translúcido, o vizinho aparecia através dele e não respondia ao clique, porque ali o
clique é do cartão da frente. Prometer um alvo que não existe é pior que escondê-lo: **o que se vê
do lateral é exatamente o que responde.** Devolver a área inteira aos laterais exigiria `--pr ≈ 0,99
· --pcw`, o que no mobile jogaria os cartões para fora da tela.

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
- Canal sem `url` é espaço reservado: tracejado, apagado e fora da navegação. A `url` passa pelo
  mesmo `urlExterna()` dos projetos — é o ponto único em que endereço de dicionário vira `href`.
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
- O que está fora da janela ou do painel fechado sai da tabulação (`tabIndex -1`). Com um painel de
  projeto aberto, **só o cartão dele continua focável**: os outros ficam atrás do painel, e tabular
  para um cartão que não se vê é perder o foco no meio da tela. Eles seguem clicáveis — o mouse não
  tem esse problema — e `Esc` fecha o painel, que é a saída explícita que faltava para o teclado.
- Foco visível só para navegação por teclado (`:focus-visible`).

---

## Pendências

- **Descrição do ClinPlay** é rascunho — o próprio texto avisa (`projetos.lista[0].descricao`, nos
  dois dicionários). Substituir pelo que o projeto realmente faz.
- **Dois projetos são vagas** (`vaga-02`, `vaga-03`, estado `definir`): giram na órbita e não abrem
  descrição. Preencher quando houver projeto.
- **Quatro entradas de trajetória são espaço reservado** (`vaga-05` a `vaga-08`, org "A definir"):
  existem para a janela de seis da linha do tempo deslizar de verdade. Substituir por experiência
  real ou remover — o próprio texto do `bullet` avisa (`experiencia.lista`, nos dois dicionários).
- TikTok está sem `url` em `shared.json`, então aparece como "em breve".
- **Conferir os dados das formações.** A `conclusao` do SENAC (`2022.12`) e o `progresso` da PUC
  (`4/8`) entraram como espaço reservado para a feature de hover — são dados reais sobre a vida de
  alguém e precisam ser corrigidos por quem os conhece (`formacoes.lista`, nos dois dicionários).
- **Banners de `vaga-02` e `vaga-03`** não existem — as molduras seguem como espaço reservado até
  haver projeto.
