---
paths:
  - "src/engine/**"
  - "src/scene/qualidade.ts"
  - "scripts/check-qualidade.mjs"
---

## Motor de cena (`src/engine/`)

`createStage(canvas, layers)` é dono do canvas, do DPR (teto 2), do resize, do ponteiro, do relógio,
do rAF e da pausa em aba oculta. É a única peça que fala com o navegador — por isso `destroy()`
basta para desmontar a cena inteira.

Camada = `{ name, z, enabled, resize(env), update(env), draw(ctx, env) }`.
Ordem do array = ordem de `update`; `z` = ordem de desenho.

`env`: `W H dpr cx cy t dt mouse{x,y,active} camera{k,moving,progress,fade} bus{} leve`.
`env.bus` é o barramento entre camadas: `bus.gravity`, publicada pelo `BlackHole`, e `bus.well` e
`bus.shock`, publicadas pela `Supernova` (a carga e a explosão) — as três lidas pelo `Starfield`, que
não sabe quem as publicou. `well` é do **mesmo tipo** que `gravity`, então o consumidor soma os dois
poços com o mesmo `puxar`.
**Uma camada nunca importa outra.**

O puxão do buraco negro mora em `engine/gravity.ts`, e as duas camadas que o sentem (`Starfield` e
`Supernova`) importam **de lá**, não uma da outra. Elas precisam concordar: as estrelas acesas ficam
lado a lado com as do campo no mesmo céu, e uma conta divergente salta aos olhos. Ele tem também `capturar`, que prende no centro exato o que já caiu fundo demais para orbitar, e
`capturado`, que diz a quem desenha o quanto uma estrela está presa (uma estrela parada não pode sair
esticada nem tremendo). **Só o poço da supernova chama as duas** — no buraco negro o giro é o disco de
acreção. O módulo separa
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
| `Nebula` | `layers/nebula.ts` | 0 | Buffer de 128px, 5 massas brancas em deriva, repintado a 12fps e ampliado pela GPU. Cada massa é o mesmo sprite assado uma vez, com o `globalAlpha` dela: nenhum degradê por repintura. alpha 0.16. |
| `Starfield` | `layers/starfield.ts` | 10 | ~354 estrelas num 1280×720 (densidade por área), TypedArrays, repulsão do ponteiro por mola, gravidade de `engine/gravity.ts` e cintilar via LUT, 8 baldes de opacidade. O desenho é o sprite de `engine/star.ts` por `drawImage`, com deriva ambiente de 8px e a lente da gravidade esticando o brilho. Cintilar lento (±22%). No modo leve desenha metade (ver *A qualidade sobe até 15% abaixo do que a máquina aguenta*). |
| `Constellations` | `layers/constellations.ts` | 12 | Figuras do céu real. Estrelas herdam as propriedades do `Starfield`; linha de 1px num único `stroke()`; as estrelas saem do mesmo sprite de `engine/star.ts`, sem deriva e sem lente; posições do quadro em `vx_/vy_` pré-alocados. As arestas se desenham das pontas para dentro quando a camada aparece (`drawTime`). `opacity` em 0 tira a camada do `update` **e** do `draw`. |
| `BlackHole` | `layers/blackHole.ts` | 20 | Raio `0.14·min(W,H)`. Plasma 96×96 por LUT de senos a 20fps (alpha .22), 260 poeiras em órbita kepleriana, halo .18/.06 até 3.4R, horizonte preto + borda **preta** suavizando — nunca borda brilhante. Os degradês são criados **uma vez**, com raio 1 na origem, e o desenho os leva ao tamanho por `scale` e à força por `globalAlpha`: a chave antiga (centro, raio, força) mudava em todo quadro de rolagem. O raio segue o `alvo` com a inércia da câmera (`SEGUE` 3,2), não mais a 12: com a roda do mouse ele saltava de tamanho a cada degrau enquanto o céu deslizava. |
| `Supernova` | `layers/supernova.ts` | 14 | A estrela que o visitante carrega e acende. Pressionar abre um poço (`bus.well`) que aperta em quatro níveis; soltar explode com força, alcance, duração e recarga daquele nível. Pool de 12 estrelas (guardadas em fração da tela), uma onda de cada vez, carga e recarga no relógio do motor. Plasma a partir do nível 2 (criado na primeira vez), estrela supermassiva de 220px num buffer de disco no 3, e no 4 ela colapsa com um pico de 3,2× no puxão até um núcleo crítico de ~22px que treme à espera do release. Sem buraco negro no fim. O degradê do poço fica em cache com `globalAlpha`, e o pulso não entra na chave dele. Ociosa custa três comparações. |
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

