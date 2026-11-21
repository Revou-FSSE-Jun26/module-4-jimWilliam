"use client";

import { useId, useState } from "react";

import { BOARD_COLORS } from "@/lib/boardColor";
import { hexFromHue, hueFromHex } from "@/lib/oklch";

const PRESETS: readonly number[] = BOARD_COLORS.map((c) => c.hue);
const DEFAULT_CUSTOM = 190;

/**
 * Board colour (R48): a radio group of "Automatic", eight named colours and "Custom". Custom opens
 * a hue slider and the system colour picker. Whatever is picked is reduced to its OKLCH hue, and the
 * board shows it at the fixed lightness and chroma, so no choice can make text or dots hard to see.
 */
export function BoardColorPicker({ value, onChange, autoHue }: { value: number | null; onChange: (hue: number | null) => void; autoHue: number }) {
  const name = useId();
  const sliderId = useId();
  const custom = value !== null && !PRESETS.includes(value);
  const [customHue, setCustomHue] = useState(custom ? value : DEFAULT_CUSTOM);
  const [showCustom, setShowCustom] = useState(custom);
  const [grey, setGrey] = useState(false);

  const options: { label: string; hue: number | null; swatch: number; isCustom?: boolean }[] = [
    { label: "Automatic", hue: null, swatch: autoHue },
    ...BOARD_COLORS.map((c) => ({ label: c.name, hue: c.hue as number, swatch: c.hue as number })),
    { label: "Custom", hue: customHue, swatch: customHue, isCustom: true },
  ];

  const pickCustom = (hue: number) => {
    const rounded = Math.round(hue) % 360;
    setCustomHue(rounded);
    onChange(rounded);
  };

  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-sm font-medium">Colour</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const checked = option.isCustom ? showCustom || custom : !showCustom && value === option.hue;
          return (
            <label key={option.label} className="color-swatch" style={{ ["--board-hue" as string]: option.swatch }} title={option.label}>
              <input
                type="radio"
                name={name}
                className="visually-hidden"
                checked={checked}
                onChange={() => {
                  setShowCustom(!!option.isCustom);
                  onChange(option.isCustom ? customHue : option.hue);
                }}
              />
              <span className="color-swatch-dot" data-auto={option.hue === null || undefined} data-custom={option.isCustom || undefined} aria-hidden="true" />
              <span className="text-sm">{option.label}</span>
            </label>
          );
        })}
      </div>
      {(showCustom || custom) && (
        <div className="enter grid gap-2 rounded-pebble border border-rim p-3" style={{ ["--board-hue" as string]: customHue }}>
          <div className="flex items-center gap-3">
            <span className="color-swatch-dot size-8!" aria-hidden="true" />
            <label htmlFor={sliderId} className="text-sm font-medium">Hue <span className="font-normal text-muted tabular-nums">{customHue}°</span></label>
            <label className="ms-auto inline-flex cursor-pointer items-center gap-2 rounded-pill border border-rim px-3 py-1.5 text-sm hover:bg-hover">
              <input
                type="color"
                value={hexFromHue(customHue)}
                onChange={(e) => {
                  const hue = hueFromHex(e.target.value);
                  setGrey(hue === null);
                  if (hue !== null) pickCustom(hue);
                }}
                className="size-6 cursor-pointer rounded-full border-0 bg-transparent p-0"
                aria-label="Pick any colour"
              />
              Pick any colour
            </label>
          </div>
          <input
            id={sliderId}
            type="range"
            min={0}
            max={359}
            value={customHue}
            onChange={(e) => {
              setGrey(false);
              pickCustom(Number(e.target.value));
            }}
            className="hue-slider"
            aria-valuetext={`Hue ${customHue} degrees`}
          />
          <p className="text-xs text-muted" role={grey ? "status" : undefined}>
            {grey
              ? "Greys, black and white have no colour, so they cannot be used. Pick a tinted colour instead."
              : "Only the hue is used; brightness stays fixed so the dot, progress and tile stay readable."}
          </p>
        </div>
      )}
      <p className="text-xs text-muted">Used for the board&apos;s dot and progress in the sidebar and its tile on the dashboard.</p>
    </fieldset>
  );
}
