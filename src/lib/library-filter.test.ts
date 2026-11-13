import { describe, it, expect } from "vitest";
import {
  filterLibrary,
  searchToFilters,
  filtersToSearch,
  emptyLibraryFilters,
  type LibrarySearch,
} from "./library-filter";

type FilterInput = Parameters<typeof filterLibrary>[0];

const shelf = (rating: number | string | null) =>
  ({
    id: "b1",
    title: "Pachinko",
    author: "Min Jin Lee",
    user_books: [{ rating }],
  }) as unknown as FilterInput[number];

const ctx = { bookTags: {}, bookAxes: {} };

const match = (rating: number, bookRating: number | string | null) =>
  filterLibrary([shelf(bookRating)], searchToFilters({ rating }), ctx).length;

describe("filterLibrary rating filter", () => {
  it("matches a half-star 4.5 under rating=5, the same bin the chart uses", () => {
    expect(match(5, 4.5)).toBe(1);
    expect(match(4, 4.5)).toBe(0);
  });

  it("matches 4.3 under rating=4", () => {
    expect(match(4, 4.3)).toBe(1);
  });

  it("matches an exact whole rating", () => {
    expect(match(4, 4)).toBe(1);
    expect(match(5, 4)).toBe(0);
  });

  it("matches numeric ratings that arrive from the database as strings", () => {
    expect(match(5, "4.5")).toBe(1);
    expect(match(4, "4.0")).toBe(1);
  });

  it("excludes books with no rating", () => {
    expect(match(4, null)).toBe(0);
  });
});

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