### A profundidade e a câmera que anda

O `Starfield` é um **volume**. Cada estrela tem `x`, `y` em px de mundo (a partir do centro) e um
`z` entre 0,1 e 1,1, e a posição do quadro é a projeção em perspectiva, `centro + mundo / zAtual`,
com `zAtual = z − env.camera.avanco`. Toda a física (mola, gravidade, poço, onda, lente) age sobre a
posição projetada sem saber que ela mudou.

**O volume é mais largo que a tela na proporção do fundo**, e é isso que mantém o céu uniforme durante
a viagem: cada fatia de profundidade, projetada, cobre a tela inteira, então a soma também cobre, com
a mesma densidade em todo lugar. A primeira versão sorteava a posição na tela e derivava o mundo dela;
em repouso o céu era idêntico ao antigo, mas quem renascia no fundo caía perto do centro e as bordas
esvaziavam conforme a câmera andava. O preço é que só ~37% do volume está na tela a cada momento
(`VISIVEL`), então há mais estrelas no total para a mesma densidade na tela, e a que está fora pula a
física e o desenho. O tamanho do brilho segue a profundidade (`Z_REF / zAtual`, entre 0,45 e 2,4, pela
raiz), então mesmo parado o céu tem estrelas perto e longe.

**As figuras também têm profundidade** (`Z_FIGURA`, 0,85), mas seguem só a parte do avanço que vem da
**rolagem** (`env.camera.rolagem`), ancoradas no ponto em que apareceram: elas não dão a volta como as
estrelas, e seguindo a deriva cresceriam para fora da tela de quem fica parado lendo, e um salto as
jogaria longe logo ao aparecer. Assim elas surgem no lugar e no tamanho do `placement` e crescem com a
rolagem, como as estrelas em volta. A estrela acesa da supernova usa a mesma conta (ver `cena.md`).

- **a volta é um `mod`, não um contador.** Quem passa da câmera renasce no fundo, perto do centro, e
  a conta é reversível: rolar de volta ao topo devolve cada estrela ao lugar exato. As duas pontas
  da faixa apagam a estrela (`sfad`), senão a volta seria um pulo da borda ao centro;
- **o brilho cresce com a raiz da escala**, com teto de 2,4×: crescer na proporção do avanço viraria
  mancha, porque o brilho é halo;

`env.camera.avanco` é montado no palco (`stepAvanco`): o alvo que a página pede (a rolagem da tela
ativa, por `camera.avancar`) seguido com inércia (`SEGUE`, para a roda do mouse não dar trancos), mais
uma **deriva** lenta (`DERIVA`, ligada por `camera.derivar`) e o que os saltos somaram.

**O salto** (`camera.saltar`, 1s) é `env.camera.salto` indo de 0 a 1 e voltando. O campo de visão abre
até 1,6× e as estrelas viram **riscos radiais**: é o mesmo esticamento da lente, com direção radial e
`s` até 17, e não um desenho novo, então o risco herda a queda de alfa do brilho esticado. O salto
empurra a câmera 0,9 para a frente, que **não** volta com a rolagem: depois de um salto o céu é
outro lugar. No auge o palco pinta um véu branco de no máximo 5% (ao cubo, então quase sempre abaixo
de 1,5%), e os riscos perdem até 40% do alfa. Já foram 12% e riscos no alfa cheio, e a troca de
tela lia como um clarão: é risco para quem tem fotossensibilidade. Com movimento reduzido não há salto.

Conferido em Node com o palco e o campo empacotados e um canvas falso: nada vira NaN; com a câmera
avançada 0,3 as estrelas se reorganizam, e de volta a 0 todas as 177 do começo voltam para até a
deriva ambiente do lugar; no meio do salto os 229 brilhos saem esticados, e depois dele `salto` é 0 e
o avanço ficou 0,9 à frente.

