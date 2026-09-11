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

Projetos segue o mesmo arranjo desde que passou a ler o GitHub: `projetos` guarda só os rótulos,
e a escolha dos repositórios mora em `shared.json → projetos` (ver *Adicionar um projeto*).

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

Projeto é repositório do GitHub, e acrescentar um é uma linha em `shared.json → projetos`:

```json
"projetos": ["catmaitachi/Scorepad", "catmaitachi/portifolio"]
```

- `dono/nome`, exatamente como na URL do repositório, e a ordem da lista é a ordem da órbita;
- **só repositório público aparece.** Um privado é descartado pela função mesmo que o token o
  enxergue, e um renomeado some até a linha ser corrigida;
- o texto do cartão é o do GitHub: a descrição, os tópicos e o campo *Website* do repositório, que
  vira o link "ver ao vivo". Mudar o que o cartão diz é mudar o repositório, sem tocar aqui;
- lista vazia é estado previsto: a seção diz que nada foi selecionado ainda e não busca nada;
- a função aceita até doze por consulta (`TETO`, em `api/github.ts`).

### Adicionar uma experiência

Uma entrada em `experiencia.lista` nos dois dicionários. A lista está em **ordem cronológica**
(mais antiga à esquerda) e o evento ativo inicial é o mais recente.

```json
{
  "key": "empresa-2026-01",
  "cargo": "Cargo",
  "org": "Empresa ou projeto",
  "url": "https://empresa.com",
  "periodo": "2026.01",
  "tipo": "emprego",
  "texto": "Um parágrafo sobre o que o trabalho foi, na primeira pessoa.",
  "stack": ["Até", "cinco", "itens"],
  "logo": "empresa"
}
```

- `tipo` é `extensao`, `freela` ou `emprego`, que é o trabalho remunerado constante, do estágio à
  CLT. Os nomes ficam em `experiencia.tipos`, que é `Record` total: uma categoria nova quebra o build
  até ter nome nos dois idiomas;
- `periodo` é **ano.mês** e é o rótulo do nó na curva, não posição: o espaçamento é sempre uniforme.
  Ele não aparece na ficha;
- `url` é opcional: com ele, o subtítulo vira link, sublinhado e sem ícone;
- `texto` é um parágrafo só, contado como a bio, e não repete o nome da empresa, que já está no
  subtítulo;
- `logo` é opcional e é uma chave de `LOGOS` (`assets.ts`), com o arquivo em `src/assets/logos/`. Ele
  é pintado por máscara no fundo da ficha, então **pode ser o logo colorido**, desde que o fundo seja
  transparente: um retângulo de fundo vira um retângulo apagado. Foi o caso do banner da ClinPlaY,
  que tinha fundo branco e virou `logos/clinplay.svg` sem ele.

### Os dois textos do Sobre

`sobre.paragrafos` é um bloco por modo (`profissional` e `pessoal`), `Record` total nos dois
dicionários: um lado novo do site quebra o build até ter o próprio texto. O título é o mesmo dos dois
lados, porque o assunto é o mesmo.

`sobre.dados` são os fatos sob a bio, hoje aniversário e residência. É lista com `key`, então
`check:i18n` confere ordem e campos como já faz com projetos e formações, e um terceiro fato não
pede nada no componente. O valor vai no dicionário apesar de ser dado, ao contrário da versão no
rodapé: a cidade leva o país escrito no idioma de quem lê, e a data leva o formato — `07/07/2005` em
português, `July 7, 2005` em inglês.

### Adicionar uma formação

1. o logo em `src/assets/logos/` (branco sobre transparente, margens recortadas, **com o nome da
   instituição no desenho**, porque o crachá não o escreve de novo, e com traço que aguente o
   tamanho do crachá, ver abaixo);
2. uma linha em `LOGOS` (`assets.ts`);
3. a escala óptica em `shared.json → logos`;
4. uma entrada em `formacoes.lista` nos dois dicionários, com o mesmo `slot`.

**O logo se confere no tamanho em que aparece, não no arquivo.** No crachá ele tem ~62px de altura, e
o que decide o tom ali é a espessura do traço nessa escala, e não a cor do arquivo. O da PUC e o do
SENAC são os dois `#fff`, e mesmo assim o da PUC saía num branco visivelmente mais apagado: o brasão é
desenho de traço fino, um risco de 2px num arquivo de 480px vira um terço de pixel no crachá, e o
navegador pinta essa cobertura parcial como cinza. O SENAC é forma cheia e não tem o problema.

O traço do brasão foi engrossado 1px no próprio arquivo, e a luminância mediana do logo no crachá foi
de 114 para 180 em DPR 2 (o SENAC fica em 255). Com 2px o emblema do escudo fechava num disco. Pintar
o logo por máscara com um token de cor não resolveria nada: a máscara usa o mesmo alfa que produz o
cinza.

A lista alimenta a **seção Formação**, que existe só no modo profissional (`shared.json → modos`), e
a **ordem em que elas aparecem não é a desta lista**: a seção agrupa por estado, primeiro o que está
`cursando`, depois `concluido` e por fim `pretensao` (ver `secoes.md`). A ordem escrita aqui só
desempata dentro do mesmo estado, então acrescentar uma formação é escrevê-la onde fizer sentido para
quem lê o JSON, sem pensar em posição de tela.

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

`estado`: `concluido` (barra 100%), `cursando` (a fração de `progresso`) ou `pretensao`.

**A `pretensao` é um cartão vago**, e o dado dela é só `slot`, `nivel` e `estado`:

```json
{ "slot": "mestrado", "nivel": "Mestrado", "estado": "pretensao" }
```

Sem instituição, sem curso e sem logo: o crachá mostra o nível e o selo, mais apagado que os outros
(ver `secoes.md`). `instituicao` e `curso` são opcionais no tipo por causa dela, e o `slot`
continua obrigatório porque é ele que liga as duas listas no `check:i18n`. Um `slot` sem linha em
`LOGOS` só quer dizer que não há logo.

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
