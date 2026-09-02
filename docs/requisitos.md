# Requisitos

## Requisitos Funcionais (RF)

**RF01** — O sistema deve exibir 5 seções navegáveis por scroll vertical com snap: Início, Sobre, Projetos, Trajetória e Contato.

**RF02** — O sistema deve permitir navegação entre seções via menu lateral, clique e teclado (↑/↓, PageUp/Down, Home/End), e no mobile também pela rolagem da faixa de seções, que deve mover a página e o destaque de forma contínua durante o gesto.

**RF03** — O sistema deve destacar visualmente a seção ativa no menu de navegação.

**RF04** — O sistema deve permitir alternar o idioma entre Português e Inglês através de um único botão.

**RF05** — O sistema deve persistir o idioma escolhido e detectar automaticamente o idioma do navegador na primeira visita.

**RF06** — O sistema deve trocar o idioma sem recarregar a página ou reiniciar animações em andamento.

**RF07** — A seção Início deve exibir etiqueta, nome e legenda, com entrada animada em cascata.

**RF08** — A seção Sobre deve exibir retrato, biografia com rolagem própria e lista de formações em badges.

**RF09** — O sistema deve indicar o estado de cada formação (concluído, cursando, pretensão).

**RF10** — O sistema deve converter a lista de formações em carrossel automático quando os badges não couberem na tela.

**RF11** — A seção Projetos deve exibir os projetos em um carrossel em órbita 3D, navegável por clique, arraste e teclado.

**RF12** — Cada cartão de projeto deve exibir banner, índice, nome, linha de resumo, ano, papel, stack tecnológica e estado.

**RF13** — O sistema deve expandir a descrição do projeto sobre o cartão ao ser clicado, incluindo link "ver ao vivo" quando disponível.

**RF14** — O sistema deve indicar o estado de cada projeto (ativo, arquivado, vaga), sendo que projetos em estado "vaga" não abrem descrição.

**RF15** — A seção Trajetória deve exibir uma linha do tempo em curva com progresso preenchido até o evento ativo.

**RF16** — O sistema deve permitir navegar entre eventos da trajetória por arraste, setas de teclado ou botões dedicados.

**RF17** — O sistema deve exibir uma janela de 6 eventos visíveis por vez na linha do tempo — 4 em telas estreitas (≤640px) —, deslizando conforme a navegação.

**RF18** — O sistema deve exibir a ficha do evento ativo com cargo, organização, período, tipo, atividades e stack tecnológica.

**RF19** — A seção Contato deve permitir envio de mensagem via mailto, sem back-end.

**RF20** — O sistema deve exibir mensagem de erro caso o formulário de contato seja enviado vazio, sendo o nome opcional e a mensagem obrigatória.

**RF21** — A seção Contato deve exibir cartões com os canais de contato definidos no conteúdo (GitHub, LinkedIn, Instagram e TikTok).

**RF22** — O sistema deve exibir um fundo animado (canvas) com nebulosa, campo de estrelas, constelações e meteoros.

**RF23** — O sistema deve exibir um buraco negro central com halo e poeira orbital, visível apenas na seção Início.

**RF24** — O sistema deve exibir constelações reais diferentes para cada seção.

**RF25** — O sistema deve exibir um HUD com anéis giratórios e mira central, com abertura animada em cascata na entrada.

**RF26** — Todo texto exibido deve vir de um dicionário de idiomas (nenhuma string literal fixa no código).

**RF27** — O sistema deve acender uma estrela e disparar uma onda de choque que desloca as estrelas vizinhas quando o visitante clicar ou tocar em uma área vazia da cena.

**RF28** — O sistema deve impor um tempo de recarga entre duas estrelas acesas, indicado por um medidor circular que se fecha durante a espera e desaparece quando a funcionalidade volta a estar disponível.

**RF29** — O sistema deve sugerir a funcionalidade de acender estrelas por meio de um aviso dispensável, que não deve ser exibido a quem já a descobriu em qualquer visita anterior.

