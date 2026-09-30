/**
 * "há 9 horas", no idioma da página. O `Intl` escreve a frase inteira, então não
 * há texto de dicionário para ela: a ordem das palavras é do idioma. Música e o
 * LoL de Jogos usam.
 */
export function haQuanto(iso: string, lang: string): string {
  const horas = (Date.now() - new Date(iso).getTime()) / 36e5;
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
  if (horas < 1) return rtf.format(-Math.max(1, Math.round(horas * 60)), 'minute');
  if (horas < 24) return rtf.format(-Math.round(horas), 'hour');
  const dias = horas / 24;
  // o LoL pode ficar meses sem partida: "há 4 meses" lê melhor que "há 120 dias"
  if (dias < 30) return rtf.format(-Math.round(dias), 'day');
  if (dias < 365) return rtf.format(-Math.round(dias / 30.44), 'month');
  return rtf.format(-Math.round(dias / 365.25), 'year');
}
