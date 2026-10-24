/** A one-off burst of confetti over its (relatively positioned) parent. Decorative only. */
export function Confetti() {
  return (
    <span aria-hidden className="confetti">
      {Array.from({ length: 14 }, (_, i) => <span key={i} />)}
    </span>
  );
}
