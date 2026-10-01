---
paths:
  - "api/**"
  - "src/data/**"
  - "src/hooks/useRemoto.ts"
  - "vite.config.ts"
  - ".env.example"
  - "scripts/**"
---

## Dados de fora (`api/` e `src/data/`)

Quatro seções mostram dado que não é do projeto: Música (Spotify), Jogos (Steam) e Filmes
(Letterboxd), do lado pessoal, e Projetos (GitHub), do profissional. **Nenhuma das quatro pode ser
lida direto do navegador**, e é isso que decide a arquitetura inteira deste tema:

- Spotify e Steam exigem segredo, e os endpoints de "o que estou ouvindo" são do **usuário**, não do
  app: pedem um token renovado com a client secret;
- Steam e Riot não mandam cabeçalho de CORS;
- o Letterboxd **não tem API pública**. A deles está em beta fechado há anos, e o que existe é o RSS do perfil, também bloqueado por CORS;
- a API GraphQL do GitHub não responde sem token, e um token no navegador é um token público.

Por isso existe uma função por provedor em `api/`, servida pela Vercel, e é o único código do
projeto que roda fora do navegador.

| Função | Segredos | Cache de borda | O que devolve |
|---|---|---|---|
| `api/spotify.ts` | `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN` | 10s (e só 10s servido velho) | tocando agora, mais tocadas, mais ouvidos, recentes e os gêneros (três períodos) |
| `api/steam.ts` | `STEAM_API_KEY`, `STEAM_ID` | 60s | jogando agora e os das duas últimas semanas |
| `api/letterboxd.ts` | `LETTERBOXD_USER`, `LETTERBOXD_LIST` (opcional) | 30min | últimos assistidos com a nota, e uma lista escolhida a dedo |
| `api/github.ts` | `GITHUB_TOKEN` | 1h | os repositórios de `shared.json → projetos`, com atividade, linguagens e números |
| `api/minecraft.ts` | `MINECRAFT_USER` (não é segredo: o nick) | 1h (e um dia servida velha) | o nome como o jogo o escreve, a skin, o modelo (slim ou largo) e a capa |
| `api/riot.ts` | `RIOT_API_KEY`, `RIOT_ID` (`nome#tag`, **entre aspas** no `.env`), `RIOT_REGIAO` (`br1`…) | 5min | o perfil, as três maiores maestrias e as seis últimas partidas (`Liga`) |
| `api/atividade.ts` | `GITHUB_TOKEN` | 1h | o último ano no GitHub (calendário, contagens, sequência, pico) e o peso das linguagens |

**A conta de `api/atividade` é a do token (`viewer`)**, nunca um parâmetro: com o login na query,
qualquer um usaria o token do site para consultar qualquer perfil. O que é privado entra só como
número (o calendário conta sem dizer onde), e as linguagens vêm só dos repositórios públicos que não
são fork. O número depende das permissões do token: um *fine-grained* só de leitura pública conta menos
contribuição privada que um token pessoal completo (401 contra 471 em 29/09/2026).

**Ela também busca os ícones das linguagens**, no Iconify (`api.iconify.design`, sem chave), uma
chamada por conjunto da cascata com todos os nomes de uma vez e 4s de limite: o Devicon simplificado,
depois o original. Os nomes do Linguist que o Devicon escreve diferente estão em `APELIDOS` (CSS →
`css3`, Shell → `bash`...); o resto se acha pelo próprio nome. Falhar ali não derruba a resposta: a
linguagem só vem sem ícone, e a seção desenha a sigla.

**A Mojang responde sem chave, mas sem CORS**, e é só por isso que `api/minecraft` existe. São duas
chamadas (o nome vira o UUID, e o perfil do UUID traz as texturas num JSON em base64), e **as imagens
não passam pela função**: a página as usa como `background-image`, que não pede CORS, então ela
devolve só os endereços, trocados para `https` (a Mojang ainda os escreve em `http`). O modelo
precisa vir junto: a mesma textura desenha braços de 3 ou de 4 texels, e quem diz qual é o metadado.

