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
(`2π·r`), que é quem conhece o `r` do SVG.

**O número de segundos vem do disparo, não de uma constante.** A supernova tem três níveis de carga
e cada um cobra uma recarga própria; a cena avisa qual nível acendeu e o `App` lê a recarga daquele
nível na mesma `NOVA_NIVEIS` que o motor usa para cobrá-la. É o mesmo contrato de sempre, agora com
uma tabela no lugar de um número: o círculo precisa fechar exatamente quando o próximo disparo passa
a ser aceito.

O **nível** não aparece aqui. Ele se mostra na cena, sob o dedo que está carregando, que é onde o
visitante já está olhando — trazê-lo para o canto custaria um caminho novo entre o motor e o React
durante a carga, para dizer o que a tela já diz. `aria-hidden` porque não há informação ali: é o retorno
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
quem não clica no vazio nunca sabe que ela existe. O aviso conta as duas metades do gesto, clicar e
segurar, porque a segunda é ainda mais invisível que a primeira. `useNovaHint` (`hud/useNovaHint.ts`) decide
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
