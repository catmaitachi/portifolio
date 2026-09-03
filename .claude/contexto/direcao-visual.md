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
