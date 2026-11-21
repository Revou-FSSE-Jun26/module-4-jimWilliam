"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent, type DragEvent } from "react";

import { BaseButton } from "@/components/shared/BaseButton";
import { ImageLightbox, type LightboxImage } from "@/components/shared/ImageLightbox";
import { ProtectedImage } from "@/components/shared/ProtectedImage";
import { useAuth } from "@/context/AuthContext";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { apiClient } from "@/lib/apiClient";
import { notify } from "@/lib/toast";
import type { Attachment, Role } from "@/lib/types";
import { ACCEPTED_IMAGES, formatBytes, imageFileError, uploadImage } from "@/lib/upload";

export const MAX_ATTACHMENTS = 10;

export interface ImageGalleryProps {
  /** GET lists the images; POST uploads one (multipart field `file`). */
  path: string;
  max: number;
  heading: string;
  /** What one owner is called in the limit message, e.g. "card" or "board". */
  owner: string;
  role: Role;
  onCountChange?: (count: number) => void;
}

export interface CardAttachmentsProps {
  cardId: string;
  role: Role;
  onCountChange?: (count: number) => void;
}

/** Image attachments on a card (R42). */
export function CardAttachments({ cardId, role, onCountChange }: CardAttachmentsProps) {
  return <ImageGallery path={`/api/cards/${cardId}/attachments`} max={MAX_ATTACHMENTS} heading="Images" owner="card" role={role} onCountChange={onCountChange} />;
}

/**
 * An image gallery for a card or a board (R42, R47). Images are converted to AVIF by the API;
 * thumbnails open a protected full-size view. The uploader or a board admin can remove an image.
 */
export function ImageGallery({ path, max, heading, owner, role, onCountChange }: ImageGalleryProps) {
  const { token, user } = useAuth();
  const handleError = useErrorHandler();
  const headingId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Attachment[] | null>(null);
  const [uploading, setUploading] = useState(0);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<LightboxImage | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiClient<Attachment[]>(path, { token })
      .then((list) => !cancelled && setItems(list))
      .catch((err) => !cancelled && handleError(err));
    return () => {
      cancelled = true;
    };
  }, [path, token, handleError]);

  function update(next: Attachment[]) {
    setItems(next);
    onCountChange?.(next.length);
  }

  async function upload(files: File[]) {
    let list = items ?? [];
    const room = max - list.length;
    if (files.length > room) notify.error(`A ${owner} can have at most ${max} images.`);
    for (const file of files.slice(0, Math.max(0, room))) {
      const problem = imageFileError(file);
      if (problem) {
        notify.error(`${file.name}: ${problem}`);
        continue;
      }
      setUploading((n) => n + 1);
      try {
        const created = await uploadImage<Attachment>(path, file, token);
        list = [...list, created];
        update(list);
      } catch (err) {
        handleError(err);
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  function choose(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    void upload(files);
  }

  function drop(event: DragEvent<HTMLElement>) {
    const files = Array.from(event.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    setDragOver(false);
    if (!files.length) return;
    event.preventDefault();
    void upload(files);
  }

  async function remove(item: Attachment) {
    try {
      await apiClient(`/api/attachments/${item.id}`, { method: "DELETE", token });
      update((items ?? []).filter((a) => a.id !== item.id));
      setConfirmId(null);
      notify.success("Image removed");
    } catch (err) {
      handleError(err);
    }
  }

  const count = items?.length ?? 0;
  const full = count >= max;

  return (
    <section
      aria-labelledby={headingId}
      aria-busy={uploading > 0 || items === null || undefined}
      className={`attachments mt-6 rounded-pebble ${dragOver ? "is-drop-target" : ""}`}
      onDragOver={(e) => {
        if (!Array.from(e.dataTransfer.types).includes("Files")) return;
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={drop}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 id={headingId} className="text-base font-semibold">
          {heading} <span className="text-sm font-normal text-muted tabular-nums">{items ? `${count} of ${max}` : ""}</span>
        </h3>
        <input ref={inputRef} type="file" accept={ACCEPTED_IMAGES} multiple onChange={choose} className="visually-hidden" tabIndex={-1} aria-hidden="true" data-testid="attachment-input" />
        <BaseButton
          size="sm"
          variant="secondary"
          className="ms-auto"
          loading={uploading > 0}
          loadingLabel="Uploading…"
          disabled={full || items === null}
          onClick={() => inputRef.current?.click()}
        >
          Add image
        </BaseButton>
      </div>

      {items && items.length === 0 && (
        <p className="mt-2 text-sm text-muted">No images yet. Add one, or drop image files here. They are stored as AVIF.</p>
      )}

      {items && items.length > 0 && (
        <ul className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-2.5" data-testid="attachment-list">
          {items.map((item) => {
            const canRemove = role === "admin" || item.uploaded_by?.id === user?.id;
            return (
              <li key={item.id} className="group/reveal enter relative">
                <button
                  type="button"
                  onClick={() => setViewing({ src: item.url, alt: item.filename, caption: `${item.filename} · ${item.width}×${item.height} · ${formatBytes(item.byte_size)}`, width: item.width, height: item.height })}
                  className="attachment-thumb block aspect-square w-full overflow-hidden rounded-pebble"
                  aria-label={`View ${item.filename}`}
                >
                  <ProtectedImage src={item.thumb_url} alt="" className="size-full" imgClassName="size-full object-cover" />
                </button>
                {canRemove && (
                  confirmId === item.id ? (
                    <span className="absolute inset-x-1 bottom-1 flex gap-1">
                      <button type="button" autoFocus onClick={() => void remove(item)} className="attachment-action bg-danger text-on-danger">Remove</button>
                      <button type="button" onClick={() => setConfirmId(null)} className="attachment-action">Keep</button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmId(item.id)}
                      aria-label={`Remove ${item.filename}`}
                      className="reveal-on-hover attachment-remove"
                    >
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                    </button>
                  )
                )}
              </li>
            );
          })}
        </ul>
      )}
      <ImageLightbox image={viewing} onClose={() => setViewing(null)} />
    </section>
  );
}
