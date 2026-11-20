"use client";

import { useId, useRef, useState, type ChangeEvent } from "react";

import { Avatar } from "@/components/layout/Avatar";
import { BaseButton } from "@/components/shared/BaseButton";
import { ImageLightbox, type LightboxImage } from "@/components/shared/ImageLightbox";
import { ACCEPTED_IMAGES, imageFileError } from "@/lib/upload";

export interface ProfileStats {
  boards: number;
  admin: number;
  openTasks: number;
}

export interface ProfileHeroProps {
  id: string;
  name: string;
  email: string;
  stats: ProfileStats | null;
  avatarUrl?: string | null;
  /** Upload a new photo; resolves once the user is updated. */
  onUpload?: (file: File) => Promise<void>;
  onRemove?: () => Promise<void>;
  onInvalidFile?: (message: string) => void;
}

/**
 * Profile hero (R36.8, R36.9, R41): reflects the name being typed in the form, and lets the user
 * change their photo. Clicking a photo opens it full size in a protected lightbox.
 */
export function ProfileHero({ id, name, email, stats, avatarUrl, onUpload, onRemove, onInvalidFile }: ProfileHeroProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"upload" | "remove" | null>(null);
  const [viewing, setViewing] = useState<LightboxImage | null>(null);
  const chips = [
    { label: "Boards", value: stats?.boards },
    { label: "Admin of", value: stats?.admin },
    { label: "Open tasks", value: stats?.openTasks },
  ];

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";   // choosing the same file again still fires change
    if (!file || !onUpload) return;
    const problem = imageFileError(file);
    if (problem) {
      onInvalidFile?.(problem);
      return;
    }
    setBusy("upload");
    try {
      await onUpload(file);
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!onRemove) return;
    setBusy("remove");
    try {
      await onRemove();
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-label="Profile summary" className="glass-pane enter flex flex-col gap-5 rounded-pane p-6 sm:flex-row sm:items-center md:p-8">
      <div className="grid justify-items-start gap-2 self-start sm:justify-items-center sm:self-center">
        {avatarUrl ? (
          <button
            type="button"
            onClick={() => setViewing({ src: avatarUrl, alt: `${name || "Your"} profile photo`, caption: name })}
            className="avatar-button rounded-pill"
            aria-label="View your profile photo"
            aria-busy={busy === "upload" || undefined}
          >
            <Avatar id={id} name={name || "?"} src={avatarUrl} size="xl" ring />
          </button>
        ) : (
          <label htmlFor={inputId} className="avatar-button cursor-pointer rounded-pill" aria-busy={busy === "upload" || undefined}>
            <span className="visually-hidden">Add a profile photo</span>
            <Avatar id={id} name={name || "?"} size="xl" ring />
          </label>
        )}
        {onUpload && (
          <div className="flex flex-wrap gap-1.5">
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept={ACCEPTED_IMAGES}
              onChange={(e) => void choose(e)}
              className="visually-hidden"
              tabIndex={-1}
              data-testid="avatar-input"
            />
            <BaseButton size="sm" variant="secondary" loading={busy === "upload"} loadingLabel="Uploading…" onClick={() => inputRef.current?.click()}>
              {avatarUrl ? "Change photo" : "Add photo"}
            </BaseButton>
            {avatarUrl && onRemove && (
              <BaseButton size="sm" variant="ghost" loading={busy === "remove"} loadingLabel="Removing…" onClick={() => void remove()}>
                Remove
              </BaseButton>
            )}
          </div>
        )}
      </div>
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
        <p className="mt-3 text-xs text-muted">Photos are converted to AVIF; the original file is not kept.</p>
      </div>
      <ImageLightbox image={viewing} onClose={() => setViewing(null)} />
    </section>
  );
}
