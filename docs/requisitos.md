# Requisitos

## Requisitos Funcionais (RF)

**RF01** — O sistema deve exibir 5 seções navegáveis por scroll vertical com snap: Início, Sobre, Projetos, Trajetória e Contato.

**RF02** — O sistema deve permitir navegação entre seções via menu lateral, clique e teclado (↑/↓, PageUp/Down, Home/End).

**RF03** — O sistema deve destacar visualmente a seção ativa no menu de navegação.

**RF04** — O sistema deve permitir alternar o idioma entre Português e Inglês através de um único botão.

**RF05** — O sistema deve persistir o idioma escolhido e detectar automaticamente o idioma do navegador na primeira visita.

**RF06** — O sistema deve trocar o idioma sem recarregar a página ou reiniciar animações em andamento.

**RF07** — A seção Início deve exibir nome, cargo/legenda e botões de ação, com entrada animada em cascata.

**RF08** — A seção Sobre deve exibir retrato, biografia com rolagem própria e lista de formações em badges.

**RF09** — O sistema deve indicar o estado de cada formação (concluído, cursando, pretensão).

**RF10** — O sistema deve converter a lista de formações em carrossel automático quando os badges não couberem na tela.

**RF11** — A seção Projetos deve exibir os projetos em um carrossel em órbita 3D, navegável por clique, arraste e teclado.

**RF12** — Cada cartão de projeto deve exibir banner, índice, nome, ano, papel, stack tecnológica e estado.

**RF13** — O sistema deve expandir a descrição do projeto sobre o cartão ao ser clicado, incluindo link "ver ao vivo" quando disponível.

**RF14** — O sistema deve indicar o estado de cada projeto (ativo, arquivado, vaga), sendo que projetos em estado "vaga" não abrem descrição.

**RF15** — A seção Trajetória deve exibir uma linha do tempo em curva com progresso preenchido até o evento ativo.

**RF16** — O sistema deve permitir navegar entre eventos da trajetória por arraste, setas de teclado ou botões dedicados.

**RF17** — O sistema deve exibir uma janela de 6 eventos visíveis por vez na linha do tempo, deslizando conforme a navegação.

**RF18** — O sistema deve exibir a ficha do evento ativo com cargo, organização, período, atividades e stack tecnológica.

**RF19** — A seção Contato deve permitir envio de mensagem via mailto, sem back-end.

**RF20** — O sistema deve exibir mensagem de erro caso o formulário de contato seja enviado vazio.

**RF21** — A seção Contato deve exibir cartões com canais de contato (GitHub, LinkedIn, Instagram).

**RF22** — O sistema deve exibir um fundo animado (canvas) com nebulosa, campo de estrelas, constelações e meteoros.

**RF23** — O sistema deve exibir um buraco negro central com halo e poeira orbital, visível apenas na seção Início.

**RF24** — O sistema deve exibir constelações reais diferentes para cada seção.

**RF25** — O sistema deve exibir um HUD com anéis giratórios e mira central, com abertura animada em cascata na entrada.

**RF26** — Todo texto exibido deve vir de um dicionário de idiomas (nenhuma string literal fixa no código).

## Requisitos Não Funcionais (RNF)

**RNF01** — A interface deve usar paleta estritamente monocromática (preto/branco), sem cor ou gradiente colorido.

**RNF02** — A estética deve seguir o estilo sci-fi/HUD minimalista (linhas finas de 1px, tracejados, tipografia mono).

**RNF03** — As animações não devem alocar memória a cada quadro (uso de estruturas pré-alocadas).

**RNF04** — Cálculos trigonométricos pesados devem usar tabelas de consulta (LUT) em vez de cálculo direto por quadro.

**RNF05** — Efeitos baseados em pixel devem ser renderizados em buffer reduzido e ampliados, não em resolução total.

**RNF06** — Uma camada visual desativada não deve consumir processamento.

**RNF07** — A animação de fundo deve pausar quando a aba do navegador não estiver visível.

**RNF08** — O layout deve ser responsivo, com breakpoints para mobile (≤640px) e telas baixas (≤720px de altura).

**RNF09** — No mobile, a navegação deve ser exibida como faixa horizontal e o layout em coluna única.

**RNF10** — A interface deve fornecer `aria-label` no menu de navegação e no seletor de idioma.

**RNF11** — A seção ativa deve ser marcada com `aria-current` para leitores de tela.

**RNF12** — O sistema deve respeitar a preferência `prefers-reduced-motion`, desativando animações quando solicitado.

**RNF13** — Os textos de acessibilidade também devem ser internacionalizados (PT/EN).
