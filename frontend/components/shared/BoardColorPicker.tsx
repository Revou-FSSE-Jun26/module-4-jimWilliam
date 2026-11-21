"use client";

import { useId } from "react";

import { BOARD_COLORS } from "@/lib/boardColor";

/**
 * Board colour as a real radio group (R48.2): arrow keys move between swatches, and each swatch's
 * name is its accessible label. "Automatic" keeps the colour derived from the board id.
 */
export function BoardColorPicker({ value, onChange, autoHue }: { value: number | null; onChange: (hue: number | null) => void; autoHue: number }) {
  const name = useId();
  const options: { label: string; hue: number | null; swatch: number }[] = [
    { label: "Automatic", hue: null, swatch: autoHue },
    ...BOARD_COLORS.map((c) => ({ label: c.name, hue: c.hue as number, swatch: c.hue as number })),
  ];
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-sm font-medium">Colour</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={option.label} className="color-swatch" style={{ ["--board-hue" as string]: option.swatch }} title={option.label}>
            <input
              type="radio"
              name={name}
              className="visually-hidden"
              checked={value === option.hue}
              onChange={() => onChange(option.hue)}
            />
            <span className="color-swatch-dot" data-auto={option.hue === null || undefined} aria-hidden="true" />
            <span className="text-sm">{option.label}</span>
          </label>
        ))}
      </div>
      <p className="text-xs text-muted">Used for the board&apos;s dot and progress in the sidebar and its tile on the dashboard.</p>
    </fieldset>
  );
}
