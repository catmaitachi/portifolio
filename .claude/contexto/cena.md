## Cena por seção (`src/scene/`)

`SpaceCanvas` é a **única** ponte entre React e o motor. O canvas fica fora do ciclo de render e a
única coisa que atravessa a fronteira é a seção ativa — trocar de idioma, abrir um projeto ou
navegar na linha do tempo não toca na cena. O motor entra por `import()` dinâmico e sai num chunk
próprio no build; nada da primeira pintura depende dele.

`scenePlan.ts` guarda a cena como **dado**:

- o buraco negro existe só na seção `inicio` — `tween(bh, 'strength', 0, 1.8)` encolhe e apaga (o
  raio é `R0·strength·camera.k`), o que lê como afastamento;
- cada outra seção tem um céu próprio, e a troca é um cruzamento de opacidades;
- **uma figura por seção, num canto próprio.** Duas enchiam o céu e disputavam o olho com o
  conteúdo, que é o que a página existe para mostrar; o campo de estrelas já dá densidade ao fundo.
  Com uma só, o canto passa a ser a identidade da seção, e os quatro estão ocupados: Sobre no
  inferior direito (`cancer`), Projetos no superior direito (`crux`), Trajetória no superior esquerdo
  (`ursaMajor`) e Contato no inferior esquerdo (`phoenix`);
- **nunca repetir as coordenadas de um `placement` entre seções** — a troca fica invisível, e com uma
  figura só isso pesa ainda mais.

`tween(obj, key, to, dur)` interpola qualquer propriedade num rAF próprio, cancelando o anterior na
mesma propriedade.

**Adicionar uma seção com céu próprio:** uma entrada em `CEUS`. O `SpaceCanvas` monta a camada e a
liga/desliga sozinho.

---

## Super-Nova

**Pressionar o vazio abre um poço de gravidade; soltar acende a estrela e solta a explosão.** O poço
puxa as estrelas vizinhas e aperta enquanto o dedo fica na tela, e o quanto o visitante segurou
decide o tamanho de tudo o que vem depois. Tem recarga, e a recarga é desenhada por um anel no canto
inferior esquerdo: o anel se fecha enquanto a espera corre e some quando a funcionalidade volta.
**Anel na tela = espere; sem anel = pode.**

### Os quatro níveis

| Nível | A partir de | O que aparece sob o dedo |
|---|---|---|
| 1 | o toque | o poço: escurecimento radial, um anel de alcance que cresce e um de compressão que encolhe |
| 2 | 3,0s | plasma, o mesmo campo de senos do buraco negro, crescendo dos 3s aos 7s |
| 3 | 7,0s | uma estrela massiva, que cresce de 12px a 46px com o plasma virando coroa em volta |
| 4 | 10,0s | a estrela implode e o horizonte de eventos nasce do colapso |

Cada promoção tem um **estalo**: um anel de 1px que sai do centro com um clarão curto atrás. O que
aparece depois explica *o que* mudou; o estalo diz *quando*. É o único aviso de nível, e ele acontece
no ponto onde o dedo está — nada disso passa pelo HUD, então o React continua renderizando uma vez
por disparo em vez de uma vez por quadro.

A explosão, o clarão e a estrela que fica escalam com o nível, e **a recarga também**: 3s, 4,2s, 5,5s
e 7s. Um nível que não custa nada não é uma escolha.

**O buraco negro não aparece do nada.** Ele é o que sobra quando uma estrela massiva colapsa, e é essa
a razão de existir o nível 3: sem ele, o momento mais forte da carga acontecia sem que nada tivesse
morrido para produzi-lo. A estrela cresce por três segundos e implode aos 10s.

**O nível 2 é longo, e o plasma é o que se vê andando ali dentro.** São quatro segundos entre acender
e o horizonte se formar, e o plasma cresce de 96px a 226px nesse intervalo, com o brilho subindo
junto. O progresso que o move é o de dentro do nível, não o da carga inteira: ele chega ao tamanho
cheio exatamente quando o horizonte está prestes a nascer. Sem esse trecho, o último nível seria só
mais um degrau logo depois do anterior, e uma carga longa precisa de um meio em que se veja indo a
algum lugar.

**A estrela é um disco de luz num buffer**, não um degradê em coordenadas de tela. O raio muda em todo
quadro (três segundos crescendo, meio segundo implodindo), e um degradê absoluto teria de ser
recriado junto, porque a chave do cache é o raio. Com o buffer, o raio é contínuo e não custa nada, e
o **mesmo** buffer desenhado maior e mais apagado vira o halo. O plasma continua desenhado por baixo:
a máscara dele já é um anel com o miolo vazio, então ele vira a coroa da estrela sem nenhuma máscara
nova. Uma pulsação lenta de ±8% na opacidade é a queima.

**O colapso é o único momento da carga em que tudo se inverte.** A estrela implode por uma curva que
acelera, porque colapso gravitacional não é encolhimento uniforme, e o brilho **sobe** enquanto ela
some, que é a mesma luz espremida em cada vez menos área. Um anel vem do alcance do poço para o
centro **ganhando** opacidade, ao contrário do estalo, que sai do centro e se apaga. E a promoção ao
último nível **não tem estalo**: um anel se expandindo no mesmo instante em que outro implode não lê
como nada.

