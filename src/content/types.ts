/**
 * Forma do conteúdo.
 *
 * Os dicionários são JSON puro (`pt.json`, `en.json`) — editá-los não exige
 * tocar em código. Estes tipos são o contrato que o TypeScript checa contra
 * eles no `index.ts`: uma chave faltando num idioma vira erro de compilação, não
 * um `undefined` em produção.
 *
 * Texto com valor variável usa marcador `{nome}` em vez de concatenação. A ordem
 * das palavras muda entre idiomas; `format()` respeita a do próprio dicionário.
 */

export type Lang = 'pt' | 'en';

export type SectionKey =
  | 'inicio'
  | 'sobre'
  | 'projetos'
  | 'experiencia'
  | 'github'
  | 'musica'
  | 'jogos'
  | 'filmes'
  | 'contato';

/**
 * As telas do site, que são o que o cabeçalho navega.
 *
 * Uma tela é uma área que rola por dentro e **empilha** as seções dela, uma
 * embaixo da outra, como partes de um documento. Quem diz qual seção mora em
 * qual tela é `shared.json → telas`.
 */
export type TelaKey = 'dossie' | 'hobbies' | 'trajetoria';

export type EstadoFormacao = 'concluido' | 'cursando' | 'pretensao';

/**
 * As três categorias da Trajetória: extensão, freelance e o trabalho
 * remunerado constante, do estágio à CLT.
 */
export type TipoExperiencia = 'extensao' | 'freela' | 'emprego';

/** Etapas cumpridas de um total — a fração que preenche a barra de `cursando`. */
export interface ProgressoFormacao {
  feito: number;
  total: number;
}

export interface Formacao {
  /**
   * A identidade do item, que liga as duas listas no `check:i18n`, e a chave de
   * LOGOS (assets.ts) e de `logos` (shared.json). Sem logo registrado, o crachá
   * fica sem imagem.
   */
  slot: string;
  /**
   * `instituicao` e `curso` são opcionais por causa da `pretensao`, que é um
   * cartão vago: ela mostra só o nível e o selo, e a formação que ainda não
   * existe não diz onde nem o quê.
   *
   * Com logo, a instituição não é escrita no crachá: vira o nome acessível do
   * logo, que já traz o nome desenhado.
   */
  instituicao?: string;
  nivel: string;
  curso?: string;
  estado: EstadoFormacao;
  /**
   * `concluido`: quando terminou, no formato ano.mês. Fica escondida atrás da
   * barra e aparece quando o ponteiro entra no badge. Ausente = badge sem
   * detalhe, e a barra ocupa a linha inteira.
   */
  conclusao?: string;
  /**
   * `cursando`: a barra é sempre a fração `feito/total` — não um meio-termo
   * decorativo — e a própria fração aparece no hover. Ausente = 50%, que é só o
   * "em algum ponto do caminho" de antes.
   */
  progresso?: ProgressoFormacao;
}

/**
 * Um fato de identificação, sob a bio: nascimento e residência.
 *
 * O valor vai no dicionário, e não em `shared.json`, apesar de ser dado: a
 * cidade leva o país escrito no idioma de quem lê, e "MG" não diz nada a quem
 * chegou em inglês. `key` existe para o `check:i18n` ligar os dois lados da
 * lista, como faz com projetos e formações.
 */
/**
 * Uma seção de texto do dossiê: um título e os parágrafos dela. Sem parágrafo, o
 * dossiê mostra o marcador de reservado: é um campo que existe e ainda não foi
 * escrito, e não pode ser preenchido com texto inventado.
 */
export interface SecaoDossie {
  key: string;
  titulo: string;
  paragrafos: string[];
}

export interface DadoPessoal {
  key: string;
  rotulo: string;
  valor: string;
}

/**
 * Um ponto da Trajetória: um trabalho de verdade, com o cargo, onde foi, o que
 * foi e com o quê.
 */
export interface Experiencia {
  key: string;
  /** o título da ficha */
  cargo: string;
  /** a empresa ou o projeto, sob o cargo */
  org: string;
  /** o endereço da empresa ou do projeto; com ele, o subtítulo vira link */
  url?: string;
  /** formato ano.mês: é o rótulo do nó na curva, e só lá */
  periodo: string;
  tipo: TipoExperiencia;
  /** o texto da ficha, um parágrafo contado como a bio */
  texto: string;
  /** até 5 são exibidos */
  stack: string[];
  /**
   * Casa com uma chave de LOGOS (assets.ts): a marca apagada no canto da ficha.
   * Ausente = ficha sem marca.
   */
  logo?: string;
}

