## Pendências

- **Nada disto está publicado.** Música, Jogos, Filmes e Projetos leem `api/`, e `api/` só existe de verdade na
  Vercel: falta ligar o repositório, cadastrar as variáveis de `.env.example` e apontar o
  `luuspz.dev` para lá. O link do topo do `README` já aponta para lá, e só passa a
  resolver quando isso acontecer. Em desenvolvimento o plugin do Vite cobre isso (ver `dados.md`).
- **Girar os segredos depois de publicar.** A client secret do Spotify e a chave da Steam passaram
  por um canal de chat, então valem como comprometidas por precaução.
- **O LoL ficou de fora, e não por falta de tentativa.** Não existe API de terceiro legítima para
  histórico de partidas: todo rastreador usa a chave própria dele na API da Riot, e a chave pessoal
  expira a cada 24 horas.

- **`GITHUB_TOKEN` falta no `.env.local` e na Vercel.** Sem ele a seção Projetos mostra o estado de
  falha. Um token *fine-grained* só com leitura de repositórios públicos basta (ver `.env.example`).
- **O texto da ClinPlaY na Trajetória é rascunho**, escrito a partir do que já estava no
  dicionário: a plataforma, o papel de Scrum Master e a stack. Reescrever com o que ele quiser contar (`experiencia.lista`, nos dois dicionários). O link do
  subtítulo aponta para `https://clinplay.com`, o endereço que estava no antigo cartão de projeto:
  conferir.
- TikTok está sem `url` em `shared.json`, então aparece como "em breve".
- **`LETTERBOXD_LIST` está no `.env.local` e falta nas variáveis da Vercel.** Sem ela lá, o bloco de
  favoritos simplesmente não aparece em produção, e a seção mostra só os vistos por último.
- **A bio do lado pessoal é rascunho.** Ela fala do que as três seções de dado remoto mostram, que é
  o que dá para afirmar sem inventar biografia. Reescrever com o que ele quiser contar
  (`sobre.paragrafos.pessoal`, nos dois dicionários).
- **Conferir os dados das formações.** A `conclusao` do SENAC (`2022.12`) e o `progresso` da PUC
  (`4/8`) entraram como espaço reservado para a feature de hover — são dados reais sobre a vida de
  alguém e precisam ser corrigidos por quem os conhece (`formacoes.lista`, nos dois dicionários).
- **Contraste padrão abaixo do WCAG AA.** Os textos em `--tx-rotulo` (40%) e abaixo ficam entre 1,9:1
  e 3,7:1 sobre o preto. É a estética da página, e quem pede contraste ao sistema já recebe tudo acima
  de 4,5:1 (`prefers-contrast`). Subir o padrão muda o desenho da página inteira.

---

## Direção de longo prazo

Ideias já decididas, ainda não implementadas. Estão aqui e não em `secoes.md` porque descrevem o que
as seções **vão ser**, e aquele arquivo descreve o que elas são.

### Jogos divide a seção com o LoL

A Riot volta ao plano, com as últimas partidas do League of Legends ao lado da Steam. O que fez ela
sair continua valendo e precisa de resposta antes de começar (ver a nota do LoL acima): a chave
pessoal da API expira a cada 24 horas, então isso pede uma chave de produção aprovada pela Riot, e
não um contorno.

A seção passa a ser **dividida entre os dois serviços**, e é por isso que a Steam se compacta na
estante: ela precisava caber em metade do espaço sem perder as capas.

O `PerfilExterno` de hoje é um por seção, e uma seção com dois serviços quebra essa premissa.