**RF30** — A biografia deve entrar cifrada e se decifrar progressivamente, um parágrafo após o outro, quando a seção Sobre se torna ativa.

**RF31** — Cada seção deve ter uma animação de entrada própria, disparada quando ela se torna a seção ativa.

**RF32** — O badge de formação deve revelar seu detalhe (data de conclusão ou etapas cumpridas) sob o ponteiro, e exibi-lo já aberto em dispositivos sem ponteiro.

**RF33** — O painel de descrição do projeto deve ser fechado pela tecla Esc e ao sair da seção Projetos.

**RF34** — Canal de contato sem endereço cadastrado deve ser exibido como espaço reservado, fora da navegação.

**RF35** — Imagem ausente (banner de projeto ou retrato) deve ser substituída por uma moldura de espaço reservado.

**RF36** — O sistema deve exibir a versão do portfólio, obtida do `package.json` durante o build.

**RF37** — O sistema deve exibir o crédito de autoria da ferramenta utilizada na construção.

## Requisitos Não Funcionais (RNF)

**RNF01** — A interface deve usar paleta estritamente monocromática (preto/branco), sem cor ou gradiente colorido, exceto em marcas de terceiros (logos de instituições e banners de projetos).

**RNF02** — A estética deve seguir o estilo sci-fi/HUD minimalista (linhas finas de 1px, tracejados, tipografia mono).

**RNF03** — As animações não devem alocar memória a cada quadro (uso de estruturas pré-alocadas).

**RNF04** — Cálculos trigonométricos pesados devem usar tabelas de consulta (LUT) em vez de cálculo direto por quadro.

**RNF05** — Efeitos baseados em pixel devem ser renderizados em buffer reduzido e ampliados, não em resolução total.

**RNF06** — Uma camada visual desativada não deve consumir processamento.

**RNF07** — A animação de fundo deve pausar quando a aba do navegador não estiver visível, e as contagens de tempo da interface não devem correr com a aba oculta.

**RNF08** — O layout deve ser responsivo, com breakpoints para mobile (≤640px) e telas baixas (≤720px de altura).

**RNF09** — No mobile, a navegação deve ser exibida como faixa horizontal rolável, com o rótulo de cada seção visível, e a seção ativa deve permanecer centralizada em qualquer posição da lista; o layout fica em coluna única.

**RNF10** — A interface deve fornecer `aria-label` no menu de navegação, no seletor de idioma, no carrossel de projetos, na linha do tempo e no grupo de canais de contato.

**RNF11** — A seção ativa e o evento ativo da linha do tempo devem ser marcados com `aria-current` para leitores de tela.

**RNF12** — O sistema deve respeitar a preferência `prefers-reduced-motion`, desativando animações quando solicitado.

**RNF13** — Os textos de acessibilidade também devem ser internacionalizados (PT/EN).

**RNF14** — O indicador de foco deve ser visível apenas na navegação por teclado.

**RNF15** — Elementos fora da janela visível ou cobertos por um painel devem sair da navegação por tabulação, e as fichas de trajetória inativas devem ficar inertes para leitores de tela.

**RNF16** — Retângulos de conteúdo com borda devem ter os cantos superior-esquerdo e inferior-direito chanfrados, mantendo cantos arredondados discretos onde o navegador não oferecer suporte.

**RNF17** — A seleção de texto deve ficar desabilitada por padrão e reabilitada apenas no conteúdo textual, para não interferir nos controles de arraste.

**RNF18** — Os parágrafos devem ser justificados com hifenização automática, e o idioma declarado no documento deve acompanhar o idioma escolhido.

**RNF19** — O motor de cena deve ser carregado sob demanda, em pacote separado do restante da aplicação.

**RNF20** — Os dicionários PT e EN devem ser validados: chave ausente ou estado inválido deve quebrar a checagem de tipos, e um script dedicado deve conferir o paralelismo entre as listas dos dois idiomas.