export interface Dictionary {
  nav: Record<SectionKey, string>;
  /** o nome de cada tela no cabeçalho; `Record` total, então uma tela nova quebra o build */
  telas: Record<TelaKey, string>;
  hero: { nome: string; etiqueta: string; legenda: string };
  /**
   * O título da aba, com `{nome}` e `{parte}`.
   *
   * A parte é o nome da seção, ou o da tela quando o visitante está no Início,
   * que é onde não existe seção para nomear.
   */
  documento: string;
  /**
   * A bio e os fatos embaixo dela. `dados` são os fatos que ficaram no lugar do
   * carrossel de formação quando ela virou seção (ver `secoes.md`).
   */
  /**
   * O dossiê: a ficha ao lado do retrato (os `rotulos` de campos que vêm de
   * outros lugares, mais os `dados`) e as seções de texto embaixo dela.
   */
  sobre: {
    titulo: string;
    rotulos: { nome: string; ocupacao: string; formacao: string };
    /** o nome inteiro, no campo Nome da ficha; o do `hero` é o nome de uso */
    nomeCompleto: string;
    /** o marcador de campo que existe e ainda não tem valor */
    reservado: string;
    dados: DadoPessoal[];
    secoes: SecaoDossie[];
  };
  formacoes: {
    titulo: string;
    estados: Record<EstadoFormacao, string>;
    /**
     * Os rótulos do dado que cada estado produz, no pé do diploma: a data de
     * `concluido` e os períodos de `cursando`. O **valor** deles continua fora
     * do dicionário, como a versão no rodapé — "2022.12" e "4/8" são dados.
     */
    rotulos: { conclusao: string; periodos: string };
    lista: Formacao[];
  };
  /**
   * Os rótulos de Projetos. A lista não mora aqui: os projetos são
   * repositórios do GitHub, escolhidos em `shared.json → projetos`, e o que
   * aparece de cada um vem de lá (`src/data/`).
   */
  projetos: {
    titulo: string;
    intro: string;
    /** a seção sem nenhum repositório escolhido */
    vazio: string;
    codigo: string;
    aoVivo: string;
    /** a legenda do código de barras de commits, na janela de quem não tem site */
    atividade: string;
    arquivado: string;
    linguagens: string;
    /** o estado na legenda da janela: com site, e só com código */
    noAr: string;
    soCodigo: string;
    /** o botão da janela: troca a foto pelo site rodando, e volta */
    rodar: string;
    parar: string;
    rotulos: { commits: string; estrelas: string; forks: string; desde: string; atualizado: string };
  };
  /**
   * As três seções que leem dado remoto (`src/data/`).
   *
   * Elas não trazem lista nenhuma: o conteúdo vem do Spotify, da Steam e do
   * Letterboxd em tempo de execução. O que mora aqui são os **rótulos** e os
   * estados que a interface precisa nomear, que é justamente o que não pode ser
   * literal no componente.
   */
  musica: {
    titulo: string;
    intro: string;
    tocando: string;
    /** o estado mais comum: não há nada tocando */
    silencio: string;
    faixas: string;
    artistas: string;
    recentes: string;
  };
  jogos: {
    titulo: string;
    intro: string;
    jogando: string;
    ultimo: string;
    recentes: string;
    /** sufixo de hora, colado no número */
    horas: string;
    duasSemanas: string;
    total: string;
    /** os dois passos do deque */
    anterior: string;
    proximo: string;
  };
  filmes: {
    titulo: string;
    intro: string;
    /** o rótulo da lista escolhida a dedo; sem lista configurada, o bloco some */
    favoritos: string;
    recentes: string;
    /**
     * A posição na lista de favoritos, com `{n}`.
     *
     * O número aparece desenhado num selo, e é só um número: quem usa leitor de
     * tela precisa da frase em volta dele para saber que "03" é um lugar numa
     * lista, e não um ano ou uma nota.
     */
    posicao: string;
    semNota: string;
    revisita: string;
  };
  /**
   * Os três estados de qualquer busca remota, num lugar só.
   *
   * Eles não são de nenhuma das seções em particular, e repeti-los em três
   * blocos seria três lugares para traduzir a mesma frase.
   */
  remoto: {
    carregando: string;
    erro: string;
    vazio: string;
  };
  /** a seção GitHub, na Trajetória (ver `secoes.md`) */
  github: {
    titulo: string;
    intro: string;
    /** o rótulo do número grande */
    commits: string;
    rotulos: {
      contribuicoes: string;
      diasAtivos: string;
      maiorSequencia: string;
      pico: string;
      repositorios: string;
      desde: string;
    };
    /** aceita `{n}` */
    dias: string;
    /** a legenda do céu, e as duas pontas da escala de brilho */
    ano: string;
    menos: string;
    mais: string;
    /** o rótulo de um dia apontado; aceita `{data}` e `{n}` */
    dia: string;
    /** o resumo do céu para quem não o vê; aceita `{n}` e `{dias}` */
    ceuA11y: string;
    linguagens: string;
    /** aceita `{n}` */
    doCodigo: string;
    /** o cabeçalho da legenda sem nada em foco; `quantas` aceita `{n}` */
    quantas: string;
    aponte: string;
  };
  experiencia: {
    titulo: string;
    intro: string;
    /** `Record` total: uma categoria nova quebra o build até ter nome nos dois idiomas */
    tipos: Record<TipoExperiencia, string>;
    /** o rótulo do crachá e a palavra antes do período, na ficha */
    cracha: { desde: string };
    janela: { anterior: string; posterior: string };
    lista: Experiencia[];
  };
  contato: {
    titulo: string;
    email: string;
    copiar: string;
    copiado: string;
    /** a legenda do ponto que pulsa ao lado do envio */
    sinal: string;
    enviar: string;
    enviando: string;
    erro: string;
    /** aceita `{nome}` */
    assunto: string;
    assuntoSemNome: string;
    /** aceita `{nome}` */
    assinatura: string;
    campos: {
      /**
       * A frase que o nome completa: "Oi, Lucas. Aqui é ___." O campo mora no
       * meio dela, então são duas metades, e a ordem das palavras é do idioma.
       */
      frase: { antes: string; depois: string };
      /** `rotulo` é o nome acessível do campo, que não tem rótulo à vista */
      nome: { rotulo: string; dica: string };
      mensagem: { rotulo: string; dica: string };
    };
  };
  /** o menu do canto superior direito (ver `hud/Opcoes`) */
  opcoes: {
    /** o nome acessível do gatilho */
    abrir: string;
    idioma: string;
    qualidade: string;
    /** o nome acessível da régua */
    regua: string;
    /** as duas pontas da régua */
    desempenho: string;
    detalhe: string;
    auto: string;
    autoDica: string;
    ideal: string;
    limite: string;
    /** o valor da régua lido em voz alta, acima do limite; aceita `{n}` */
    acima: string;
    /** no lugar da legenda, enquanto o motor ainda não fechou a média */
    medindo: string;
    /** o aviso que segura a régua no limite recomendado, e o botão que a solta */
    aviso: string;
    passar: string;
    versao: string;
  };
  a11y: {
    secoes: string;
    /** o nome acessível da foto do site; aceita `{nome}` */
    previa: string;
    canais: string;
    retrato: string;
    /** o canal que ainda não tem endereço; aceita `{rede}` */
    emBreve: string;
    /** aceita `{rede}` — o nome do serviço vem de `perfis`, não do dicionário */
    perfil: string;
  };
}

