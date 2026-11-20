import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import fc from "fast-check";

import { CardAttachments } from "@/components/CardAttachments";
import { CardDetailModal } from "@/components/CardDetailModal";
import { Avatar } from "@/components/layout/Avatar";
import { NavTree } from "@/components/layout/NavTree";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { ProtectedImage } from "@/components/shared/ProtectedImage";
import { normaliseLink } from "@/components/shared/RichTextEditor";
import type { Attachment, Card } from "@/lib/types";
import { MAX_UPLOAD_BYTES, imageFileError } from "@/lib/upload";

import { ANA, mockApi, renderWithProviders } from "./test-utils";

const SIGNED = "/api/media/99999999-9999-4999-8999-999999999999?v=full&exp=1&sig=abc";
const CARD_ID = "33333333-3333-4333-8333-333333333333";
const OMAR = { id: "55555555-5555-4555-8555-555555555555", name: "Omar", avatar_url: null };

function attachment(id: string, by = { id: ANA.id, name: ANA.name, avatar_url: null }): Attachment {
  return {
    id, card_id: CARD_ID, filename: `${id}.avif`, content_type: "image/avif", width: 800, height: 600, byte_size: 12345,
    uploaded_by: by, url: `/api/media/${id}?v=full&exp=1&sig=a`, thumb_url: `/api/media/${id}?v=thumb&exp=1&sig=b`, created_at: "2026-11-20T10:00:00Z",
  };
}

const png = (name = "photo.png", size = 10) => new File([new Uint8Array(size)], name, { type: "image/png" });

describe("ProtectedImage (R43.4)", () => {
  it("blocks the context menu and dragging, and never lets the <img> be dragged", () => {
    const { container } = render(<ProtectedImage src={SIGNED} alt="Board photo" />);
    const img = screen.getByAltText("Board photo");
    expect(img).toHaveAttribute("draggable", "false");
    expect(img.getAttribute("src")).toContain("/api/media/");
    const wrapper = container.querySelector(".protected-media")!;
    expect(fireEvent.contextMenu(img)).toBe(false);          // default prevented
    expect(fireEvent.contextMenu(wrapper.querySelector(".protected-shield")!)).toBe(false);
    expect(fireEvent.dragStart(img)).toBe(false);
  });
});

describe("Avatar with a photo (R41)", () => {
  it("shows the photo, and falls back to initials when the link fails", () => {
    const { container } = render(<Avatar id={ANA.id} name="Ana Novak" src={SIGNED} />);
    const img = container.querySelector("img")!;
    expect(img).toBeInTheDocument();
    expect(screen.queryByText("AN")).not.toBeInTheDocument();
    fireEvent.error(img);
    expect(screen.getByText("AN")).toBeInTheDocument();
  });

  it("shows initials when there is no photo", () => {
    render(<Avatar id={ANA.id} name="Ana Novak" src={null} />);
    expect(screen.getByText("AN")).toBeInTheDocument();
  });
});

describe("Navigation", () => {
  it("has no Profile link in the main navigation; the profile capsule is the way in", () => {
    renderWithProviders(<NavTree boards={[]} shell="sb" />);
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).queryByRole("link", { name: /profile/i })).not.toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: /my tasks/i })).toBeInTheDocument();
  });
});

