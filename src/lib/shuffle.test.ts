import { describe, expect, it } from "vitest";
import { createConfig } from "../data/presets";
import { enabledChecks } from "../data/world";
import { placeItems } from "./shuffle";

describe("item placement", () => {
  it("is deterministic for a seed", () => {
    const checks = enabledChecks(createConfig({ games: { oot: true, mm: true } }));
    expect(placeItems(checks, 42)).toEqual(placeItems(checks, 42));
  });

  it("places an item on every enabled check", () => {
    const checks = enabledChecks(createConfig({ games: { oot: false, mm: true } }));
    const placement = placeItems(checks, 7);
    expect(Object.keys(placement).sort()).toEqual(checks.map((check) => check.id).sort());
  });
});