/**
 * O perfil de onde vem o dado de uma seção.
 *
 * O nome do serviço é **marca**, não texto: fica em `shared.json` e não nos
 * dicionários, como o `rotulo` dos canais de contato. Quem traduz é a frase em
 * volta dele (`a11y.perfil`).
 */
export interface Perfil {
  /** casa com uma chave de ICONES (assets.ts) */
  icone: string;
  rotulo: string;
  url: string;
}

export interface Canal {
  key: string;
  /** casa com uma chave de ICONES (assets.ts) */
  icone: string;
  rotulo: string;
  identificador: string;
  /** vazio = ícone apagado no rodapé, sem link (ver `hud/Canais`) */
  url: string;
}

export interface Secao {
  key: SectionKey;
}

/**
 * Uma tela e as seções dela, na ordem em que aparecem, de cima para baixo. A
 * primeira é a que abre quando o endereço não pede nenhuma.
 */
export interface Tela {
  key: TelaKey;
  partes: SectionKey[];
}

export interface Shared {
  secoes: Secao[];
  telas: Tela[];
  /** só as seções que leem dado de fora têm perfil; as outras não têm de onde */
  perfis: Partial<Record<SectionKey, Perfil>>;
  /**
   * Os repositórios da seção Projetos, como `dono/nome`, na ordem em que giram.
   * Vazia, a seção diz que nada foi selecionado ainda e não busca nada.
   */
  projetos: string[];
  canais: Canal[];
  logos: Record<string, { escala: number }>;
}
