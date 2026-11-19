"use client";

import Link from "next/link";

import { BaseButton } from "@/components/shared/BaseButton";

/** Shown when a signed-in page cannot load (network or server problem). */
export default function AppError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <section className="glass-pane enter mx-auto mt-16 grid max-w-xl justify-items-start gap-4 rounded-pane p-8">
      <h1 className="text-2xl">This page couldn&apos;t load</h1>
      <p className="text-muted">Check your connection and try again. If it keeps happening, go back to your boards.</p>
      <div className="flex gap-2">
        <BaseButton onClick={() => retry()}>Try again</BaseButton>
        <Link href="/" className="lift glass-pebble inline-flex min-h-11 items-center rounded-pill px-4 font-medium text-foam">Back to your boards</Link>
      </div>
    </section>
  );
}
