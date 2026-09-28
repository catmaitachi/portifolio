---
paths:
  - "src/**/*.tsx"
  - "src/hooks/**"
  - "src/scene/**"
---

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

Uma conta que só mede o elemento que recebe por parâmetro não mora no corpo do componente, onde seria
recriada a cada render: no escopo do módulo ela é uma ligação só, e fica visível que é uma conta sobre
o DOM, sem relação com o React. Os exemplos que estavam aqui (`encaixeDe` e `fracaoDe`, da faixa de
seções do celular) saíram com ela.

### Seção é `memo`

`MONTAR` (`App.tsx`) guarda cada seção embrulhada em `memo`. As duas props (`ativo` e `indice`) são
valores simples, então uma seção só renderiza quando uma delas muda para ela, ou quando o
idioma muda pelo contexto. O motivo é o estado da supernova, que mora no `App`: sem `memo`, cada
estrela acesa re-renderizava a página inteira no quadro da explosão, que é o quadro em que o canvas
mais trabalha. Trocar de seção também deixou de re-renderizar todas para mudar o `ativo` de duas.

Isso só vale enquanto as props continuarem simples. Uma prop nova que seja objeto ou função precisa
ser estável (`useMemo`, `useCallback`), senão o `memo` compara uma identidade nova a cada render e
não evita nada. É por isso que o `App` cria **uma vez**, num `useMemo`, os callbacks que passa a cada
`Tela` (trocar de aba, avisar a seção da rolagem, registrar o contêiner).

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

### O terceiro falso positivo que existiu: o clique no cartão lateral de Projetos

`react-doctor/no-static-element-interactions` apontava a `<div>` com `onClick` do cartão lateral da
órbita de Projetos, que era enriquecimento para o mouse (trocar de projeto era trabalho das setas e dos
traços-índice). A órbita saiu, e o falso positivo junto; a decisão fica registrada porque vale para o
próximo caso: **não deformar o código para calar a regra** quando a ação já existe num controle de
verdade na mesma tela.

Pela mesma razão a guarda `if (controle.signal.aborted)` fica **depois** do `await`, e não antes:
ela não checa o resultado do import, checa se o componente ainda existe depois da espera. Movida
para antes, seria sempre verdadeira e deixaria de proteger o único caso que importa.