### Contrato de desempenho

Obrigatório para qualquer camada nova:

- zero alocação por quadro (TypedArrays criados no `resize`);
- trigonometria pesada → LUT (`fastSin`/`fastCos`);
- efeitos de pixel → buffer pequeno + `drawImage` ampliado, abaixo de 60fps;
- desenho em lote (agrupar por opacidade, um `fill()` por grupo);
- camada desligada precisa custar zero.

### A qualidade sobe até 15% abaixo do que a máquina aguenta

A cena **começa leve e sobe devagar**, mas não procura o limite da máquina: ela para numa meta de
consumo bem abaixo dele. A versão anterior subia degraus enquanto a taxa de quadros aguentava, o que
na prática era um teste de estresse: um notebook modesto rodava a 60fps no limite e a CPU subia só
de abrir o site.

**A qualidade é contínua, de 0 a 1** (`stage.ts`), e gasta o que tira **na ordem em que quem olha
menos sente: densidade, depois resolução, e a taxa de quadros por último.** Uma estrela a menos no
fundo quase não se nota; o texto e as linhas do canvas borrados se notam; e 30fps se notam em tudo
que anda. A ordem é do Lucas (28/09/2026). Antes as duas primeiras caíam juntas, e a resolução era a
primeira a ceder.

| Faixa de `q` | O que anda | O que fica parado |
|---|---|---|
| de `Q_RES` (0,5) a 1 | `env.densidade` (a fração do céu acesa), do `PISO_DENSIDADE` a 1: o `Starfield` mantém uma estrela em cada quatro sempre acesa e acende as outras **uma a uma**, cada uma com o próprio fade | a resolução, cheia (o DPR do aparelho, teto 2) |
| de 0 a 0,5 | a resolução, do `PISO_ESCALA` (px de canvas por px de layout) ao DPR, em degraus de 1/8 para não redimensionar a cada passo | a densidade, no piso |
| abaixo de 0 | a taxa: **30 só como último recurso** (`economia`), revista quando o teto se solta | tudo no piso |

**A cena começa em `Q_RES`** (resolução cheia, densidade no piso), e não mais em 0,1. Subir só acende
estrelas, e a resolução só troca quando a máquina pede para descer. Do jeito antigo, a subida da
abertura passava pelos degraus de 1/8 da resolução, e cada troca piscava (pedido do Lucas, 29/09/2026).
O piscar tinha uma segunda causa: `aplicar` redimensionava o canvas no fim do quadro, depois do
desenho, e mudar `canvas.width` apaga o canvas, então o navegador mostrava um quadro preto. Hoje a
troca fica marcada (`redimensionar`) e acontece no começo do quadro seguinte, antes de desenhar.

O halo da supernova sai abaixo de 0,35 (`env.leve`). **Os pisos foram escolhidos pelo Lucas**
(29/09/2026): metade do céu (`PISO_DENSIDADE` 0,5) e 0,6 px por px (`PISO_ESCALA`), e no nível 0 a
resolução é o piso exato, sem o degrau de 1/8. O céu fixo do `Starfield` era metade das estrelas, e
por isso o piso não descia de 50%; hoje é um quarto (`CEU_FIXO`), e a densidade pode descer até 25%.

Existiu um painel de calibragem, aberto com `?pisos` no endereço, que trocava os pisos ao vivo e
mostrava o tempo de quadro; ele saiu depois de os pisos serem escolhidos. Se voltar, duas lições dele:
mexer num piso precisa pôr a cena nele (numa máquina que aguenta, o nível fica perto de 1, onde os
pisos não valem), e a densidade precisa mudar na hora durante a calibragem, em vez de subir a 0,06 por
segundo, senão o controle parece quebrado.

**Quem visita pode escolher o nível** na régua do menu de opções (ver `hud.md`), e aí a cena para de
decidir: continua medindo, mas não sobe nem desce, e não cai para 30fps sozinha. A escolha fica no
`localStorage` (`portfolio.qualidade`) e volta na próxima visita; "auto" a apaga e devolve a decisão à
cena, sem o teto de antes. O canal é `scene/qualidade.ts`, no desenho de `scene/camera.ts`.

