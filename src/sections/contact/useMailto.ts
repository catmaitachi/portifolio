import { useCallback, useEffect, useRef, useState } from 'react';
import { format, type Dictionary } from '~/content';

/** Quanto tempo a mensagem de estado fica na tela, em ms. */
const DURACAO_STATUS = 3600;

export interface MailtoForm {
  nome: string;
  mensagem: string;
  status: string;
  setNome: (v: string) => void;
  setMensagem: (v: string) => void;
  enviar: () => void;
}

/**
 * Envio por `mailto:` — sem back-end.
 *
 * Monta assunto e corpo a partir do dicionário e abre o cliente de e-mail do
 * visitante. Assunto e assinatura vêm de textos com marcador `{nome}`, não de
 * concatenação: a ordem das palavras é do idioma, não do código.
 *
 * O nome é opcional; só a mensagem é obrigatória — um formulário que exige nome
 * para receber uma linha de texto perde a linha.
 */
export function useMailto(t: Dictionary): MailtoForm {
  const [nome, setNome] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [status, setStatus] = useState('');
  const tempoRef = useRef<number | undefined>(undefined);

  // um status pendente não pode disparar setState depois da desmontagem
  useEffect(() => () => window.clearTimeout(tempoRef.current), []);

  const mostrarStatus = useCallback((texto: string) => {
    setStatus(texto);
    window.clearTimeout(tempoRef.current);
    tempoRef.current = window.setTimeout(() => setStatus(''), DURACAO_STATUS);
  }, []);

  const enviar = useCallback(() => {
    const n = nome.trim();
    const m = mensagem.trim();
    if (!m) {
      mostrarStatus(t.contato.erro);
      return;
    }
    const assunto = n ? format(t.contato.assunto, { nome: n }) : t.contato.assuntoSemNome;
    const corpo = n ? `${m}\n\n${format(t.contato.assinatura, { nome: n })}` : m;
    mostrarStatus(t.contato.enviando);
    window.location.href = `mailto:${t.contato.email}?subject=${encodeURIComponent(
      assunto,
    )}&body=${encodeURIComponent(corpo)}`;
  }, [nome, mensagem, t, mostrarStatus]);

  return { nome, mensagem, status, setNome, setMensagem, enviar };
}
