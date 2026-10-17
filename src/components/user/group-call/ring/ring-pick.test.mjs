import { describe, expect, test } from "bun:test";
import { normalizeRingPick, ringButtonLabel, ringSummary } from "./ring-pick.ts";

const members = ["a", "b", "c"];

describe("normalizeRingPick", () => {
  test("everyone ticked sends no list", () => {
    expect(normalizeRingPick(["c", "a", "b"], members)).toBeNull();
  });
  test("keeps member order and drops strangers", () => {
    expect(normalizeRingPick(["c", "x", "a"], members)).toEqual(["a", "c"]);
  });
  test("nothing ticked is an empty list, not everyone", () => {
    expect(normalizeRingPick([], members)).toEqual([]);
  });
});

describe("ringSummary (same words as mobile)", () => {
  test("labels", () => {
    expect(ringSummary(null, 3)).toBe("Everyone");
    expect(ringSummary(["a", "b", "c"], 3)).toBe("Everyone");
    expect(ringSummary([], 3)).toBe("Nobody");
    expect(ringSummary(["a"], 3)).toBe("1 person");
    expect(ringSummary(["a", "b"], 3)).toBe("2 people");
  });
  test("button", () => {
    expect(ringButtonLabel(null, 3)).toBe("Ring everyone");
    expect(ringButtonLabel([], 3)).toBe("Ring nobody");
    expect(ringButtonLabel(["a", "b"], 3)).toBe("Ring 2 people");
  });
});