**E ele puxa o céu de verdade.** O **k** publicado ganha um pico de 3,2× que sobe e volta dentro dos 0,45s
do colapso, então não sobra nada para desfazer e a mola de sempre devolve as estrelas. O número foi
calibrado contra o que se vê: as estrelas perto do centro já estão saturadas e mal se mexem, quem
mostra o colapso é a **borda** do campo. A 200px do centro o deslocamento vai de 42px para 92px, e é
esse anel externo saltando para dentro que lê como sucção. Em 4× a mesma estrela atravessa o centro e
sai do outro lado, o que lê como salto.

**O horizonte nasce de dentro do clarão**, passado 28% do colapso: 22px de raio, formando-se em 0,7s,
com halo mais forte que o do plasma e poeira suficiente para o disco ler como disco.

**Dos três desenhos do poço, o anel de alcance é o mais apagado.** Ele só marca onde a física acaba,
e a 330px do centro é o maior objeto da tela; com o contraste dos outros dois, viraria um círculo
gigante competindo com o miolo, que é onde a carga realmente acontece.

**O poço não dá degrau, o desenho dá.** Entre um nível e o seguinte, alcance e intensidade interpolam
continuamente, então a física aperta aos poucos; o degrau fica por conta do que aparece na tela, que
é onde ele informa em vez de sacudir. Depois do último nível o poço satura e o núcleo passa a pulsar
de leve, e é assim que "carregado ao máximo" se lê. Esse pulso entra no disco e na opacidade do halo,
**nunca no raio**: o raio é a chave do cache dos degradês, e um valor que oscila cinco por cento por
quadro o invalidaria a cada quadro. Pressionar também não dá soco: o poço entra por
uma rampa de 0,3s, senão o toque curto arrancaria o céu antes de explodir.

### Quem sabe o quê

| Onde | O que decide |
|---|---|
| `engine/layers/supernova.ts` | a carga, os níveis, o poço publicado, a explosão escalada e todo o desenho |
| `engine/plasma.ts` | o campo de senos em buffer, compartilhado com o buraco negro |
| `engine/layers/starfield.ts` | soma o puxão do poço ao do buraco negro, com o mesmo `puxar` |
| `scene/SpaceCanvas.tsx` | **o que conta como gesto no vazio** — conhecimento do DOM da página, não do motor |
| `scene/scenePlan.ts` | `NOVA_NIVEIS`, a tabela onde os tempos vivem uma vez só |
| `hud/NovaGauge.tsx` | o anel de recarga, animado só por CSS |
| `hud/useNovaHint.ts` | quando sugerir a supernova a quem ainda não a descobriu |

O `App` liga as pontas: a cena avisa qual nível foi acendido e ele entrega ao medidor a recarga
**daquele** nível, lida da mesma `NOVA_NIVEIS`. Um círculo que fecha antes (ou depois) de o próximo
disparo ser aceito mente para quem está olhando, e com níveis esse número deixou de ser um só sem
deixar de ter uma fonte só.

### A física atravessa o barramento nos dois sentidos

A carga publica `env.bus.well` e a explosão publica `env.bus.shock`. O campo de estrelas lê os dois
sem saber quem os publicou, como já fazia com a gravidade do buraco negro.

`well` é do **mesmo tipo** que `gravity` de propósito: o consumidor soma os dois com o mesmo `puxar`,
e `engine/gravity` não precisou saber que passaram a existir dois poços. São campos separados no bus,
e não uma lista, porque os ciclos de vida são diferentes — o buraco negro é permanente e a carga é um
gesto. Sem carga, o custo no laço das ~1120 estrelas é a comparação de `temPoco`, exatamente o que
`temGrav` já custava fora do Início.

**Puxar e empurrar é tudo o que eles fazem.** A mola que já existia no `Starfield` traz cada estrela
de volta sozinha, então nada aqui precisa lembrar de desfazer nada — e é ela que fixa o equilíbrio: o
deslocamento para de crescer em `k · raio · 5.28 / 2.6` px. Com os números de hoje, uma estrela a 80px
do centro anda ~10px no nível 1 e cai praticamente no ponto no nível 2. É essa conta que decide se a
carga lê como gravidade forte ou como tremor, e é ela que se refaz ao mexer em `poco.k`.

A força da onda continua **calibrada contra o que a cena já tinha**: 620 px/s de pico (nível 1)
desloca uma estrela em ~23px no auge da passagem da crista, a mesma ordem de grandeza da repulsão do
ponteiro. Menos que isso não lê como empurrão; muito mais e o céu sacode. Os níveis 2 e 3 multiplicam
esse valor, e o resto da onda (alcance, duração, espessura) acompanha.

**A recarga é sempre maior que a onda**, em todos os níveis, e é essa folga que permite ao motor
guardar **uma onda só**. Encurtar qualquer recarga para menos que a duração da onda daquele nível
quebra a premissa: a partir daí seria preciso um pool de ondas, e o `Starfield` teria de somar várias
por estrela. A segunda crista que a explosão ganha a partir do nível 2 é **só desenho**, justamente
por isso.