**O League of Legends: a API entrega tudo o que a seção mostra** (conferido na especificação
OpenAPI da Riot, 30/09/2026): `account-v1 /accounts/by-riot-id` dá o PUUID; `summoner-v4
/summoners/by-puuid` o ícone e o nível; `champion-mastery-v4 /by-puuid/{puuid}/top` as maiores
maestrias; `match-v5 /by-puuid/{puuid}/ids` e uma chamada por partida, o resto. As imagens (ícone,
campeão, item) são do Data Dragon, sem chave. **A borda de nível e o brasão de maestria não vêm da
API**: são arte, e moram no projeto (ver `secoes.md`). A borda ranqueada que o jogador escolhe
(regalia) não existe na API. Uma visita custa ~12 chamadas (e duas ao Data Dragon: a versão e a lista de campeões, porque a
maestria vem só com o número do campeão), e os 5 minutos de borda cabem no limite da chave pessoal.

Quatro pegadinhas que já custaram uma tentativa cada:

- **o `#` do Riot ID começa um comentário no `.env`**: sem aspas, a tag some e a função responde
  `variavel:RIOT_ID`;
- **o servidor de desenvolvimento não relê uma variável que já leu**: ele copia o `.env.local` para o
  `process.env` a cada pedido, mas o `loadEnv` do Vite dá prioridade ao que já está no
  `process.env`. Corrigir um valor pede reiniciar o `npm run dev`;
