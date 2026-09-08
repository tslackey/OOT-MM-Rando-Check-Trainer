import { describe, expect, it } from "vitest";
import { parseRule } from "./rules";
import { evalText } from "./eval";
import { makeState } from "./state";

describe("OoTR rule parser", () => {
  it("parses boolean helpers and item counts", () => {
    const expr = parseRule("is_adult and (Progressive_Hookshot, 1) or can_leave_forest");
    expect(expr.type).toBe("or");
    const childOpen = makeState({ age: "child", inventory: ["open_forest"] });
    expect(evalText("can_leave_forest", childOpen)).toBe(true);
    const childClosed = makeState({ age: "child", inventory: [] });
    expect(evalText("can_leave_forest", childClosed)).toBe(false);
    const adult = makeState({ age: "adult", inventory: [] });
    expect(evalText("can_leave_forest", adult)).toBe(true);
  });

  it("treats quoted events as false until collected", () => {
    const empty = makeState({ age: "child", inventory: [] });
    expect(evalText("'Defeat Queen Gohma' or False", empty)).toBe(false);
    const gohma = makeState({ age: "child", inventory: [], events: ["Defeat Queen Gohma"] });
    expect(evalText("can_leave_forest", gohma)).toBe(true);
  });

  it("gates at() on reachable regions in the same practice dungeon", () => {
    const state = makeState({ age: "adult", inventory: [] });
    state.searchPracticeId = "oot-forest";
    state.reachable = new Set(["Forest Temple Lobby"]);
    expect(evalText("at('Forest Temple Falling Room', True)", state)).toBe(false);
    state.reachable.add("Forest Temple Falling Room");
    expect(evalText("at('Forest Temple Falling Room', True)", state)).toBe(true);
  });

  it("still evaluates cross-region at() as the inner rule", () => {
    const child = makeState({ age: "child", inventory: [] });
    child.searchPracticeId = "oot-sfm";
    child.reachable = new Set(["Sacred Forest Meadow"]);
    expect(evalText("at('HC Garden Skippable Locations', is_child)", child)).toBe(true);
  });
});
