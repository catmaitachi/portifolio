/** Formas geométricas animadas do fundo, compartilhadas pelas duas telas. */
export function Backdrop() {
  return (
    <div className="backdrop" aria-hidden="true">
      <div className="backdrop__circle" />
      <div className="backdrop__square" />
      <div className="backdrop__triangle" />
      <div className="backdrop__diamond" />
      <div className="backdrop__dashed" />
      <div className="backdrop__dot" />
      <div className="backdrop__line" />
    </div>
  );
}