- **uma chave recém-gerada responde 401 por alguns minutos** antes de valer;
- **ARAM: Desordem (fila 2400) não existe na API**: some do histórico e responde 403 pelo id (bug
  aberto no `RiotGames/developer-relations`, #1109). A busca de partidas é sem filtro de fila, e
  mesmo pedindo `queue=2400` a lista vem vazia; a gaveta avisa (`jogos.lol.semDesordem`).

**A chave.** Não existe API de terceiro legítima para histórico de partidas (todo rastreador usa
a chave própria dele na da Riot), e a chave de desenvolvimento expira a cada 24 horas. A que serve ao
site publicado é a *Personal API Key*, um produto que a Riot aprova uma vez e que não expira; falta
pedi-la (ver `pendencias.md`).

### O contrato é nosso, não do provedor

`src/data/types.ts` declara a forma que a interface consome, e as funções normalizam para ela. As
seções **nunca** leem o JSON do provedor: cada um devolve uma forma própria, herdada e cheia de
campos que não interessam, e qualquer um deles pode mudar a sua sem avisar. Trocar de provedor, ou
perder um, fica sendo trabalho de uma função em vez de uma seção inteira.

Tudo que é opcional ali é opcional de verdade: o Letterboxd tem filme sem nota, a Steam tem jogo sem
arte, e o Spotify não está tocando nada na maior parte do tempo.

E o contrato guarda a **lista** de artistas de uma faixa, com o endereço de cada um, em vez do nome já
juntado que a interface mostra. Uma faixa de dois artistas tem dois perfis, e com uma string só o
nome inteiro apontaria para o primeiro deles.

### As três decisões que valem para as três funções

- **`req`/`res` do Node cru**, sem os atalhos da Vercel (`res.json`, `res.status`). Eles existem no
  runtime dela e **não** no servidor de desenvolvimento do Vite, e a mesma função precisa rodar nos
  dois. É isso, e não purismo, que decide.
- **Import relativo daqui leva a extensão `.js`**, e não é enfeite. O `tsc -b` do projeto confere
  `api/` com `moduleResolution: bundler`, onde a extensão é opcional; a Vercel compila **cada função
  separadamente**, com `nodenext`, onde ela é obrigatória (`TS2835`). O resultado é o pior tipo de
  divergência: `npm run lint` verde aqui e o build vermelho lá, e só no deploy. Escrita, ela vale nas
  duas resoluções, porque as duas mapeiam `./x.js` para `./x.ts`. Vale também para o `import type`,
  que o `verbatimModuleSyntax` continua resolvendo.

  Para conferir antes de publicar, sem esperar o deploy:
  `npx tsc --noEmit --module nodenext --moduleResolution nodenext --target ES2023 --lib ES2023 --strict --types node api/*.ts`.
- **Cache de borda, nunca de navegador**: `s-maxage` com `max-age=0`. Uma segunda visita não pode
  mostrar o que estava tocando ontem, mas cem visitantes no mesmo minuto devem custar uma chamada só
  ao provedor. `stale-while-revalidate` deixa a borda servir o valor velho enquanto busca o novo, por
  dez vezes o cache, **menos no Spotify**: lá eram 30s e cinco minutos servido velho, e a primeira
  visita depois de um intervalo recebia a faixa de minutos atrás. Hoje são 10s e 10s, e a resposta
  leva `medidoEm` (quando o Spotify foi perguntado): a página soma ao progresso o tempo que a resposta
  passou no cache, e a barra e o relógio começam no ponto certo.
- **Falha nunca é 200 com corpo vazio.** Chave errada, provedor fora do ar e perfil fechado são
  estados diferentes de "não tem nada para mostrar", e um 200 vazio faria a página afirmar que a
  pessoa não ouviu nada este mês. Variável faltando responde 500 com o **nome** dela.

### A foto do site dos projetos (`api/preview`)

A janela de cada projeto mostra a foto do site dele, e a foto vem desta função, que usa o serviço de
captura do [microlink](https://microlink.io). Três decisões:

- **ela só fotografa o site que o próprio repositório declara.** A entrada é `?repo=dono/nome`, nunca
  um endereço: a função pergunta ao GitHub (com o mesmo `GITHUB_TOKEN`) qual é o *Website* do
  repositório, e é esse que ela fotografa. Aceitar um endereço solto faria dela um serviço de captura
  aberto para qualquer um, com a cota na conta de quem escreve a página. Privado ou sem site → 404;
- **1280×800, escala 1, JPEG**: ~150 kB. O padrão do microlink é PNG em escala 2, com 1,4 MB;
- **um dia na borda e uma semana servida velha** (`s-maxage=86400, stale-while-revalidate=604800`),
  porque o plano grátis aceita **25 capturas por dia** e um site pessoal não muda de cara de hora em
  hora. A imagem passa pela função, e não por um redirecionamento ao endereço do microlink: o
  endereço dele é de uma captura, e não se sabe por quanto tempo vive.

Sem foto (a cota acabou, o site caiu), a `<img>` se esconde e a moldura de 1px da janela volta a
aparecer, como em toda imagem da página, e o botão de rodar o site continua funcionando.

### O que cada provedor cobra de atenção

- **Spotify**: `204` do `currently-playing` é a resposta normal, não um erro — é assim que ele diz
  que nada está tocando, que é o estado da maior parte do dia. Pausado não conta como tocando, e
  episódio de podcast não tem a forma de faixa. O refresh token sai de `scripts/spotify-token.mjs`,
  que faz a autorização uma vez; o app precisa ter `http://127.0.0.1:8888/callback` nos Redirect
  URIs, com o **IP**, porque `localhost` é recusado, e com a porta, que é obrigatória no loopback.
  **Gênero não tem endpoint**, e faixa e álbum não trazem nenhum (conferido na conta real,
  01/10/2026): o que existe é a lista `genres` de cada **artista**, em `/me/top/artists`. A função
  pede os 50 maiores (o máximo) dos três períodos (`short`, `medium` e `long_term`) e soma por gênero
  (`contarGeneros`), e cada gênero leva **os artistas que o têm** (`quem`, com retrato e perfil), então a seção conta artistas, não horas. Cerca de 40% dos artistas voltam
  sem gênero nenhum e ficam fora da conta, sem aviso na tela. A
  chamada que dava os oito retratos agora é a de 50, e os retratos saem dos oito primeiros: o custo
  da mudança foram duas chamadas a mais, seis por resposta, e a resposta cresceu uns 18 KB com os artistas de cada gênero.
- **Steam**: `gameextrainfo` só existe enquanto a partida está aberta, e sumir é como a API diz que
  ela acabou. O tempo jogado vem da outra chamada, porque o resumo traz só o nome. **O perfil
  precisa estar público**: fechado, a API responde 200 sem esses campos, o que é indistinguível de
  não ter jogado. **A arte não sai de nenhuma das duas**, e por um tempo ela foi montada a partir do
  `appid` num caminho fixo do CDN (`steam/apps/<appid>/header.jpg`). Isso deixou de valer: a Steam
  guarda a arte da loja num caminho com hash de conteúdo
  (`steam/apps/<appid>/<hash>/header.jpg`), e o que foi publicado ou reprocessado sob o esquema novo
  não tem nada no caminho antigo. Uma convenção que envelhece não dá erro, ela some da tela.

  Hoje o caminho é **perguntado**, numa terceira chamada a `IStoreBrowseService/GetItems`, que aceita
  **muitos appids de uma vez**, não pede chave e devolve o `asset_url_format` da pasta junto do nome
  do arquivo. O formato serve os dois esquemas de graça, porque num jogo antigo o `header` vem sem
  hash. O `appdetails` da loja também teria a URL e **não** serve: com mais de um id ele responde
  `null`, e traz a página inteira do jogo para entregar uma linha.

  A mesma consulta traz as **duas artes** do jogo, e o contrato guarda as duas: a deitada (460x215)
  do destaque e a em pé (600x900, a da biblioteca) da pilha de recentes. Elas não são uma o recorte
  da outra, são dois desenhos que a Steam faz separadamente, e é por isso que a em pé não tem
  convenção de reserva: sem ela sobra a moldura vazia, que é melhor resposta que uma arte deitada
  espremida num retângulo alto.

  A resolução **nunca derruba a resposta**, e tem três degraus: a URL resolvida, a convenção antiga (que
  ainda acerta a maior parte do catálogo) e, quando as duas erram, a moldura vazia que a seção já
  desenha. É o arranjo da lista do Letterboxd, e pela mesma razão: o conteúdo daqui são os jogos.
- **Letterboxd**: é um feed, não um contrato. A forma pode mudar sem aviso e sem versão, e no dia em
  que mudar esta função para de achar os campos. **É o ponto mais frágil do projeto**, e é frágil por
  fora. Ele responde 403 sem um user-agent de navegador, traz listas e textos junto dos filmes (que
  se distinguem por não terem `filmTitle`), e escreve apóstrofo como `&#039;` — as entidades
  numéricas são decodificadas por faixa de dígitos, não caso a caso, porque um caso a menos vira um
  título errado na tela. Nota ausente é diferente de nota zero.
- **GitHub**: a leitura é pela API **GraphQL**, numa chamada só para todos os repositórios, com um
  alias por repositório, e traz as datas dos cem commits mais recentes de cada um nos últimos doze
  meses, que viram o código de barras do cartão. Pela REST seriam três ou quatro chamadas por
  repositório, e sem chave o limite dela é de 60 por hora por IP, dividido com tudo o que roda na
  mesma máquina da Vercel. A GraphQL exige chave, e é por isso que o `GITHUB_TOKEN` é obrigatório: um
  token *fine-grained* só com leitura de repositórios públicos basta. **Repositório privado nunca sai
  da função**, mesmo que o token o enxergue, e o que deixou de existir volta `null` da API e some sem
  derrubar os outros. A escolha chega pela query `repos`, validada como `dono/nome` antes de entrar no
  texto da consulta, e a borda guarda a resposta por uma hora, porque número de repositório muda em
  dias.

### A lista de favoritos é a parte mais frágil da parte mais frágil

O bloco de favoritos da seção Filmes **não sai do feed**: lista nenhuma do Letterboxd tem RSS — o
feed é só o diário —, e a alternativa era não ter o bloco. Ele sai de duas raspagens:

1. o HTML da página da lista, de onde vêm `data-item-slug`, `data-item-name` (que traz o ano entre
   parênteses) e `data-owner-rating` (de 1 a 10, metade da régua de 0 a 5 da tela);
2. o HTML da página de **cada filme**, uma requisição por título, de onde sai o pôster no `image` do
   JSON-LD.

A segunda existe porque a página da lista **não tem pôster nenhum**: as imagens entram por
JavaScript depois, e o que está no HTML é um espaço reservado. O `og:image` da página do filme
também não serve — é um recorte largo, e um pôster fora de 2:3 estraga a faixa inteira.

Três decisões seguram o custo e o risco disso:

- **teto de 12 filmes**, que é também o que uma lista precisa ter para continuar sendo uma escolha;
- **`AbortSignal.timeout` cobrindo o conjunto**: uma lista lenta não pode segurar os recentes, que
  são o conteúdo da seção;
- **ela nunca derruba a resposta.** Sem `LETTERBOXD_LIST`, com a página fora do ar ou com o HTML
  mudado de forma, o retorno é uma lista vazia e a seção mostra só os vistos por último. É a única
  exceção à regra de que falha não é lista vazia, e ela é deliberada: aqui a lista vazia é o estado
  normal de quem não configurou nada, e a variável é **opcional** justamente por isso — ela não passa
  por `ambiente()`, que responde 500 com o nome do que faltou.

`LETTERBOXD_LIST` aceita o endereço inteiro copiado da barra do navegador ou só o miolo
(`fulano/list/favoritos`).

### Como o front lê

`hooks/useRemoto.ts`, um só para os três:

- **nada é buscado antes de a seção ficar ativa.** Quem nunca abre Música não paga requisição
  nenhuma, e a primeira pintura continua intocada — é a decisão do `import()` do motor de cena;
- **a repetição só corre com a aba visível**, e voltar para a aba dispara uma busca na hora. É a
  mesma razão pela qual a recarga da supernova vive no relógio do motor: um cronômetro que corre
  escondido gasta para mostrar o que ninguém vê;
- **erro não apaga o que já estava certo.** Uma falha no meio de uma repetição mantém os dados
  anteriores: o que estava tocando há trinta segundos é melhor resposta que uma seção vazia;
- Música repete a cada 20s **ou quando a faixa que toca acaba** (mais 1,5s, nunca antes de 3s: o
  intervalo pode ser uma função da última resposta, estável, do escopo do módulo), Jogos a cada 60s, e **Filmes e Projetos não repetem**: um feed de filmes vistos e um
  repositório não mudam enquanto alguém olha para eles.

`react-doctor/no-set-state-after-await-in-effect` **aponta este hook**, e é falso positivo conhecido,
da mesma família do `AbortController` do `SpaceCanvas`. As duas escritas depois do `await` estão na
forma que a regra prescreve (`if (!controle.signal.aborted) setRemoto(...)`) e o cleanup chama
`abort()`; o detector não enxerga a guarda através da função nomeada que o `setTimeout` reagenda. Não
mexer aqui para calar a regra.

### Os segredos

Ficam em `.env.local` (fora do git) e nas variáveis de ambiente da Vercel, com os **mesmos nomes**:
as funções leem de `process.env` e não sabem em qual dos dois estão. `.env.example` documenta a
lista.

Em desenvolvimento, um plugin do Vite (`apply: 'serve'`, em `vite.config.ts`) carrega `api/` por
`ssrLoadModule` e injeta o `.env.local` no `process.env`, então `npm run dev` continua sendo o único
comando para abrir o projeto, sem a CLI da Vercel. **A leitura do env é por requisição**, não na
subida: um segredo acrescentado com o servidor no ar não fazia efeito, e o sintoma era a função
dizendo que a variável faltava enquanto ela estava no arquivo, à vista.

Isso vale para variável **acrescentada**, e não para variável **trocada**: `loadEnv` não passa por
cima do que já está no `process.env`, então mudar o valor de uma que o servidor já leu exige
reiniciar o `npm run dev`. O sintoma é pior que o anterior, porque não parece defeito: a função
responde 200 com o dado antigo.