A medição vira duas marcas na régua: o **limite**, o nível em que o consumo chegaria a `LIMITE`, e o
**ideal**, onde ele fica na meta, que é onde o automático para. **As duas saem de uma reta ajustada às
primeiras 20 janelas (`AMOSTRAS`), `consumo = fixo + variável · nível`, e ficam fixas na visita.**
Seguindo cada janela, elas andavam o tempo todo, e uma referência que se mexe não serve de referência.

A primeira versão usava a proporção pura (`q · LIMITE / consumo`), e ela atribuía ao nível todo o
custo fixo da cena (buraco negro, poeira, o laço das estrelas): o limite saía baixo, o ideal também, e
o automático parava longe do que a máquina aguentava. A subida da abertura dá níveis variados para a
reta; janelas atrasadas ficam de fora, porque o atraso pode ser da página. Se o nível mal variou (a
cena começou num ideal guardado, ou ficou no piso), vale a medição guardada, ou a proporção no nível
médio.

**A medição fica guardada** (`portfolio.medicao`, pelo canal de `scene/qualidade.ts`), e a visita
seguinte começa no ideal dela em vez de subir de 10%, com as marcas já na régua. Ao fechar a medição
nova, as duas se juntam pela média: as marcas convergem entre visitas e se mexem no máximo uma vez
por visita. Antes de haver qualquer medição, a régua diz que está medindo.

**O que se mede é consumo, e não taxa de quadros**: o trabalho de cada quadro desenhado vezes os
quadros por segundo, em fração de um núcleo, numa janela de 0,6s de relógio de parede. O limite
aceitável é `LIMITE` (25% de um núcleo) e **a meta é 85% dele** (`MARGEM`): a cena para 15% abaixo
do que a máquina aguentaria. Quadro atrasado é o intervalo 35% acima do alvo, porque a GPU ou o
navegador não acompanham.

**As regras foram reescritas em 29/09/2026**, porque a antiga levava qualquer máquina ao mínimo numa
visita longa: qualquer janela ruim descia, e descer fixava o teto para sempre, então cada tranco
passageiro da página (rolagem, uma seção entrando, coleta de lixo) tirava um degrau que não voltava. A
simulação `npm run check:qualidade` reproduz isso: com um tranco de 1s a cada 8s numa máquina boa, a
regra antiga terminava em 0,00 e a nova termina perto de 1.

- **o alvo é o ideal.** Antes de a medição fechar, a cena sobe um passo pequeno por janela (0,04), só
  até onde a proporção prevê que a meta cabe; fechada, vai direto ao ideal e para ali;
- **faixa de tolerância**: sobe só com o consumo abaixo da meta, e só desce acima do `LIMITE`. No
  meio, fica;
- **só desce diante de um problema que dura**: 3 janelas ruins seguidas (`RUINS`, ~2s) acima do limite
  ou atrasadas, e nunca mais que 0,2 de uma vez (`QUEDA`);
- **um passo para cima que passou da meta volta na hora**, porque foi a própria cena que o pediu (um
  degrau de resolução é um salto de pixels que a proporção não prevê). Só pelo consumo do canvas: um
  atraso logo depois do passo pode ser da página, e segue a regra das janelas seguidas;
- **o teto é temporário.** Descer segura o nível por 20s (`ESPERA`), e depois a cena tenta subir de
  novo; cair logo depois de uma tentativa dobra a espera, até 160s (`ESPERA_MAX`), e ela não fica
  oscilando. Os 30fps de último recurso também são revistos quando o teto se solta;
- **o limite depende do aparelho, e quem decide é a cena** (`CONSUMO` em `scene/scenePlan.ts`, passado
  a `createStage` como `consumo`): 25% de um núcleo no computador, e **nenhum** em aparelho de toque
  (sem hover nem ponteiro fino), onde o nível é julgado só pelo compasso dos quadros. No celular o
  consumo medido não diz nada do nível: o tempo do quadro no JS quase não muda entre o piso e o máximo
  (o peso vai para a GPU), e o núcleo muda de frequência e de tipo com a carga. Com 25%, e depois com
  40%, a base da cena já passava do teto, e o automático descia ao mínimo sem ganhar nada num S26 Ultra
  que roda o máximo liso (29/09/2026). A medição guardada passou a `portfolio.medicao-3` para
  descartar as que o teto antigo deixou;
