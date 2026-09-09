## Dados de fora (`api/` e `src/data/`)

Três seções do lado pessoal mostram dado que não é do projeto: Música (Spotify), Jogos (Steam) e
Filmes (Letterboxd). **Nenhuma das três APIs pode ser chamada do navegador**, e é isso que decide a
arquitetura inteira deste tema:

- Spotify e Steam exigem segredo, e os endpoints de "o que estou ouvindo" são do **usuário**, não do
  app: pedem um token renovado com a client secret;
- Steam e Riot não mandam cabeçalho de CORS;
- o Letterboxd **não tem API pública**. A deles está em beta fechado há anos, e o que existe é o RSS
  do perfil, também bloqueado por CORS.

Por isso existe uma função por provedor em `api/`, servida pela Vercel, e é o único código do
projeto que roda fora do navegador.

| Função | Segredos | Cache de borda | O que devolve |
|---|---|---|---|
| `api/spotify.ts` | `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN` | 30s | tocando agora, mais tocadas, mais ouvidos, recentes |
| `api/steam.ts` | `STEAM_API_KEY`, `STEAM_ID` | 60s | jogando agora e os das duas últimas semanas |
| `api/letterboxd.ts` | `LETTERBOXD_USER`, `LETTERBOXD_LIST` (opcional) | 30min | últimos assistidos com a nota, e uma lista escolhida a dedo |

**O League of Legends ficou de fora, e não por falta de tentativa.** Não existe API de terceiro
legítima para histórico de partidas: todo rastreador usa a chave própria dele na API da Riot, e a
chave pessoal expira a cada 24 horas.

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
- **Cache de borda, nunca de navegador**: `s-maxage` com `max-age=0`. Uma segunda visita não pode
  mostrar o que estava tocando ontem, mas cem visitantes no mesmo minuto devem custar uma chamada só
  ao provedor. `stale-while-revalidate` deixa a borda servir o valor velho enquanto busca o novo.
- **Falha nunca é 200 com corpo vazio.** Chave errada, provedor fora do ar e perfil fechado são
  estados diferentes de "não tem nada para mostrar", e um 200 vazio faria a página afirmar que a
  pessoa não ouviu nada este mês. Variável faltando responde 500 com o **nome** dela.

### O que cada provedor cobra de atenção

- **Spotify**: `204` do `currently-playing` é a resposta normal, não um erro — é assim que ele diz
  que nada está tocando, que é o estado da maior parte do dia. Pausado não conta como tocando, e
  episódio de podcast não tem a forma de faixa. O refresh token sai de `scripts/spotify-token.mjs`,
  que faz a autorização uma vez; o app precisa ter `http://127.0.0.1:8888/callback` nos Redirect
  URIs, com o **IP**, porque `localhost` é recusado, e com a porta, que é obrigatória no loopback.
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

  Ela **nunca derruba a resposta**, e tem três degraus: a URL resolvida, a convenção antiga (que
  ainda acerta a maior parte do catálogo) e, quando as duas erram, a moldura vazia que a seção já
  desenha. É o arranjo da lista do Letterboxd, e pela mesma razão: o conteúdo daqui são os jogos.
- **Letterboxd**: é um feed, não um contrato. A forma pode mudar sem aviso e sem versão, e no dia em
  que mudar esta função para de achar os campos. **É o ponto mais frágil do projeto**, e é frágil por
  fora. Ele responde 403 sem um user-agent de navegador, traz listas e textos junto dos filmes (que
  se distinguem por não terem `filmTitle`), e escreve apóstrofo como `&#039;` — as entidades
  numéricas são decodificadas por faixa de dígitos, não caso a caso, porque um caso a menos vira um
  título errado na tela. Nota ausente é diferente de nota zero.

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
- Música repete a cada 20s, Jogos a cada 60s, e **Filmes não repete**: um feed de filmes vistos não
  muda enquanto alguém olha para ele.

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
