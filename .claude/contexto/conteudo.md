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
| `shared.json` | O que não muda entre idiomas: ordem canônica das seções, **os dois modos**, canais de contato, escala óptica dos logos. |
| `assets.ts` | Registro de imagens. JSON não importa arquivo, e o Vite precisa do `import` para versionar o asset. |

### Os dois modos

`shared.json → modos` guarda, para cada lado do site, as seções que ele tem e os canais de contato
que ele mostra:

```json
{ "key": "pessoal", "secoes": ["inicio", "sobre", "contato"], "canais": ["instagram", "tiktok"] }
```

- `secoes` é a **ordem de rolagem** daquele lado, e cada chave precisa existir em `secoes` (a lista
  canônica). O TypeScript pega isso, porque é `SectionKey`;
- `canais` são chaves de `canais`, e o TypeScript **não** pega, porque chave de canal é `string`. Um
  erro de digitação ali faria o canal simplesmente não aparecer daquele lado, sem erro de build e sem
  nada no console. Quem pega é o `npm run check:i18n`;
- os textos de cada modo (o rótulo no cabeçalho, e a etiqueta e a legenda que ele dá ao Início) ficam
  em `modos` nos dois dicionários. É `Record` total: um modo novo quebra o build até os dois terem
  o texto.

**O número da seção não está no dicionário.** Ele é a posição na ordem do modo em vigor, entregue por
prop. Escrito como texto, um lado com menos seções leria 02, 05, 03.

### As três seções que não têm lista

Música, Jogos e Filmes não guardam conteúdo nos dicionários: o que aparece nelas vem do Spotify, da
Steam e do Letterboxd em tempo de execução (ver `dados.md`). O que mora em `musica`, `jogos` e
`filmes` nos dois idiomas são só os **rótulos** e os nomes dos estados, que é justamente o que não
pode ser literal no componente.

`remoto` guarda os três estados de qualquer busca (esperando, falhou, vazio) num lugar só: eles não
são de nenhuma seção em particular, e repeti-los em três blocos seria três lugares para traduzir a
mesma frase.

`documento` é o título da aba, com `{parte}` e `{nome}` (ver `navegacao.md`). Ele fica no dicionário
como todo texto visível — e o título da aba é texto visível, ainda que fora da página.

### O perfil de uma seção

`shared.json → perfis` liga uma seção ao serviço de onde o dado dela vem:

```json
"musica": { "icone": "spotify", "rotulo": "Spotify", "url": "https://open.spotify.com/user/..." }
```

- a chave é a da **seção**, e o registro é parcial: Sobre e Contato não têm de onde vir;
- `icone` casa com uma chave de `ICONES` (`assets.ts`), com o arquivo em `src/assets/icons/` — glifo
  branco local, nunca CDN, pela mesma razão dos ícones de contato;
- `rotulo` é **marca**, e por isso não está nos dicionários: quem traduz é a frase em volta dele,
  `a11y.perfil`, que aceita `{rede}`.

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

`tipo` precisa existir em `experiencia.tipos` (`academico`, `extensao`, `estagio`, `freela`).
`periodo` é **ano.mês** e é rótulo, não posição — o espaçamento na curva é sempre uniforme.

### Os dois textos do Sobre

`sobre.paragrafos` é um bloco por modo (`profissional` e `pessoal`), `Record` total nos dois
dicionários: um lado novo do site quebra o build até ter o próprio texto. O título é o mesmo dos dois
lados, porque o assunto é o mesmo.

`sobre.dados` são os fatos sob a bio, hoje nascimento e residência. É lista com `key`, então
`check:i18n` confere ordem e campos como já faz com projetos e formações, e um terceiro fato não
pede nada no componente. O valor vai no dicionário apesar de ser dado, ao contrário da versão no
rodapé: a cidade leva o país escrito no idioma de quem lê.

### Adicionar uma formação

1. o logo em `src/assets/logos/` (branco sobre transparente, margens recortadas);
2. uma linha em `LOGOS` (`assets.ts`);
3. a escala óptica em `shared.json → logos`;
4. uma entrada em `formacoes.lista` nos dois dicionários, com o mesmo `slot`.

A lista alimenta a **seção Formação**, que existe só no modo profissional (`shared.json → modos`).

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

1. entrada em `shared.json → secoes` (a ordem canônica) **e** na lista `secoes` de cada modo que
   deve tê-la, que é o que decide onde ela rola;
2. a chave em `nav`, nos dois dicionários, e em `SectionKey` (`content/types.ts`);
3. um componente em `src/sections/` recebendo `SectionProps`, e uma linha em `MONTAR` (`App.tsx`),
   que é o único lugar que liga chave a componente;
4. opcionalmente, um céu em `scene/scenePlan.ts`.