- **o consumo é o do callback do canvas**, contado do começo dele e não do carimbo do vsync: o que
  roda antes na mesma volta (outros rAF, eventos de toque e de rolagem) é da página;
- **um navegador preso a 30 quadros não é cena pesada.** O modo de economia do iPhone e de alguns
  Androids limita a taxa a 30, e os quadros chegam num compasso regular de 33ms com a cena gastando
  pouco. Contados como atrasados, eles levavam a qualidade ao mínimo sem ganhar nada. Quadros atrasados
  com o intervalo em 33ms (±4ms) e consumo abaixo de 45% de um núcleo põem a cena a mirar 30, e a
  qualidade fica. Os 45% não são fração da meta: a cena que atrasa sozinha a 60 gasta mais de 16,7ms,
  mais da metade dos 33ms, e o toque não tem meta;
- **momentos pesados conhecidos ficam fora da conta**: o salto entre telas, a carga e a explosão da
  supernova (`bus.well`, `bus.shock`), o zoom da abertura, os 0,3s depois de cada troca e engasgos
  acima de 250ms (coleta de lixo, a aba que volta). Ao voltar de uma aba oculta, o relógio do quadro
  recomeça.

**A densidade sobe devagar e estrela a estrela.** O `Starfield` segue `env.densidade` a no máximo
0,06 por segundo (desce mais depressa, 0,4), e uma estrela opcional de ordem `r = i/N` (o índice, que é
espalhado pela tela porque as posições são sorteadas) tem alfa `(frente − r) / 0,12`: o céu vai
ficando mais fundo sem que se veja um conjunto chegar. As que ainda não chegaram nem são visitadas. A troca de resolução é seca, mas ela só
afina o que já está desenhado, e as camadas trabalham em px de layout e não passam por `resize`.

**O resto da página lê a mesma qualidade.** O palco escreve `canvas.dataset.qualidade` (`0`, `1` ou
`2`) e `canvas.dataset.q` (o valor, para conferir no DevTools).
O CSS pergunta por `:root:has(canvas[data-qualidade='0'])` (faixa 0: qualidade abaixo de 0,35 ou
em economia), sem JavaScript e sem o motor conhecer a
página: na faixa 0 param o brilho do nome no Início e o da barra de Música, que andam
`background-position` num texto e repintam a cada quadro. A órbita da Carreira, que gira em rAF,
pinta a 30fps enquanto só gira (um décimo de grau por quadro) e a 60 só no deslize de escolher.

**As regras têm um teste que roda**: `npm run check:qualidade` (`scripts/check-qualidade.mjs`)
empacota o palco com esbuild e o roda em Node, com um canvas falso e um relógio de mentira em que cada
quadro custa o que a máquina da simulação diz pela resolução e pela densidade. Ele confere que uma
máquina boa chega perto do ideal e fica, que trancos periódicos da página não a levam ao mínimo, que
uma máquina fraca vai a 0 e a 30fps, que um celular cuja base passa de qualquer teto sobe ao topo sem
teto de consumo (com o do computador ia a 0), que um celular que não aguenta o topo desce só até os
quadros voltarem ao tempo, a 60fps, que um navegador preso a 30 quadros não perde qualidade, e que uma medição
guardada é o ponto de partida. Mexer nas regras
do automático é rodar isto antes.

**No navegador controlado pela extensão isso não se cronometra**: enquanto a ferramenta executa, o
rAF da aba congela, e a página mede quadros longos.

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

`stage.camera.zoomOut(26, 1.2)` — a intro começa dentro do horizonte e recua em 1,2s (ease
`1−(1−p)⁴`). Durante o zoom, gravidade e repulsão ficam desligadas e estrelas fora da tela são
descartadas. `camera.fade` (0→1 entre 35% e 85% do trajeto) controla a entrada da nebulosa.

Com `prefers-reduced-motion: reduce` o zoom não acontece e os tweens de cena têm duração zero.
