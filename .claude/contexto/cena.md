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

**A estrela nasce presa ao ponteiro e solta depois.** Durante os primeiros `settle` segundos (2) ela
o ignora: o cursor está exatamente em cima dela quando o clarão acontece, e uma estrela que fugisse
do dedo que a acendeu pareceria um erro. O que precisa ser coberto é a **onda** (1,35s); passado
isso o gesto já terminou. A repulsão entra por uma rampa de 0,9s, nunca por um interruptor, o que
leva a força total a ~2,9s, e a mesma mola do `Starfield` devolve a estrela ao repouso quando o
ponteiro sai.

**"Como as outras" inclui cair para o horizonte.** A estrela acesa sentia o ponteiro mas não a
gravidade, e ficava parada num céu inteiro que gira — o que lê como defeito, não como estrela nova.
O puxão vem do mesmo `engine/gravity.ts` que o campo usa, e entra **depois da mola**, como lá: a mola
puxa de volta para o repouso e o puxão do horizonte é somado por cima do que sobrou. Invertida, a
mola comeria o puxão do mesmo quadro e a estrela nunca sairia do lugar.

**Só o ponteiro espera.** O `settle` (2s, com rampa de 0,9s) existe para a estrela não fugir do dedo
que a acendeu — o cursor está exatamente em cima dela no instante do clarão. O buraco negro nunca
esteve sob esse dedo: ele está no centro da tela, então não há de que proteger a estrela, e a
gravidade age **desde o primeiro quadro, sem rampa**. Também não faz degrau, porque o puxão é
aceleração somada quadro a quadro e não um salto de posição.

Só a repulsão do ponteiro segue duplicada: os números (110px, 26, mola 2.6) **espelham os do
`Starfield`**, e mexer lá pede mexer aqui. A gravidade não tem mais esse problema.

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
