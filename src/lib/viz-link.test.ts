import { describe, it, expect } from "vitest";
import { libraryLink, weaveLink } from "./viz-link";

describe("viz-link route targets", () => {
  it('libraryLink targets "/library"', () => {
    expect(libraryLink({ status: "loved" }).to).toBe("/library");
  });

  it('weaveLink targets "/weave"', () => {
    expect(weaveLink({ month: "2025-01" }).to).toBe("/weave");
  });
});