describe("ProfileHero photo (R41)", () => {
  it("uploads a chosen image and rejects files that are not images", async () => {
    const onUpload = jest.fn(async () => undefined);
    const onInvalidFile = jest.fn();
    render(<ProfileHero id={ANA.id} name="Ana Novak" email={ANA.email} stats={null} onUpload={onUpload} onInvalidFile={onInvalidFile} />);
    const input = screen.getByTestId("avatar-input") as HTMLInputElement;
    await userEvent.upload(input, png());
    await waitFor(() => expect(onUpload).toHaveBeenCalledTimes(1));
    fireEvent.change(input, { target: { files: [new File(["<svg/>"], "x.svg", { type: "image/svg+xml" })] } });
    expect(onInvalidFile).toHaveBeenCalledWith(expect.stringContaining("Choose an image file"));
    expect(onUpload).toHaveBeenCalledTimes(1);
  });

  it("opens the photo full size in a protected lightbox", async () => {
    render(<ProfileHero id={ANA.id} name="Ana Novak" email={ANA.email} stats={null} avatarUrl={SIGNED} onUpload={jest.fn()} onRemove={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Change photo" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "View your profile photo" }));
    const lightbox = document.querySelector("dialog.lightbox")!;
    expect(lightbox).toHaveAttribute("open");
    const img = within(lightbox as HTMLElement).getByAltText("Ana Novak profile photo");
    expect(fireEvent.contextMenu(img)).toBe(false);
    await userEvent.click(within(lightbox as HTMLElement).getByRole("button", { name: "Close image" }));
    expect(lightbox).not.toHaveAttribute("open");
  });
});

describe("CardAttachments (R42)", () => {
  it("lists images, uploads as multipart form data and reports the count", async () => {
    const calls = mockApi({
      [`GET /api/cards/${CARD_ID}/attachments`]: [attachment("a1")],
      [`POST /api/cards/${CARD_ID}/attachments`]: attachment("a2"),
    });
    const onCountChange = jest.fn();
    renderWithProviders(<CardAttachments cardId={CARD_ID} role="member" onCountChange={onCountChange} />);
    expect(await screen.findByRole("button", { name: "View a1.avif" })).toBeInTheDocument();
    await userEvent.upload(screen.getByTestId("attachment-input"), png("new.png"));
    expect(await screen.findByRole("button", { name: "View a2.avif" })).toBeInTheDocument();
    const post = calls.find((c) => c.method === "POST")!;
    expect(post.body).toBeInstanceOf(FormData);
    expect((post.body as FormData).get("file")).toBeInstanceOf(File);
    expect(onCountChange).toHaveBeenLastCalledWith(2);
  });

  it("lets members remove only their own images, and admins remove any", async () => {
    mockApi({
      [`GET /api/cards/${CARD_ID}/attachments`]: [attachment("mine"), attachment("theirs", OMAR)],
      "DELETE /api/attachments/theirs": { id: "theirs" },
    });
    const { unmount } = renderWithProviders(<CardAttachments cardId={CARD_ID} role="member" />);
    await screen.findByRole("button", { name: "View theirs.avif" });
    expect(screen.getByRole("button", { name: "Remove mine.avif" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove theirs.avif" })).not.toBeInTheDocument();
    unmount();

    renderWithProviders(<CardAttachments cardId={CARD_ID} role="admin" />);
    await userEvent.click(await screen.findByRole("button", { name: "Remove theirs.avif" }));
    await userEvent.click(screen.getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "View theirs.avif" })).not.toBeInTheDocument());
  });
});

describe("Rich-text description (R40)", () => {
  const CARD: Card = {
    id: CARD_ID, column_id: "c", title: "Write the brief", description: "<p>Hello <strong>team</strong></p>", assignee_id: null, assignee: null,
    order: 1, comment_count: 0, attachment_count: 0, created_at: "2026-11-19T10:00:00Z", updated_at: "2026-11-19T10:00:00Z",
  };

  it("renders the stored HTML in an editor with a formatting toolbar", async () => {
    mockApi({ [`GET /api/boards/b/members`]: [], [`GET /api/cards/${CARD_ID}/comments`]: [], [`GET /api/cards/${CARD_ID}/attachments`]: [] });
    renderWithProviders(<CardDetailModal card={CARD} boardId="b" onClose={jest.fn()} onUpdated={jest.fn()} onDeleted={jest.fn()} />);
    const toolbar = await screen.findByRole("toolbar", { name: "Formatting" });
    for (const name of ["Bold", "Italic", "Underline", "Strikethrough", "Heading", "Bulleted list", "Numbered list", "Quote", "Link", "Undo", "Redo"]) {
      expect(within(toolbar).getByRole("button", { name })).toBeInTheDocument();
    }
    const editor = await screen.findByRole("textbox", { name: "Description" });
    await waitFor(() => expect(editor.querySelector("strong")).toHaveTextContent("team"));
    // One tab stop: only the first tool is tabbable, arrow keys move along the toolbar.
    const tools = within(toolbar).getAllByRole("button");
    expect(tools.filter((b) => b.tabIndex === 0)).toHaveLength(1);
    act(() => tools[0].focus());
    fireEvent.keyDown(toolbar, { key: "ArrowRight" });
    expect(document.activeElement).toBe(tools[1]);
  });

  it("toggling a list changes the description and enables Save", async () => {
    mockApi({ [`GET /api/boards/b/members`]: [], [`GET /api/cards/${CARD_ID}/comments`]: [], [`GET /api/cards/${CARD_ID}/attachments`]: [] });
    renderWithProviders(<CardDetailModal card={CARD} boardId="b" onClose={jest.fn()} onUpdated={jest.fn()} onDeleted={jest.fn()} />);
    const save = screen.getByRole("button", { name: "Save card" });
    expect(save).toBeDisabled();
    await screen.findByRole("textbox", { name: "Description" });
    await userEvent.click(screen.getByRole("button", { name: "Bulleted list" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Bulleted list" })).toHaveAttribute("aria-pressed", "true"));
    expect(save).toBeEnabled();
  });
});

describe("upload and link helpers", () => {
  it("accepts images up to 4 MB only", () => {
    expect(imageFileError({ type: "image/jpeg", size: MAX_UPLOAD_BYTES })).toBeNull();
    expect(imageFileError({ type: "image/jpeg", size: MAX_UPLOAD_BYTES + 1 })).toMatch(/4 MB/);
    expect(imageFileError({ type: "application/pdf", size: 10 })).toMatch(/image file/);
    expect(imageFileError({ type: "image/svg+xml", size: 10 })).toMatch(/image file/);
  });

  // Feature: revotask, Property 45: Editor links use only http, https or mailto
  it("Property 45: normaliseLink only ever produces http, https or mailto links", () => {
    fc.assert(
      fc.property(fc.oneof(fc.string(), fc.webUrl(), fc.emailAddress(), fc.constantFrom("javascript:alert(1)", " JAVASCRIPT:x", "data:text/html,x", "vbscript:x", "ftp://x")), (raw) => {
        const out = normaliseLink(raw);
        if (out === null) return true;
        return /^(https?:\/\/|mailto:)/i.test(out);
      }),
      { numRuns: 200 },
    );
    expect(normaliseLink("revou.co")).toBe("https://revou.co");
    expect(normaliseLink("ana@example.com")).toBe("mailto:ana@example.com");
    expect(normaliseLink("javascript:alert(1)")).toBeNull();
  });
});
