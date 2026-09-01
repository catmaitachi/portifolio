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

export type SectionKey = 'inicio' | 'sobre' | 'projetos' | 'experiencia' | 'contato';

export type EstadoFormacao = 'concluido' | 'cursando' | 'pretensao';
export type EstadoProjeto = 'ativo' | 'arquivado' | 'definir';

/** Etapas cumpridas de um total — a fração que preenche a barra de `cursando`. */
export interface ProgressoFormacao {
  feito: number;
  total: number;
}

export interface Formacao {
  /** casa com uma chave de LOGOS (assets.ts) e de `logos` (shared.json) */
  slot: string;
  instituicao: string;
  nivel: string;
  curso: string;
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

export interface Projeto {
  key: string;
  nome: string;
  /** uma linha de resumo, sob o nome do cartão */
  linha: string;
  /** texto do painel que cobre o cartão quando aberto */
  descricao: string;
  ano: string;
  papel: string;
  stack: string[];
  estado: EstadoProjeto;
  /** vazio = sem link "ver ao vivo" */
  url?: string;
  /**
   * Casa com uma chave de BANNERS (assets.ts) — é chave, não caminho: JSON não
   * importa arquivo, e o Vite precisa do `import` para versionar o asset.
   * Ausente = a moldura de espaço reservado.
   */
  banner?: string;
}

export interface Experiencia {
  key: string;
  cargo: string;
  org: string;
  /** formato ano.mês — é rótulo, não posição na curva */
  periodo: string;
  /** casa com uma chave de `experiencia.tipos` */
  tipo: string;
  /** até 3 são exibidos (slots fixos 01/02/03) */
  bullets: string[];
  /** até 4 são exibidos */
  stack: string[];
}

export interface Dictionary {
  nav: Record<SectionKey, string>;
  hero: { etiqueta: string; nome: string; legenda: string };
  sobre: { indice: string; titulo: string; paragrafos: string[] };
  formacoes: {
    titulo: string;
    estados: Record<EstadoFormacao, string>;
    lista: Formacao[];
  };
  projetos: {
    indice: string;
    titulo: string;
    intro: string;
    banner: string;
    aoVivo: string;
    estados: Record<EstadoProjeto, string>;
    lista: Projeto[];
  };
  experiencia: {
    indice: string;
    titulo: string;
    intro: string;
    tipos: Record<string, string>;
    janela: { anterior: string; posterior: string };
    lista: Experiencia[];
  };
  contato: {
    indice: string;
    titulo: string;
    intro: string;
    email: string;
    ou: string;
    enviar: string;
    enviando: string;
    erro: string;
    emBreve: string;
    /** aceita `{nome}` */
    assunto: string;
    assuntoSemNome: string;
    /** aceita `{nome}` */
    assinatura: string;
    campos: {
      nome: { rotulo: string; dica: string };
      mensagem: { rotulo: string; dica: string };
    };
  };
  credito: string;
  /**
   * Textos das notificações do HUD (`hud/Notice.tsx`). `fechar` é o rótulo de
   * acessibilidade do botão e vale para qualquer aviso; cada aviso entra como um
   * bloco com `titulo` e `texto`.
   */
  aviso: {
    fechar: string;
    nova: { titulo: string; texto: string };
  };
  a11y: {
    secoes: string;
    idioma: string;
    projetos: string;
    experiencia: string;
    canais: string;
    retrato: string;
  };
}

export interface Canal {
  key: string;
  /** casa com uma chave de ICONES (assets.ts) */
  icone: string;
  rotulo: string;
  identificador: string;
  /** vazio = cartão tracejado, apagado e fora da navegação */
  url: string;
}

export interface Secao {
  key: SectionKey;
}

export interface Shared {
  secoes: Secao[];
  canais: Canal[];
  logos: Record<string, { escala: number }>;
}
