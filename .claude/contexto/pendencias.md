## Pendências

- **Descrição do ClinPlay** é rascunho — o próprio texto avisa (`projetos.lista[0].descricao`, nos
  dois dicionários). Substituir pelo que o projeto realmente faz.
- **Dois projetos são vagas** (`vaga-02`, `vaga-03`, estado `definir`): giram na órbita e não abrem
  descrição. Preencher quando houver projeto.
- TikTok está sem `url` em `shared.json`, então aparece como "em breve".
- **Conferir os dados das formações.** A `conclusao` do SENAC (`2022.12`) e o `progresso` da PUC
  (`4/8`) entraram como espaço reservado para a feature de hover — são dados reais sobre a vida de
  alguém e precisam ser corrigidos por quem os conhece (`formacoes.lista`, nos dois dicionários).
- **Banners de `vaga-02` e `vaga-03`** não existem — as molduras seguem como espaço reservado até
  haver projeto.
- **O cartão de projeto aninha um link dentro de um botão**, e isso é decisão de design pendente,
  não descuido. O `.cartao` é `role="button"` e o "ver ao vivo" fica dentro dele: em ARIA um botão
  não pode conter um link, e o leitor de tela anuncia o cartão como botão para depois encontrar um
  controle que não deveria estar ali. Só afeta quem navega por leitor de tela ou teclado.

  Separar os dois — que é o que `react-doctor/html-no-nested-interactive` pede — tira o fechamento
  por clique: hoje o painel aberto cobre o cartão inteiro e clicar em qualquer ponto dele borbulha
  até o `role="button"` e fecha. Sem o aninhamento, sobram `Esc` e clicar em outro cartão, e é
  preciso decidir se o painel ganha um botão de fechar. **Resolver na próxima mexida no design da
  seção Projetos.**
