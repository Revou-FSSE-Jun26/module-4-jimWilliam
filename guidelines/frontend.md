# Frontend guidelines (Next.js + React + TypeScript)

Scope: the Next.js app: structure, data fetching, state, components, styling, motion and accessibility. API and database rules are in `backend.md` and `database.md`.

---

## FE-01 Folder layout matches the brief

**Rule:** Shared base components live in `components/shared/` (BaseButton, BaseBadge, BaseModal), hooks in `hooks/`, and the API client, errors and toast helpers in `lib/`. Feature components go in `components/<area>/`.

**Rationale:** The rubric checks these paths, and one known home per kind of file keeps imports predictable.

**Example:**
```
components/shared/BaseButton.tsx
hooks/useDragAndDrop.ts
lib/apiClient.ts
```

## FE-02 All HTTP goes through `apiClient`

**Rule:** Components and hooks never call `fetch` directly. They call `apiClient<T>(path, { method, body, token })`, which picks `API_BASE_URL` on the server and `NEXT_PUBLIC_API_BASE_URL` in the browser, adds the Bearer header, unwraps `data`, and throws `ApiError` on non-2xx.

**Rationale:** One place handles base URLs, auth headers and the envelope (R21).

**Example:**
```ts
const board = await apiClient<Board>(`/api/boards/${id}`, { token });
```

## FE-03 Errors become toasts through `useErrorHandler`

**Rule:** Catch `ApiError` and pass it to `handleError` from `useErrorHandler`; never `alert()` or `console.log` errors for the user. Success messages use `notify.success()` from `lib/toast.ts`.

**Rationale:** Consistent messages, and 401 always ends the session (R21.6, R21.7).

**Example:**
```ts
try { await apiClient(`/api/cards/${id}`, { method: "DELETE", token }); notify.success("Card deleted"); }
catch (err) { handleError(err); }
```

## FE-04 The JWT never touches web storage

**Rule:** The token lives in the `HttpOnly` Session_Cookie (set by the `createSession` Server Action) and in AuthContext memory. Never write it to `localStorage` or `sessionStorage`.

**Rationale:** R21.8 and R32; web storage is readable by any injected script and survives logout.

**Example:**
```ts
await createSession(res.token, res.expires_at);   // server sets the cookie
login(res.token, res.user);                         // context keeps it in memory
```

## FE-05 Server Components for first data, Client Components for interaction

**Rule:** `/` and `/boards/[id]` are Server Components that read the token with `getToken()` and fetch their initial data. Interactive parts (forms, drag and drop, modals) are Client Components marked `"use client"` that receive that data as props.

**Rationale:** The brief requires these pages to be Server Components, and server-fetched data makes the reload check in R14.6 pass with no loading flash.

**Example:**
```tsx
export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const board = await apiClient<Board>(`/api/boards/${id}`, { token: await getToken() });
  return <KanbanBoard initialBoard={board} />;
}
```

## FE-06 Buttons are BaseButton, modals are BaseModal

**Rule:** Pages render every button through `BaseButton` (variants `primary`, `secondary`, `destructive`, `ghost`) and every modal form through `BaseModal` (a native `<dialog>` opened with `showModal()`). No raw `<button>` in page files.

**Rationale:** R20.6 and one consistent look, focus ring and disabled behaviour.

**Example:**
```tsx
<BaseButton variant="destructive" onClick={onDelete}>Delete board</BaseButton>
```

## FE-07 Style with design tokens and the three glass levels

**Rule:** Use token utilities (`bg-pane`, `rounded-pebble`, `text-foam`, `duration-base`) instead of raw hex, px radii or ms values. Surfaces use `glass-pane`, `glass-raised` or `glass-pebble`; never put a blurred surface inside another blurred surface.

**Rationale:** R34.1–R34.3: tokens keep both themes consistent, and nested `backdrop-filter` breaks the effect and costs GPU time.

**Example:**
```tsx
<section className="glass-pane rounded-pane">        {/* column: blurs */}
  <article className="glass-pebble rounded-pebble"> {/* card: no blur */}
```

## FE-08 Animate only opacity and transforms, and respect reduced motion

**Rule:** Transitions and keyframes touch only `opacity`, `translate`, `scale` and `rotate`. Entrances use `@starting-style`; top-layer exits list `display` and `overlay` with a separate `transition-behavior: allow-discrete`. Movement goes inside `@media (prefers-reduced-motion: no-preference)` or is reduced inside `reduce`; never a global `0.01ms` reset.

**Rationale:** R37.1 and R37.10: compositor-only animation stays smooth, and vestibular users get fades instead of motion.

**Example:**
```css
.enter { transition: opacity var(--dur-base) var(--ease-out), translate var(--dur-base) var(--ease-out); }
@starting-style { .enter { opacity: 0; translate: 0 .5rem; } }
@media (prefers-reduced-motion: reduce) { .enter { translate: none; } }
```

## FE-09 Every control is reachable and labelled

**Rule:** Actions are `<button>`, destinations are `<a href>`. Every input has a `<label>`; errors use `aria-invalid` and `aria-describedby`. Hover-revealed controls also show on `:focus-within` and on `(hover: none)`. Never remove the focus ring without a 3:1 replacement.

**Rationale:** R33.3, R39.4, R39.5 and the axe scan in R39.6.

**Example:**
```tsx
<input id="email" aria-invalid={!!error} aria-describedby={error ? "email-error" : undefined} />
{error && <p id="email-error">{error}</p>}
```

## FE-10 Card moves go through one function

**Rule:** `useDragAndDrop` exposes `moveCard(cardId, columnId, index)`; drop handlers and the Move_Control both call it. It snapshots state, computes the order with `computeOrder`, updates optimistically, calls PATCH position, and restores the snapshot on error.

**Rationale:** R15 and R33: two code paths for one action drift apart (Property 36).

**Example:**
```ts
onDrop={() => moveCard(dragged.id, column.id, dropIndex)}
<MoveControl onMove={(columnId) => moveCard(card.id, columnId, Infinity)} />
```

## FE-11 Types are strict, no `any`

**Rule:** `strict: true` in `tsconfig.json`. API shapes are declared once in `lib/types.ts`; no `any` (use `unknown` and narrow).

**Rationale:** A wrong field name (`title` vs `name`) is caught at build time instead of in production.

**Example:**
```ts
export interface Board { id: string; name: string; role: "admin" | "member"; columns?: Column[] }
```

## FE-12 Tests target roles, labels and test ids, never timing

**Rule:** React Testing Library queries by role and label. Playwright uses `getByRole`, `getByLabel` and `data-testid="card-<id>"`, waits with web-first assertions or `waitForResponse`, and never calls `waitForTimeout`.

**Rationale:** R26.4; selectors tied to meaning survive styling changes, and fixed sleeps are flaky against production.

**Example:**
```ts
await expect(page.getByTestId(`column-${doneId}`).getByTestId(`card-${cardId}`)).toBeVisible();
```
