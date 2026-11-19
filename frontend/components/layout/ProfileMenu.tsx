"use client";

import Link from "next/link";
import { useId, useRef, type KeyboardEvent } from "react";

import { Avatar } from "@/components/layout/Avatar";
import { useAuth } from "@/context/AuthContext";
import { useMenuKeyboard } from "@/hooks/useMenuKeyboard";
import { usePreferences } from "@/hooks/usePreferences";
import { useSpecularHighlight } from "@/hooks/useSpecularHighlight";
import type { Theme } from "@/lib/prefs";

const THEMES: { value: Theme; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

/** Invoker attributes React does not know yet; passed through as plain attributes. */
function invoker(targetId: string) {
  return { commandfor: targetId, command: "toggle-popover" } as Record<string, string>;
}

/**
 * Profile_Capsule + Profile_Menu (R36.1–R36.4): Profile link, Appearance submenu with a theme
 * radio group and two checkable items, and Log out (R32.7).
 */
export function ProfileMenu({ compact = false, idPrefix }: { compact?: boolean; idPrefix: string }) {
  const { user, logout } = useAuth();
  const { prefs, update } = usePreferences();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const onPointerMove = useSpecularHighlight<HTMLButtonElement>();
  const uid = useId().replace(/:/g, "");
  const menuId = `${idPrefix}-profile-menu-${uid}`;
  const subId = `${idPrefix}-appearance-menu-${uid}`;
  const triggerId = `${idPrefix}-profile-capsule-${uid}`;
  const subTriggerId = `${idPrefix}-appearance-trigger-${uid}`;
  useMenuKeyboard(triggerRef, menuRef, "above");

  if (!user) return null;

  const closeAll = () => menuRef.current?.hidePopover();
  // Space toggles a checkable item and keeps the menu open; Enter toggles and closes (APG).
  const checkKey = (event: KeyboardEvent<HTMLButtonElement>, toggle: () => void) => {
    if (event.key === " ") {
      event.preventDefault();
      toggle();
    }
  };

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        aria-haspopup="menu"
        aria-expanded="false"
        onPointerMove={onPointerMove}
        className="glass-pebble lift specular flex w-full items-center gap-3 rounded-pebble p-2 text-start aria-expanded:ring-1 aria-expanded:ring-seaglass"
        {...invoker(menuId)}
      >
        <Avatar id={user.id} name={user.name} />
        {/* A hidden prefix (not aria-label) keeps the visible name inside the accessible name (WCAG 2.5.3). */}
        <span className="visually-hidden">Account menu: </span>
        <span className={`min-w-0 flex-1 ${compact ? "rail-hide" : ""}`}>
          <span className="block truncate font-semibold">{user.name}</span>
          <span className="block truncate text-sm text-muted">{user.email}</span>
        </span>
      </button>

      <div ref={menuRef} id={menuId} popover="auto" className="menu-popover place-above glass-raised">
        <div data-menu-group="" {...{ focusgroup: "menu nomemory" }} aria-labelledby={triggerId}>
          <Link href="/profile" className="menu-item" onClick={closeAll}>Profile</Link>
          <button
            id={subTriggerId}
            type="button"
            className="menu-item"
            aria-haspopup="menu"
            aria-expanded="false"
            {...invoker(subId)}
          >
            Appearance <span className="hint" aria-hidden="true">›</span>
          </button>
          <div id={subId} popover="auto" className="menu-popover place-side glass-raised">
            <div data-menu-group="" {...{ focusgroup: "menu nomemory" }} aria-labelledby={subTriggerId}>
              <div role="group" aria-label="Theme">
                {THEMES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    role="menuitemradio"
                    aria-checked={prefs.theme === t.value}
                    className="menu-item"
                    onClick={() => update({ theme: t.value })}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <hr />
              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={prefs.animateBg}
                className="menu-item"
                onClick={() => update({ animateBg: !prefs.animateBg })}
                onKeyDown={(e) => checkKey(e, () => update({ animateBg: !prefs.animateBg }))}
              >
                Animate background
              </button>
              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={prefs.reduceTransparency}
                className="menu-item"
                onClick={() => update({ reduceTransparency: !prefs.reduceTransparency })}
                onKeyDown={(e) => checkKey(e, () => update({ reduceTransparency: !prefs.reduceTransparency }))}
              >
                Reduce transparency
              </button>
            </div>
          </div>
          <hr />
          <button
            type="button"
            className="menu-item"
            onClick={() => {
              closeAll();
              void logout();
            }}
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
