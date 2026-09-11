## Regras de React que o projeto segue

**A revisão de qualidade periódica passa pelo [React Doctor](https://react.doctor)**
(`npx react-doctor@latest --verbose`). Na passagem da v1.1 ele achou **quatro** apontamentos, e os
quatro são os falsos positivos descritos aqui: `useRemoto`, o `AbortController` do `SpaceCanvas` e as
duas leituras do clique no cartão lateral de Projetos. Nada do que a v1.1 acrescentou foi apontado. Ele pega a classe de defeito que o `tsc` não vê e que não
aparece em teste, porque depende de timing: ref escrita durante o render, estado ajustado por efeito
depois de uma prop, efeito sem limpeza. A primeira passada achou 20 desses num código que compilava
e funcionava.

**Ele não substitui a leitura.** Na revisão de tokens e abertura ele devolveu os mesmos quatro, e os
defeitos reais daquela revisão estavam todos fora do que ele olha: glifos que a fonte não tem (`∆`,
`∑`, `↗`), `outline: none` em regiões focáveis, um hook que sobrescrevia a `transition` do cartão e
`will-change` permanente em todo cartão inclinável. A varredura precisa de leitura do código e de
conferência em fonte primária, e o React Doctor é uma das conferências.

Duas coisas fazem parte de usá-lo, e nenhuma é opcional:

- **buscar a receita canônica da regra** (`/docs/rules/react-doctor/<regra>`) antes de corrigir, e
  seguir tanto o fix prescrito quanto o teste de falso positivo;
- **rodar de novo e conferir**, nunca assumir. Numa das passadas a própria correção introduziu nove
  avisos de `exhaustive-deps` — extrair as refs para um hook utilitário quebrou a heurística que
  reconhece `useRef` como estável —, e só o re-run mostrou.

As regras abaixo valem para código novo, não só para o que foi corrigido.

### O render é puro: nada de escrever em ref no corpo do componente

O padrão "latest ref" está por toda parte — um listener global, um `rAF` ou um `setTimeout` precisa
do valor **corrente** de uma prop ou de um estado sem que ele entre nas dependências do efeito, que
o re-registrariam a cada quadro de arraste ou a cada troca de seção.

A ref é o instrumento certo; escrevê-la **durante o render** é o que está errado:

```ts
const indiceRef = useRef(indice);
indiceRef.current = indice;        // ✗ escrita no corpo do componente

const indiceRef = useRef(indice);  // ✓
useLayoutEffect(() => {
  indiceRef.current = indice;
});
```

O React pode executar um render e **descartar** o resultado: Strict Mode em desenvolvimento, ou uma
renderização concorrente interrompida por algo mais urgente. A escrita feita ali sobrevive ao
trabalho jogado fora, e a ref passa a descrever uma UI que nunca existiu. É defeito que não aparece
em teste e depende de timing para se manifestar.

**`useLayoutEffect`, não `useEffect`**, porque quem lê essas refs costuma ser um `rAF`: o layout
effect corre antes da pintura, então o quadro seguinte já enxerga o valor novo. Com `useEffect`
haveria uma janela de um quadro lendo o valor anterior.

**O `useRef` fica local, sem hook utilitário.** Extrair um `useValorAtual(valor)` foi a primeira
tentativa e piorou: o verificador de dependências reconhece `useRef(...)` como estável e o dispensa
das listas, mas não sabe disso sobre um hook customizado — cada ref passou a ser exigida nas
dependências de nove efeitos. Trocar doze erros por nove avisos não é corrigir.

### Estado que segue uma prop é derivado, não ajustado por efeito

Um `useEffect` que chama `setState` quando uma prop muda sempre custa um quadro: o render que já
aconteceu usou o valor velho, e só o seguinte mostra o certo.

- Quando o valor **sai** da prop, derive-o no render: `const escalonar = entrando && !navegando`,
  em vez de um efeito que ajusta um estado quando a prop muda.
- Quando o estado é de verdade mas precisa acompanhar a prop, use a atualização guardada **durante
  o render**, que o React descarta e refaz sem pintar o intermediário. Ela precisa **convergir**:
  depois de rodar, a condição não pode mais valer. É o que a Trajetória faz para distinguir "acabou
  de entrar" de "está navegando", e o Início para distinguir a abertura de uma volta (ver
  `entradas.md`).

Os dois exemplos que estavam escritos aqui eram o `Notice` e o `useNovaHint`, e os dois saíram do
projeto junto com as notificações. A regra não mudou com eles.

### Chave de lista é identidade, não posição

