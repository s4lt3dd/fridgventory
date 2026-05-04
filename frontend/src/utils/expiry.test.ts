import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatDaysRemaining,
  getDaysRemaining,
  getExpiryProgress,
  getUrgency,
} from "./expiry";

// Anchor "today" to a fixed local date so calendar-day arithmetic in the
// expiry utils is deterministic regardless of the host machine's clock.
const TODAY = new Date("2026-05-04T12:00:00");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(TODAY);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getUrgency", () => {
  it("returns danger when the date is in the past", () => {
    expect(getUrgency("2026-05-03")).toBe("danger");
    expect(getUrgency("2025-12-31")).toBe("danger");
  });

  it("returns danger for today and tomorrow", () => {
    expect(getUrgency("2026-05-04")).toBe("danger");
    expect(getUrgency("2026-05-05")).toBe("danger");
  });

  it("returns warning two-to-four days out", () => {
    expect(getUrgency("2026-05-06")).toBe("warning");
    expect(getUrgency("2026-05-07")).toBe("warning");
    expect(getUrgency("2026-05-08")).toBe("warning");
  });

  it("returns safe at five days and beyond", () => {
    expect(getUrgency("2026-05-09")).toBe("safe");
    expect(getUrgency("2026-06-01")).toBe("safe");
  });
});

describe("getDaysRemaining", () => {
  it("returns positive integers for future dates", () => {
    expect(getDaysRemaining("2026-05-09")).toBe(5);
  });

  it("returns 0 for today", () => {
    expect(getDaysRemaining("2026-05-04")).toBe(0);
  });

  it("returns negative integers for past dates", () => {
    expect(getDaysRemaining("2026-05-01")).toBe(-3);
  });
});

describe("formatDaysRemaining", () => {
  it.each([
    [-1, "Expired yesterday"],
    [-3, "Expired 3 days ago"],
    [0, "Today!"],
    [1, "Tomorrow"],
    [3, "In 3 days"],
    [7, "In 1 week"],
    [14, "In 2 weeks"],
    [30, "In 1 month"],
    [90, "In 3 months"],
  ])("formats %i as %s", (days, expected) => {
    expect(formatDaysRemaining(days)).toBe(expected);
  });
});

describe("getExpiryProgress", () => {
  it("returns 0 when nothing has elapsed yet", () => {
    expect(getExpiryProgress("2026-05-04", "2026-05-14")).toBe(0);
  });

  it("returns 100 at or past the expiry date", () => {
    expect(getExpiryProgress("2026-04-20", "2026-05-04")).toBe(100);
    expect(getExpiryProgress("2026-04-01", "2026-04-30")).toBe(100);
  });

  it("returns 50 at the midpoint", () => {
    expect(getExpiryProgress("2026-04-29", "2026-05-09")).toBe(50);
  });

  it("clamps to 100 when added and expiry are the same day", () => {
    // total <= 0 short-circuits to 100 — already-expired-on-arrival items.
    expect(getExpiryProgress("2026-05-04", "2026-05-04")).toBe(100);
  });
});
