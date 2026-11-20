import "@testing-library/jest-dom";

// Some suites run in the node environment (`@jest-environment node`); DOM stand-ins apply only with a DOM.

// jsdom has no <dialog> modal API or popover API; minimal stand-ins so components can open and close.
if (typeof HTMLDialogElement !== "undefined") {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.hasAttribute("open")) return;
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
}
const hasDom = typeof window !== "undefined" && typeof HTMLElement !== "undefined";
for (const name of ["showPopover", "hidePopover", "togglePopover"] as const) {
  if (hasDom && !(name in HTMLElement.prototype)) {
    Object.defineProperty(HTMLElement.prototype, name, { value: function () {}, configurable: true });
  }
}
if (hasDom && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({ matches: false, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false }) as unknown as MediaQueryList;
}

// Next.js navigation and the Server Actions are not available in jsdom.
// One shared router object, so tests can assert redirects via jest.requireMock("next/navigation").__router.
jest.mock("next/navigation", () => {
  const router = { push: jest.fn(), replace: jest.fn(), refresh: jest.fn(), back: jest.fn(), prefetch: jest.fn() };
  return { useRouter: () => router, usePathname: () => "/", __router: router };
});
jest.mock("@/app/actions/session", () => ({ createSession: jest.fn(), deleteSession: jest.fn(async () => undefined) }));
jest.mock("@/app/actions/prefs", () => ({ setPrefs: jest.fn(async () => undefined) }));
