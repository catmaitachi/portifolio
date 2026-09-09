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
| `api/letterboxd.ts` | `LETTERBOXD_USER` | 30min | últimos assistidos, com a nota |

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
  não ter jogado. A arte é montada a partir do `appid` no CDN **por convenção**, não por um endpoint,
  então ela pode não existir.
- **Letterboxd**: é um feed, não um contrato. A forma pode mudar sem aviso e sem versão, e no dia em
  que mudar esta função para de achar os campos. **É o ponto mais frágil do projeto**, e é frágil por
  fora. Ele responde 403 sem um user-agent de navegador, traz listas e textos junto dos filmes (que
  se distinguem por não terem `filmTitle`), e escreve apóstrofo como `&#039;` — as entidades
  numéricas são decodificadas por faixa de dígitos, não caso a caso, porque um caso a menos vira um
  título errado na tela. Nota ausente é diferente de nota zero.

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