`key={i}` faz o React reaproveitar o nó quando a lista muda. Nos parágrafos da bio isso era visível:
trocar de idioma reescrevia o conteúdo dos mesmos `<p>`, e é dentro deles que `useDecipher` escreve
caractere a caractere. A chave é o próprio texto, e o nó é recriado limpo.

### Função pura que não usa estado vive fora do componente

`encaixeDe` e `fracaoDe` (`NavMenu`) só medem o elemento que recebem por parâmetro. No corpo do
componente eram recriadas a cada render; no escopo do módulo são uma ligação só, e fica visível que
são contas sobre o DOM, sem relação com o React.

### Seção é `memo`

`MONTAR` (`App.tsx`) guarda cada seção embrulhada em `memo`. As três props (`ativo`, `indice` e
`modo`) são valores simples, então uma seção só renderiza quando uma delas muda para ela, ou quando o
idioma muda pelo contexto. O motivo é o estado da supernova, que mora no `App`: sem `memo`, cada
estrela acesa re-renderizava a página inteira no quadro da explosão, que é o quadro em que o canvas
mais trabalha. Trocar de seção também deixou de re-renderizar todas para mudar o `ativo` de duas.

Isso só vale enquanto as props continuarem simples. Uma prop nova que seja objeto ou função precisa
ser estável (`useMemo`, `useCallback`), senão o `memo` compara uma identidade nova a cada render e
não evita nada.

### O cleanup do `SpaceCanvas` usa `AbortController`, e a regra continua acesa

O efeito que monta a cena registra listeners **depois de um `await`** (o motor entra por `import()`
dinâmico), então o cleanup não pode citar cada `removeEventListener` — eles não existem quando ele é
criado. Os três listeners vão num `AbortController`, e o cleanup chama `abort()`.

Isso é mais forte que remover um a um, não mais fraco: o sinal já abortado faz o `addEventListener`
**não registrar nada**, então o caso "desmontou enquanto o motor carregava" fica coberto por
construção, em vez de depender do argumento de que o trecho pós-`await` é todo síncrono. O `stage`,
que aloca canvas e rAF, continua guardado numa variável e desfeito no mesmo cleanup.

### O outro falso positivo aceito: `useRemoto`

`react-doctor/no-set-state-after-await-in-effect` aponta `hooks/useRemoto.ts`. As duas escritas
depois do `await` estão exatamente na forma que a receita canônica prescreve
(`if (!controle.signal.aborted) setRemoto(...)`), e o cleanup chama `abort()`: uma re-execução do
efeito aborta a anterior antes de a nova começar, então não há escrita fora de ordem. O detector não
enxerga a guarda através da função nomeada que o `setTimeout` reagenda.

Vale a mesma regra do `SpaceCanvas`: **não deformar o código para calar a regra**, e não trocar o
`AbortController` por um sinalizador solto, que cobriria menos — ele não cancelaria a requisição em
voo, só ignoraria a resposta.

`react-doctor/effect-needs-cleanup` **continua apontando este efeito**, porque procura
`removeEventListener` literal no cleanup e não reconhece o `signal`. É falso positivo conhecido: não
mexer aqui para calar a regra, e não trocar o `AbortController` por remoção manual, que reintroduz o
caso não coberto.

### O terceiro falso positivo aceito: o clique no cartão lateral de Projetos

`react-doctor/no-static-element-interactions` e `click-events-have-key-events` apontam a mesma linha
do `ProjectCard`: uma `<div>` com `onClick` e sem `role`, sem `tabIndex` e sem tratador de teclado.

Ela é **enriquecimento para o mouse**, e a função que ela oferece está inteira em outro lugar: trocar
de projeto é trabalho das setas ←/→ e dos traços-índice, que são botões de verdade e estão na
tabulação. Quem navega por teclado não perde nada por essa `<div>` não responder, porque nunca chega
nela.

As duas saídas que a regra prescreve pioram o que está aqui:

- **virar um `<button>`** repõe exatamente o defeito que o painel de descrição deixou para trás: um
  controle com um `<a>` dentro, que ARIA não permite. Foi por isso que o `role="button"` saiu;
- **ganhar `tabIndex` e um tratador de teclado** devolve três cartões à tabulação para duplicar o
  que as setas já fazem, e leva o foco para dois cartões que o visitante não consegue ler, porque
  estão girados e apagados na órbita.

A regra não tem como enxergar que a ação existe duas vezes na mesma tela. Vale a mesma decisão dos
outros dois: **não deformar o código para calar a regra.**

Pela mesma razão a guarda `if (controle.signal.aborted)` fica **depois** do `await`, e não antes:
ela não checa o resultado do import, checa se o componente ainda existe depois da espera. Movida
para antes, seria sempre verdadeira e deixaria de proteger o único caso que importa.
