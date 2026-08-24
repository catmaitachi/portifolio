# Usuários

* Desenvolvedor
* Visitante

# Requisitos Funcionais

## RF01 - O visitante deve inserir um nickname personalizado.
A primeira interação do visitante com o portfólio será a inserção de um nickname personalizado. Além disso, deve haver a possibilidade de ser escolhido um nickname aleatório dentre os valores de um enum predefinido, caso o visitante não queira inserir um nickname personalizado.

## RF02 - O visitante deve alterar o tema.
Deve ser possível alternar entre os temas claro e escuro. O tema padrão deve ser dado pelo sistema operacional do visitante; caso ele não possua um tema definido, o tema padrão será o escuro.

## RF03 - O visitante deve escolher o idioma.
Deve ser possível, no mínimo, escolher entre os idiomas português e inglês. O idioma padrão deve ser o inglês, exceto quando o idioma do sistema operacional do visitante for português; nesse caso, o idioma padrão será o português.

## RF04 - O visitante deve escolher a cor principal.
Deve ser possível escolher a cor de destaque do portfólio dentre algumas predefinidas. A cor padrão será o azul.

## RF05 - O visitante deve ativar/desativar a scanline.
Deve ser possível ativar ou desativar a scanline. Ela deve estar ativada por padrão, cabendo ao visitante desativá-la se preferir.

## RF06 - O visitante deve acessar a área de trabalho.
Logo após inserir o nickname, o visitante deve acessar a área de trabalho, onde ele terá acesso a um terminal interativo, além de outras abas ao longo da interação.

## RF07 - O visitante deve usar o comando ajuda.
O comando deve listar todos os comandos disponíveis com uma breve descrição. Nomes alternativos: help, ?. Atalho: ctrl + h.

## RF08 - O visitante deve usar o comando sobre.
O comando deve exibir informações sobre o desenvolvedor, como nome, título, cidade, status, foto e uma biografia resumida, tudo deve ser entregue num formato que imita o fastfetch do Linux. Nome alternativo: about.

## RF09 - O visitante deve usar o comando limpar.
O comando deve limpar a tela do terminal, removendo todas as informações exibidas anteriormente. Nome alternativo: clear, cls. Atalho: ctrl + l.

## RF10 - O visitante deve usar o comando projetos.
O comando deve exibir uma lista enumerada de projetos do desenvolvedor, cada projeto deve conter um título, uma descrição resumida, um badge com a categoria do projeto, as tecnologias utilizadas e a data de criação. Ao clicar em um projeto, uma nova aba deve ser aberta na área de trabalho exibindo informações detalhadas sobre o projeto, como título, descrição completa, badges com as categorias do projeto, tecnologias utilizadas, data de criação, imagens e links para o repositório e para a página do projeto. Nome alternativo: projects.

## RF11 - O visitante deve usar o comando experiencias.
O comando deve listar as experiências do desenvolvedor em ordem decrescente. Cada experiência deve conter um título, uma descrição resumida, badges com a categoria da experiência, a data de início e a data de término. Ao clicar em uma experiência, uma nova aba deve ser aberta na área de trabalho exibindo informações detalhadas sobre a experiência, como título, descrição completa, badge com a categoria da experiência, data de início e data de término. Nome alternativo: experiences.

## RF12 - O visitante deve usar o comando contato.
O comando deve exibir uma lista com ícones de opções de contato do desenvolvedor, como e-mail, telefone, LinkedIn, GitHub etc. Ao clicar em uma opção de contato, o visitante deve ser redirecionado para a página correspondente. Nome alternativo: contact.

## RF13 - O visitante deve usar o comando sair.
O comando deve encerrar a sessão do visitante, removendo o nickname personalizado e redirecionando o visitante para a tela inicial do portfólio. Nomes alternativos: exit, quit. Atalho: ctrl + q.

## RF14 - O visitante deve visualizar o histórico de comandos.
O visitante deve ter acesso a um histórico de comandos digitados, podendo navegar entre eles com as setas para cima e para baixo do teclado, além de selecionar um comando do histórico e executá-lo novamente.

## RF15 - O visitante deve visualizar o autocomplete de comandos.
O visitante deve ter acesso a um autocomplete de comandos: ao digitar parte de um comando, será possível usar a seta para a direita do teclado para completá-lo.
