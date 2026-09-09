## Pendências

- **Nada disto está publicado.** Música, Jogos e Filmes leem `api/`, e `api/` só existe de verdade na
  Vercel: falta ligar o repositório, cadastrar as variáveis de `.env.example` e apontar o
  `luuspz.dev` para lá. O link do topo do `README` já aponta para lá, e só passa a
  resolver quando isso acontecer. Em desenvolvimento o plugin do Vite cobre isso (ver `dados.md`).
- **Girar os segredos depois de publicar.** A client secret do Spotify e a chave da Steam passaram
  por um canal de chat, então valem como comprometidas por precaução.
- **O LoL ficou de fora, e não por falta de tentativa.** Não existe API de terceiro legítima para
  histórico de partidas: todo rastreador usa a chave própria dele na API da Riot, e a chave pessoal
  expira a cada 24 horas.

- **Dois projetos são vagas** (`vaga-02`, `vaga-03`, estado `definir`): giram na órbita e não abrem
  descrição. Preencher quando houver projeto.
- TikTok está sem `url` em `shared.json`, então aparece como "em breve".
- **`LETTERBOXD_LIST` está no `.env.local` e falta nas variáveis da Vercel.** Sem ela lá, o bloco de
  favoritos simplesmente não aparece em produção, e a seção mostra só os vistos por último.
- **A bio do lado pessoal é rascunho.** Ela fala do que as três seções de dado remoto mostram, que é
  o que dá para afirmar sem inventar biografia. Reescrever com o que ele quiser contar
  (`sobre.paragrafos.pessoal`, nos dois dicionários).
- **Conferir os dados das formações.** A `conclusao` do SENAC (`2022.12`) e o `progresso` da PUC
  (`4/8`) entraram como espaço reservado para a feature de hover — são dados reais sobre a vida de
  alguém e precisam ser corrigidos por quem os conhece (`formacoes.lista`, nos dois dicionários).
- **Banners de `vaga-02` e `vaga-03`** não existem — as molduras seguem como espaço reservado até
  haver projeto.
