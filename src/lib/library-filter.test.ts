import { describe, it, expect } from "vitest";
import {
  searchToFilters,
  filtersToSearch,
  emptyLibraryFilters,
  type LibrarySearch,
} from "./library-filter";

describe("searchToFilters", () => {
  it("empty input returns the empty filters shape", () => {
    expect(searchToFilters({})).toEqual(emptyLibraryFilters);
  });

  it('parses status "loved,liked" into ["loved","liked"]', () => {
    expect(searchToFilters({ status: "loved,liked" }).status).toEqual([
      "loved",
      "liked",
    ]);
  });

  it("filters out invalid status values without throwing", () => {
    expect(searchToFilters({ status: "loved,bogus,liked" }).status).toEqual([
      "loved",
      "liked",
    ]);
  });

  it("parses axis key:value pairs", () => {
    expect(searchToFilters({ axis: "pace:5,mood:cozy" }).axis).toEqual([
      { key: "pace", value: "5" },
      { key: "mood", value: "cozy" },
    ]);
  });

  it("drops axis entries with no colon", () => {
    expect(searchToFilters({ axis: "pace:5,broken,mood:cozy" }).axis).toEqual([
      { key: "pace", value: "5" },
      { key: "mood", value: "cozy" },
    ]);
  });

  it("parses tags comma string", () => {
    expect(searchToFilters({ tags: "fantasy,cozy" }).tags).toEqual([
      "fantasy",
      "cozy",
    ]);
  });

  it("paused undefined → false; paused 1 → true", () => {
    expect(searchToFilters({}).paused).toBe(false);
    expect(searchToFilters({ paused: 1 }).paused).toBe(true);
  });
});

describe("filtersToSearch", () => {
  it("round-trips a representative input", () => {
    const input: LibrarySearch = {
      status: "loved,liked",
      tags: "fantasy,cozy",
      axis: "pace:5,mood:cozy",
    };
    expect(filtersToSearch(searchToFilters(input))).toEqual(input);
  });

  it("omits keys for empty arrays", () => {
    const out = filtersToSearch(emptyLibraryFilters);
    expect("status" in out).toBe(false);
    expect("tags" in out).toBe(false);
    expect("axis" in out).toBe(false);
  });

  it("omits keys for null values", () => {
    const out = filtersToSearch(emptyLibraryFilters);
    expect("format" in out).toBe(false);
    expect("author" in out).toBe(false);
    expect("rating" in out).toBe(false);
    expect("dateFrom" in out).toBe(false);
    expect("dateTo" in out).toBe(false);
    expect("paused" in out).toBe(false);
  });
});
