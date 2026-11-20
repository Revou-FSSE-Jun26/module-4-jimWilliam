"use client";

import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export interface RichTextEditorProps {
  /** Initial HTML. The editor is uncontrolled after mount; key it to reset. */
  value: string;
  onChange: (html: string) => void;
  /** id of the visible label element. */
  labelledBy: string;
  placeholder?: string;
}

type Tool = {
  key: string;
  label: string;
  shortcut?: string;
  icon: ReactNode;
  run: (editor: Editor) => void;
  active?: (editor: Editor) => boolean;
  disabled?: (editor: Editor) => boolean;
};

const icon = (d: string) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
const glyph = (text: string, extra = "") => <span aria-hidden="true" className={`min-w-4.5 text-center text-[0.95rem] leading-none ${extra}`}>{text}</span>;

const GROUPS: Tool[][] = [
  [
    { key: "bold", label: "Bold", shortcut: "Ctrl+B", icon: glyph("B", "font-bold"), run: (e) => e.chain().focus().toggleBold().run(), active: (e) => e.isActive("bold") },
    { key: "italic", label: "Italic", shortcut: "Ctrl+I", icon: glyph("I", "italic font-serif"), run: (e) => e.chain().focus().toggleItalic().run(), active: (e) => e.isActive("italic") },
    { key: "underline", label: "Underline", shortcut: "Ctrl+U", icon: glyph("U", "underline underline-offset-2"), run: (e) => e.chain().focus().toggleUnderline().run(), active: (e) => e.isActive("underline") },
    { key: "strike", label: "Strikethrough", shortcut: "Ctrl+Shift+S", icon: glyph("S", "line-through"), run: (e) => e.chain().focus().toggleStrike().run(), active: (e) => e.isActive("strike") },
    { key: "code", label: "Inline code", shortcut: "Ctrl+E", icon: icon("M9 8l-4 4 4 4M15 8l4 4-4 4"), run: (e) => e.chain().focus().toggleCode().run(), active: (e) => e.isActive("code") },
  ],
  [
    { key: "h2", label: "Heading", icon: glyph("H2", "font-semibold text-[0.8rem]"), run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(), active: (e) => e.isActive("heading", { level: 2 }) },
    { key: "h3", label: "Subheading", icon: glyph("H3", "font-semibold text-[0.8rem]"), run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(), active: (e) => e.isActive("heading", { level: 3 }) },
    { key: "bullet", label: "Bulleted list", icon: icon("M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"), run: (e) => e.chain().focus().toggleBulletList().run(), active: (e) => e.isActive("bulletList") },
    { key: "ordered", label: "Numbered list", icon: icon("M10 6h10M10 12h10M10 18h10M4 5l1.5-1v5M4 14.5c0-1 2.5-1 2.5 0 0 1-2.5 2-2.5 3.5h2.5"), run: (e) => e.chain().focus().toggleOrderedList().run(), active: (e) => e.isActive("orderedList") },
    { key: "quote", label: "Quote", icon: icon("M7 7h4v4c0 3-1.5 5-4 6M14 7h4v4c0 3-1.5 5-4 6"), run: (e) => e.chain().focus().toggleBlockquote().run(), active: (e) => e.isActive("blockquote") },
    { key: "codeblock", label: "Code block", icon: icon("M4 5h16v14H4zM8 10l-2 2 2 2M12 14h4"), run: (e) => e.chain().focus().toggleCodeBlock().run(), active: (e) => e.isActive("codeBlock") },
    { key: "rule", label: "Divider", icon: icon("M4 12h16"), run: (e) => e.chain().focus().setHorizontalRule().run() },
  ],
  [
    { key: "clear", label: "Clear formatting", icon: icon("M6 6h12M12 6l-3 12M15 15l5 5M20 15l-5 5"), run: (e) => e.chain().focus().unsetAllMarks().clearNodes().run() },
    { key: "undo", label: "Undo", shortcut: "Ctrl+Z", icon: icon("M9 14L4 9l5-5M4 9h11a5 5 0 010 10h-3"), run: (e) => e.chain().focus().undo().run(), disabled: (e) => !e.can().undo() },
    { key: "redo", label: "Redo", shortcut: "Ctrl+Shift+Z", icon: icon("M15 14l5-5-5-5M20 9H9a5 5 0 000 10h3"), run: (e) => e.chain().focus().redo().run(), disabled: (e) => !e.can().redo() },
  ],
];
const TOOLS = GROUPS.flat();
/** Index of each group's first button in the roving-tabindex order. */
const OFFSETS = GROUPS.map((_, g) => GROUPS.slice(0, g).reduce((n, group) => n + group.length, 0));

/** Only links the API keeps (R40.3): http, https and mailto. A bare domain gets https://. */
export function normaliseLink(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (/^(https?:\/\/|mailto:)/i.test(value)) return value;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return null;   // javascript:, data:, ftp: ...
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return `mailto:${value}`;
  return `https://${value}`;
}

/**
 * Rich-text description editor (R40): TipTap with a formatting toolbar. The toolbar follows the
 * APG toolbar pattern (one tab stop, arrow keys move between buttons, aria-pressed for toggles).
 * The HTML it produces is sanitised again by the API before it is stored.
 */
