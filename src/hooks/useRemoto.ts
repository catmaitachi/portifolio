import { useEffect, useState } from 'react';

/**
 * Os três estados de uma busca, e nada além deles.
 *
 * `dados` só existe em `pronto`, e o tipo obriga quem desenha a tratar os outros
 * dois. Uma seção que lê dado de fora tem sempre três telas, e a que mais
 * aparece não é a bonita: é a de espera, na primeira vez que alguém abre.
 */
export type Remoto<T> =
  | { estado: 'carregando'; dados: null }
  | { estado: 'pronto'; dados: T }
  | { estado: 'erro'; dados: null };

/**
 * Busca um JSON de `api/` enquanto a seção está na tela.
 *
 * **Nada é buscado antes de a seção ficar ativa.** Quem nunca abre Música não
 * paga requisição nenhuma, e a primeira pintura da página continua intocada — é
 * a mesma decisão do `import()` do motor de cena. Sair da seção aborta o que
 * estiver em voo.
 *
 * **A repetição só corre com a aba visível.** Um `setInterval` continua andando
 * numa aba escondida, e ficaria gastando requisição para atualizar o que
 * ninguém está vendo. É a mesma razão pela qual a recarga da supernova vive no
 * relógio do motor e não em `setTimeout`. A volta para a aba dispara uma busca
 * na hora, senão o visitante veria por alguns segundos o que era verdade antes
 * de ele sair.
 *
 * **Erro não apaga o que já estava certo.** Uma falha de rede no meio de uma
 * repetição mantém os dados anteriores na tela: o que estava tocando há trinta
 * segundos é uma resposta melhor do que uma seção vazia.
 *
 * O cancelamento é por `AbortController`, como no `SpaceCanvas`, e pela mesma
 * razão: o efeito precisa cobrir o caso de a seção sair enquanto a resposta
 * ainda vem.
 */
export function useRemoto<T>(caminho: string, ativo: boolean, intervalo = 0): Remoto<T> {
  const [remoto, setRemoto] = useState<Remoto<T>>({ estado: 'carregando', dados: null });

  useEffect(() => {
    if (!ativo) return;

    const controle = new AbortController();
    let timer = 0;

    const agendar = () => {
      if (intervalo > 0 && !controle.signal.aborted) {
        timer = window.setTimeout(ciclo, intervalo);
      }
    };

    const ciclo = async () => {
      // aba escondida: não busca, só continua contando
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        agendar();
        return;
      }
      try {
        const resposta = await fetch(caminho, { signal: controle.signal });
        if (!resposta.ok) throw new Error(String(resposta.status));
        const dados = (await resposta.json()) as T;
        /**
         * A checagem depois do `await` não é redundante com o `abort()`.
         *
         * Abortar rejeita o `fetch`, mas o corpo já pode ter chegado inteiro
         * enquanto a seção saía de cena: aí a leitura termina normalmente e o que
         * se escreveria seria o resultado de um efeito que já foi desfeito. É a
         * mesma razão pela qual a guarda do `SpaceCanvas` fica **depois** do
         * `await`, e não antes.
         */
        if (!controle.signal.aborted) setRemoto({ estado: 'pronto', dados });
      } catch {
        if (!controle.signal.aborted) {
          setRemoto((atual) =>
            atual.estado === 'pronto' ? atual : { estado: 'erro', dados: null },
          );
        }
      }
      agendar();
    };

    const aoVoltar = () => {
      if (document.visibilityState !== 'visible') return;
      clearTimeout(timer);
      void ciclo();
    };

    void ciclo();
    document.addEventListener('visibilitychange', aoVoltar);

    return () => {
      controle.abort();
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', aoVoltar);
    };
  }, [caminho, ativo, intervalo]);

  return remoto;
}