### O gesto

**Por que o clique não chega ao canvas.** O contêiner de rolagem cobre a viewport inteira, e o canvas
fica atrás dele. Quem escuta é a janela, e o filtro é estrito: o alvo precisa ser o próprio canvas ou
a caixa de uma `<section>` — **nunca um descendente dela**. Clicar num cartão, num campo, num botão ou
no bloco de conteúdo é interação com a página, e a página vem primeiro.

**Ter duração mudou onde o filtro de arraste age.** Antes bastava decidir no fim, porque o gesto era
instantâneo. Agora uma carga pode ficar acesa por segundos enquanto o visitante está, na verdade,
rolando a página ou girando a órbita de Projetos, então é o `pointermove` que **aborta** assim que o
gesto passa de `TOQUE_PARADO` px. Abortar não explode e não cobra recarga: o gesto era de outro dono.

**E o limite subiu de 6px para 14px.** Um dedo (ou uma mão no mouse) segurando por três segundos não
fica dentro de 6px, e o limite antigo cancelava a carga justamente em quem estava tentando carregá-la.
É um número só, valendo do `pointerdown` ao `pointerup`.

**O `blur` da janela é a rede do outro lado.** Soltar o botão fora da janela pode não gerar
`pointerup` nenhum, e uma carga sem fim ficaria presa puxando o céu.

### Desempenho

**A carga e a recarga vivem no relógio do motor**, não em `setTimeout`: um cronômetro do navegador
continua andando com a aba escondida, e a cena não anda. Um nível que subisse em segundo plano
mentiria sobre o que se vê. O medidor do HUD, por sua vez, é uma animação de CSS de duração
`--recarga` — o React renderiza uma vez por disparo, não uma vez por quadro.

**A onda vai para `env.bus.shock`** e é o `Starfield` — que já percorre as ~1120 estrelas — quem a
aplica, dentro do laço que já existe. `inner2`/`outer2` chegam prontos porque o teste é por estrela.
Só o anel da frente empurra (o miolo já foi varrido), e o empurrão entra como **deslocamento**, então
a mola devolve as estrelas sozinha.

**Os degradês da carga ficam em cache com os stops fixos**, e a intensidade entra por `globalAlpha`.
Sem isso, o poço escurecendo e o horizonte crescendo recriariam um `createRadialGradient` por quadro,
que é alocação pura. O plasma segue o padrão da cena — buffer pequeno repintado a 20fps e ampliado
pela GPU — e é **criado** só na primeira vez que uma carga chega ao nível 2: quem nunca segura não
paga o `ImageData`.

**Ociosa, a camada custa três comparações.** Sem carga, sem onda e sem estrela acesa, `update` e
`draw` saem na porta.

### A estrela que fica

**Ela nasce presa ao ponteiro e solta depois.** Durante os primeiros `settle` segundos (2) ela o
ignora: o cursor está exatamente em cima dela quando o clarão acontece, e uma estrela que fugisse do
dedo que a acendeu pareceria um erro. A repulsão entra por uma rampa de 0,9s, nunca por um
interruptor, o que leva a força total a ~2,9s, e a mesma mola do `Starfield` devolve a estrela ao
repouso quando o ponteiro sai.

**"Como as outras" inclui cair para o horizonte** e sentir o poço da carga seguinte. O puxão vem do
mesmo `engine/gravity.ts` que o campo usa, e entra **depois da mola**, como lá: a mola puxa de volta
para o repouso e o puxão é somado por cima do que sobrou. Invertida, a mola comeria o puxão do mesmo
quadro e a estrela nunca sairia do lugar.

**Só o ponteiro espera.** O buraco negro nunca esteve sob o dedo que acendeu a estrela: ele está no
centro da tela, então não há de que protegê-la, e a gravidade age desde o primeiro quadro, sem rampa.
Também não faz degrau, porque o puxão é aceleração somada quadro a quadro e não um salto de posição.

Só a repulsão do ponteiro segue duplicada: os números (110px, 26, mola 2.6) **espelham os do
`Starfield`**, e mexer lá pede mexer aqui. A gravidade não tem mais esse problema.

**O tamanho da estrela é a marca do nível.** O que nasce de uma carga cheia fica maior, cintila mais
forte e ganha uma auréola: é a luz que sobra depois de a onda passar, e o que diferencia um céu
montado com paciência de um montado a toques.

A auréola é **muito** discreta, e isso não é timidez. Quem diferencia a estrela já é o próprio ponto,
maior e cintilando mais forte; a auréola só confirma. Numa página de preto e linhas de 1px, um halo
que se lê à primeira vista vira a coisa mais brilhante da tela e passa a puxar o olho para o canto do
céu onde o visitante calhou de clicar.

Com `prefers-reduced-motion: reduce` a supernova **não carrega e não dispara**: a onda é movimento
amplo e inesperado, e o medidor perderia o sentido com as durações zeradas. É a mesma decisão do zoom
da câmera.
