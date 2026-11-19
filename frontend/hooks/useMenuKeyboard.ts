"use client";

import { useEffect, type RefObject } from "react";

import { positionFallback } from "@/lib/polyfills";

const ITEM_SELECTOR = "a[href], button:not([disabled])";

function ownItems(group: HTMLElement): HTMLElement[] {
  return Array.from(group.querySelectorAll<HTMLElement>(ITEM_SELECTOR)).filter(
    (el) => el.closest("[data-menu-group]") === group,
  );
}

function hasNativeFocusgroup(): boolean {
  return "focusGroup" in HTMLElement.prototype;
}

/**
 * Keyboard model for a popup menu with one submenu (R36.4), following the `menu` guide:
 * focus moves in `toggle` (not on click), keyboard opens enter the menu, pointer opens do not,
 * ArrowRight opens the submenu, ArrowLeft/Escape close one level and restore focus to its trigger.
 */
export function useMenuKeyboard(
  triggerRef: RefObject<HTMLButtonElement | null>,
  menuRef: RefObject<HTMLElement | null>,
  placement: "above" | "below" = "above",
) {
  useEffect(() => {
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger || !menu) return;
    const enterOnOpen = new WeakSet<HTMLElement>();
    const native = hasNativeFocusgroup();

    // Fallback roles where focusgroup cannot infer them.
    if (!native) {
      menu.querySelectorAll<HTMLElement>("[data-menu-group]").forEach((group) => {
        group.setAttribute("role", "menu");
        ownItems(group).forEach((item) => {
          if (!item.hasAttribute("role")) item.setAttribute("role", "menuitem");
        });
      });
    }

    const popovers = [menu, ...Array.from(menu.querySelectorAll<HTMLElement>("[popover]"))];
    const triggerFor = (popover: HTMLElement) =>
      popover === menu ? trigger : menu.querySelector<HTMLButtonElement>(`[commandfor="${popover.id}"]`);

    const onToggle = (event: Event) => {
      const popover = event.currentTarget as HTMLElement;
      const open = (event as ToggleEvent).newState === "open";
      const owner = triggerFor(popover);
      owner?.setAttribute("aria-expanded", String(open));
      if (!open) return;
      if (owner) positionFallback(popover, owner, popover === menu ? placement : "side");
      if (enterOnOpen.has(popover)) {
        enterOnOpen.delete(popover);
        const group = popover.querySelector<HTMLElement>("[data-menu-group]");
        if (group) ownItems(group)[0]?.focus();
      }
    };
    popovers.forEach((p) => p.addEventListener("toggle", onToggle));

    const onTriggerKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
        enterOnOpen.add(menu);
        if (event.key === "ArrowDown") {
          event.preventDefault();
          if (!menu.matches(":popover-open")) trigger.click();
          else ownItems(menu.querySelector("[data-menu-group]")!)[0]?.focus();
        }
      }
    };
    trigger.addEventListener("keydown", onTriggerKeyDown);

    const onMenuKeyDown = (event: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      const group = active?.closest<HTMLElement>("[data-menu-group]");
      if (!group || !menu.contains(group)) return;
      const items = ownItems(group);
      const index = items.indexOf(active!);
      const sub = group.closest<HTMLElement>("[popover]");

      switch (event.key) {
        case "Home":
        case "End":
          event.preventDefault();
          items[event.key === "Home" ? 0 : items.length - 1]?.focus();
          return;
        case "ArrowDown":
        case "ArrowUp":
          if (native) return;
          event.preventDefault();
          items[(index + (event.key === "ArrowUp" ? -1 : 1) + items.length) % items.length]?.focus();
          return;
        case "ArrowRight": {
          const subId = active?.getAttribute("commandfor");
          const submenu = subId ? document.getElementById(subId) : null;
          if (!submenu) return;
          event.preventDefault();
          enterOnOpen.add(submenu);
          if (!submenu.matches(":popover-open")) active!.click();
          else ownItems(submenu.querySelector("[data-menu-group]")!)[0]?.focus();
          return;
        }
        case "ArrowLeft":
        case "Escape":
          if (sub && sub !== menu) {
            event.preventDefault();
            event.stopPropagation(); // close one level only
            const owner = triggerFor(sub);
            owner?.focus();
            sub.hidePopover();
          } else if (event.key === "Escape") {
            event.preventDefault();
            trigger.focus();
            menu.hidePopover();
          }
          return;
        case "Tab":
          menu.hidePopover();
          return;
      }
    };
    menu.addEventListener("keydown", onMenuKeyDown);

    return () => {
      popovers.forEach((p) => p.removeEventListener("toggle", onToggle));
      trigger.removeEventListener("keydown", onTriggerKeyDown);
      menu.removeEventListener("keydown", onMenuKeyDown);
    };
  }, [triggerRef, menuRef, placement]);
}
