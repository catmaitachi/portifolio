import type { ModoKey } from '~/content';

/**
 * O que toda seção recebe, e nada além disso.
 *
 * Uma seção não sabe qual é a sua vizinha, quantas existem, nem por onde o
 * visitante chegou. Sabe três coisas, e cada uma tem motivo:
 *
 * - **`ativo`** é o que dispara a entrada dela e o que desliga o que não se vê;
 * - **`indice`** é o número do marcador, e vem por prop porque a ordem deixou de
 *   ser fixa: ele é a posição na lista do modo em vigor, não um texto do
 *   dicionário. Escrito lá, o lado pessoal leria 02, 05, 03;
 * - **`modo`** existe porque duas seções mudam de conteúdo com ele (o Início
 *   troca de etiqueta e legenda, o Contato troca de canais) e porque manter a
 *   assinatura igual para todas é o que permite ao `App` montá-las por tabela.
 */
export interface SectionProps {
  ativo: boolean;
  indice: string;
  modo: ModoKey;
}
