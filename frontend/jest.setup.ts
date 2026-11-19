import "@testing-library/jest-dom";

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
for (const name of ["showPopover", "hidePopover", "togglePopover"] as const) {
  if (!(name in HTMLElement.prototype)) {
    Object.defineProperty(HTMLElement.prototype, name, { value: function () {}, configurable: true });
  }
}
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({ matches: false, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false }) as unknown as MediaQueryList;
}

// Next.js navigation and the Server Actions are not available in jsdom.
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn(), back: jest.fn(), prefetch: jest.fn() }),
  usePathname: () => "/",
}));
jest.mock("@/app/actions/session", () => ({ createSession: jest.fn(), deleteSession: jest.fn(async () => undefined) }));
jest.mock("@/app/actions/prefs", () => ({ setPrefs: jest.fn(async () => undefined) }));