export function RichTextEditor({ value, onChange, labelledBy, placeholder = "Add details, links or acceptance notes" }: RichTextEditorProps) {
  const toolbarId = useId();
  const linkInputId = useId();
  const [focusIndex, setFocusIndex] = useState(0);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
      }),
    ],
    content: value,
    immediatelyRender: false,   // Next.js: render on the client only, no hydration mismatch
    editorProps: {
      attributes: {
        class: "rich-text rich-text-editor",
        role: "textbox",
        "aria-multiline": "true",
        "aria-labelledby": labelledBy,
        "data-placeholder": placeholder,
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? "" : e.getHTML()),
  });

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e) return null;
      return {
        active: Object.fromEntries(TOOLS.map((t) => [t.key, t.active?.(e) ?? false])),
        disabled: Object.fromEntries(TOOLS.map((t) => [t.key, t.disabled?.(e) ?? false])),
        link: e.isActive("link"),
        linkHref: (e.getAttributes("link").href as string | undefined) ?? "",
        empty: e.isEmpty,
      };
    },
  });

  function onToolbarKey(event: KeyboardEvent<HTMLDivElement>) {
    const count = TOOLS.length + 1;   // + the link button
    const moves: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    let next: number | null = null;
    if (event.key in moves) next = (focusIndex + moves[event.key] + count) % count;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = count - 1;
    if (next === null) return;
    event.preventDefault();
    setFocusIndex(next);
    buttons.current[next]?.focus();
  }

  function openLink() {
    setLinkValue(state?.linkHref ?? "");
    setLinkError(null);
    setLinkOpen(true);
  }

  function applyLink() {
    if (!editor) return;
    if (!linkValue.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setLinkOpen(false);
      return;
    }
    const href = normaliseLink(linkValue);
    if (!href) {
      setLinkError("Use a web address (https://…) or an email address.");
      return;
    }
    const chain = editor.chain().focus().extendMarkRange("link");
    if (editor.state.selection.empty && !editor.isActive("link")) {
      chain.insertContent({ type: "text", text: href, marks: [{ type: "link", attrs: { href } }] }).run();
    } else {
      chain.setLink({ href }).run();
    }
    setLinkOpen(false);
  }

  const linkIndex = TOOLS.length;

  return (
    <div className="rich-text-shell" data-testid="rich-text-editor">
      <div
        id={toolbarId}
        role="toolbar"
        aria-label="Formatting"
        onKeyDown={onToolbarKey}
        className="rich-text-toolbar"
      >
        {GROUPS.map((group, g) => (
          <div key={g} role="group" className="flex items-center gap-0.5">
            {group.map((tool, t) => {
              const i = OFFSETS[g] + t;
              const toggle = !!tool.active;
              return (
                <button
                  key={tool.key}
                  ref={(el) => { buttons.current[i] = el; }}
                  type="button"
                  tabIndex={focusIndex === i ? 0 : -1}
                  aria-label={tool.label}
                  aria-pressed={toggle ? !!state?.active[tool.key] : undefined}
                  aria-keyshortcuts={tool.shortcut?.replace("Ctrl", "Control")}
                  title={tool.shortcut ? `${tool.label} (${tool.shortcut})` : tool.label}
                  disabled={!editor || !!state?.disabled[tool.key]}
                  onMouseDown={(e) => e.preventDefault()}   // keep the editor's selection
                  onClick={() => { setFocusIndex(i); if (editor) tool.run(editor); }}
                  className="rich-text-tool"
                >
                  {tool.icon}
                </button>
              );
            })}
            {g === 0 && (
              <button
                ref={(el) => { buttons.current[linkIndex] = el; }}
                type="button"
                tabIndex={focusIndex === linkIndex ? 0 : -1}
                aria-label="Link"
                aria-pressed={!!state?.link}
                aria-expanded={linkOpen}
                aria-controls={linkOpen ? linkInputId : undefined}
                title="Link"
                disabled={!editor}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { setFocusIndex(linkIndex); if (linkOpen) setLinkOpen(false); else openLink(); }}
                className="rich-text-tool"
              >
                {icon("M10 14a4 4 0 005.66 0l3-3a4 4 0 00-5.66-5.66l-1 1M14 10a4 4 0 00-5.66 0l-3 3a4 4 0 005.66 5.66l1-1")}
              </button>
            )}
          </div>
        ))}
      </div>

      {linkOpen && (
        <div className="enter flex flex-wrap items-center gap-2 border-b border-(--rim) px-2 py-2">
          <label htmlFor={linkInputId} className="visually-hidden">Link address</label>
          <input
            id={linkInputId}
            type="url"
            inputMode="url"
            autoFocus
            value={linkValue}
            placeholder="https://example.com"
            onChange={(e) => { setLinkValue(e.target.value); setLinkError(null); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); applyLink(); }
              if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setLinkOpen(false); editor?.commands.focus(); }
            }}
            aria-invalid={!!linkError || undefined}
            aria-describedby={linkError ? `${linkInputId}-error` : undefined}
            className="field-input min-h-9! min-w-0 flex-1 py-1.5! text-sm"
          />
          <button type="button" onClick={applyLink} className="rich-text-tool w-auto! px-3 text-sm font-medium">{linkValue.trim() ? "Apply" : "Remove link"}</button>
          {linkError && <p id={`${linkInputId}-error`} role="alert" className="basis-full text-sm text-danger-text">{linkError}</p>}
        </div>
      )}

      <EditorContent editor={editor} />
    </div>
  );
}
