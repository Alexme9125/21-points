import { describe, expect, it } from "vitest";
import { LLM_PERSONAS } from "./personas.js";

describe("bot table names", () => {
  it("uses nicknames instead of model names", () => {
    expect(LLM_PERSONAS.map((p) => p.name)).toEqual([
      "Tibo",
      "Linus",
      "Aqua",
      "Alice",
      "Seth",
      "Nori",
      "Milo",
      "Vera",
      "Juno",
    ]);
  });
});
