/**
 * The start column of the auth pages from 1024 px: one display line and a CSS-only board where a
 * glass pebble glides from To do to Done once. This is the only unprompted motion in the product.
 */
export function AuthShowcase() {
  const columns = ["To do", "Doing", "Done"];
  return (
    <section aria-hidden="true" className="hidden lg:block">
      <h2 className="max-w-[16ch] text-[clamp(2.5rem,1.6rem+2.6vw,4.5rem)] leading-[1.02] tracking-[-0.01em]">
        Move work forward, one card at a time.
      </h2>
      <p className="mt-5 max-w-[46ch] text-lg text-muted">
        Plan boards with your team, drag cards as work progresses, and keep every decision in the card where it happened.
      </p>
      <div className="mt-12 grid max-w-[34rem] grid-cols-3 gap-3">
        {columns.map((name, i) => (
          <div key={name} className="glass-pane rounded-pane p-3">
            <p className="mb-3 text-sm font-semibold">{name}</p>
            <div className="grid gap-2">
              <div className="glass-pebble h-10 rounded-pebble opacity-60" />
              {i === 2 && (
                <div className="glass-pebble pebble-glide flex h-14 items-center rounded-pebble px-3 text-sm font-medium ring-1 ring-seaglass">
                  Ship the brief
                </div>
              )}
              {i < 2 && <div className="glass-pebble h-14 rounded-pebble opacity-30" />}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
