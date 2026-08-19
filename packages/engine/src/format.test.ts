import { describe, expect, it } from "vitest";
import { formatTokens, initialsFromName } from "./format.js";

describe("formatTokens", () => {
  it("uses K/M suffixes", () => {
    expect(formatTokens(500_000)).toBe("500K");
    expect(formatTokens(12_500)).toBe("12.5K");
    expect(formatTokens(1_000_000)).toBe("1M");
    expect(formatTokens(-20_000)).toBe("-20K");
  });
});

describe("initialsFromName", () => {
  it("takes two letters from a nickname", () => {
    expect(initialsFromName("Ada")).toBe("AD");
    expect(initialsFromName("你")).toBe("你");
  });
});
