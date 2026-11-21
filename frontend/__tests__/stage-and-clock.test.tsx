import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import fc from "fast-check";

import { measure } from "@/components/board/KanbanNavigator";
import { TideClock } from "@/components/layout/TideClock";
import { clockParts, dayPart, tideLevel, tideTrend } from "@/lib/tide";

import { mockApi, renderWithProviders } from "./test-utils";

const at = (h: number, m = 0) => new Date(2026, 10, 21, h, m, 0);
const anyTime = fc.record({ h: fc.integer({ min: 0, max: 23 }), m: fc.integer({ min: 0, max: 59 }) });

describe("tide (R45)", () => {
  // Feature: revotask, Property 46: The tide is a smooth daily curve
  it("Property 46: the tide level stays in [0, 1], peaks at 15:00, bottoms at 03:00 and rises only between them", () => {
    expect(tideLevel(at(15))).toBeCloseTo(1, 6);
    expect(tideLevel(at(3))).toBeCloseTo(0, 6);
    fc.assert(
      fc.property(anyTime, ({ h, m }) => {
        const now = at(h, m);
        const level = tideLevel(now);
        const later = tideLevel(new Date(now.getTime() + 60_000));
        const inRange = level >= 0 && level <= 1;
        const trend = tideTrend(now);
        // Rising means the next minute is at least as high (allowing for rounding at the turn).
        const consistent = trend === "rising" ? later >= level - 1e-9 : later <= level + 1e-9;
        return inRange && consistent;
      }),
      { numRuns: 300 },
    );
  });

  // Feature: revotask, Property 47: Clock formats agree
  it("Property 47: 12-hour and 24-hour formats name the same minute", () => {
    fc.assert(
      fc.property(anyTime, ({ h, m }) => {
        const d = at(h, m);
        const t24 = clockParts(d, false);
        const t12 = clockParts(d, true);
        const back = (Number(t12.hours) % 12) + (t12.suffix === "PM" ? 12 : 0);
        return t24.hours === String(h).padStart(2, "0") && t24.suffix === null && back === h && t12.minutes === t24.minutes && Number(t12.hours) >= 1 && Number(t12.hours) <= 12;
      }),
      { numRuns: 300 },
    );
    expect(dayPart(at(9))).toBe("Morning");
    expect(dayPart(at(23))).toBe("Night");
  });
});

describe("TideClock (R45)", () => {
  beforeEach(() => {
    jest.useFakeTimers({ advanceTimers: true });
    jest.setSystemTime(at(14, 5));
    localStorage.clear();
  });
  afterEach(() => jest.useRealTimers());

  it("shows the time, date and tide, switches to 12-hour time and links to assigned cards", async () => {
    mockApi({ "GET /api/cards": [{ id: "a" }, { id: "b" }] });
    renderWithProviders(<TideClock />);
    const time = screen.getByRole("button", { name: /^14:05, Saturday 21 November\. Switch to 12-hour time$/ });
    expect(time).toHaveTextContent("14:05");
    expect(screen.getByText(/Afternoon tide rising/)).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /2 cards assigned to you/ })).toHaveAttribute("href", "/my-tasks");
    await userEvent.click(time);
    expect(screen.getByRole("button", { name: /^2:05 PM/ })).toHaveTextContent("2:05PM");
    expect(localStorage.getItem("revotask_clock")).toBe("12");
  });

  it("moves to the next minute on time", () => {
    mockApi({ "GET /api/cards": [] });
    renderWithProviders(<TideClock compact />);
    expect(screen.getByRole("button")).toHaveTextContent("14:05");
    act(() => {
      jest.advanceTimersByTime(60_100);   // the timer fires 50 ms after the minute turns
    });
    expect(screen.getByRole("button")).toHaveTextContent("14:06");
  });
});

describe("KanbanNavigator measure (R44)", () => {
  function fakeRow({ scrollLeft, scrollWidth, clientWidth, columns }: { scrollLeft: number; scrollWidth: number; clientWidth: number; columns: [string, number, number][] }) {
    const row = document.createElement("div");
    for (const [id, left, width] of columns) {
      const col = document.createElement("section");
      col.dataset.testid = `column-${id}`;
      col.getBoundingClientRect = () => ({ left, right: left + width, width, top: 0, bottom: 100, height: 100, x: left, y: 0, toJSON() {} }) as DOMRect;
      row.append(col);
    }
    Object.defineProperties(row, {
      scrollLeft: { value: scrollLeft },
      scrollWidth: { value: scrollWidth },
      clientWidth: { value: clientWidth },
    });
    row.getBoundingClientRect = () => ({ left: 0, right: clientWidth, width: clientWidth, top: 0, bottom: 100, height: 100, x: 0, y: 0, toJSON() {} }) as DOMRect;
    return row;
  }

  it("reports overflow, scroll directions and the columns at least half in view", () => {
    const row = fakeRow({ scrollLeft: 300, scrollWidth: 1500, clientWidth: 800, columns: [["a", -300, 300], ["b", 10, 300], ["c", 320, 300], ["d", 700, 300]] });
    expect(measure(row, ["a", "b", "c", "d"])).toEqual({ overflow: true, canLeft: true, canRight: true, visible: ["b", "c"] });
    const fits = fakeRow({ scrollLeft: 0, scrollWidth: 800, clientWidth: 800, columns: [["a", 0, 300]] });
    expect(measure(fits, ["a"])).toEqual({ overflow: false, canLeft: false, canRight: false, visible: ["a"] });
  });
});
