/**
 * O que toda seção recebe, e nada além disso.
 *
 * Uma seção não sabe em que tela mora, qual é a sua vizinha nem por onde o
 * visitante chegou. Sabe duas coisas, e cada uma tem motivo:
 *
 * - **`ativo`** é o que dispara a entrada dela e o que desliga o que não se vê.
 *   Numa pilha ele vem da rolagem (a seção está à vista), numa tela de abas vem
 *   da aba aberta;
 * - **`indice`** é o número do marcador, e vem por prop porque é a posição dela
 *   na tela, não um texto do dicionário.
 */
export interface SectionProps {
  ativo: boolean;
  indice: string;
}
