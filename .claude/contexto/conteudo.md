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

`tipo` precisa existir em `experiencia.tipos` (`academico`, `extensao`, `estagio`, `freela`).
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
