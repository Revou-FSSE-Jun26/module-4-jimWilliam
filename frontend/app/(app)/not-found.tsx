import Link from "next/link";

/** Unknown board, or a board you are not a member of: the page does not reveal which. */
export default function NotFound() {
  return (
    <section className="glass-pane enter mx-auto mt-16 grid max-w-xl justify-items-start gap-4 rounded-pane p-8">
      <h1 className="text-2xl">Board not available</h1>
      <p className="text-muted">This board doesn&apos;t exist, or you aren&apos;t a member of it. Ask a board admin to add you, or go back to your boards.</p>
      <Link href="/" className="lift inline-flex min-h-11 items-center rounded-pill bg-seaglass px-4 font-semibold text-on-seaglass">Back to your boards</Link>
    </section>
  );
}
