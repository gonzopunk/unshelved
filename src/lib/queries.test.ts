import { describe, it, expect } from "vitest";
import * as queries from "./queries";

// queries.ts exports React Query hooks rather than plain key arrays/factories.
// Per WP3 instructions, do not refactor queries.ts — only assert what is
// already exported is present and callable. This protects against accidental
// removal/rename of the load-bearing read hooks for the library, profile, and
// book detail domains.
describe("queries.ts exports", () => {
  it("exports useLibrary as a function (library domain)", () => {
    expect(typeof queries.useLibrary).toBe("function");
  });

  it("exports useProfile as a function (profile domain)", () => {
    expect(typeof queries.useProfile).toBe("function");
  });

  it("exports useBookDetail as a function (book domain)", () => {
    expect(typeof queries.useBookDetail).toBe("function");
  });
});
