import { Avatar } from "@/components/layout/Avatar";

export interface ProfileStats {
  boards: number;
  admin: number;
  openTasks: number;
}

/** Profile hero (R36.8, R36.9): reflects the name being typed in the form. */
export function ProfileHero({ id, name, email, stats }: { id: string; name: string; email: string; stats: ProfileStats | null }) {
  const chips = [
    { label: "Boards", value: stats?.boards },
    { label: "Admin of", value: stats?.admin },
    { label: "Open tasks", value: stats?.openTasks },
  ];
  return (
    <section aria-label="Profile summary" className="glass-pane enter flex flex-col gap-5 rounded-pane p-6 sm:flex-row sm:items-center md:p-8">
      <span className="self-start sm:self-center"><Avatar id={id} name={name || "?"} size="xl" ring /></span>
      {/* Stretches to the pane on mobile so long emails truncate instead of overflowing. */}
      <div className="w-full min-w-0 flex-1">
        <p className="font-display text-3xl font-semibold leading-tight [overflow-wrap:anywhere]" data-testid="hero-name">{name || "Your name"}</p>
        <p className="mt-1 truncate text-muted">{email}</p>
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Your activity">
          {chips.map((chip) => (
            <li key={chip.label} className="glass-pebble rounded-pill px-3 py-1.5 text-sm">
              <span className="font-semibold tabular-nums">{chip.value ?? "–"}</span> <span className="text-muted">{chip.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
