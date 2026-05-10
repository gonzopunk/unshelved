// Helpers for building Library / Connections deep-link search params from charts.
import type { BookStatus, BookFormat } from "@/lib/queries";

export type LibraryLink = Partial<{
  q: string;
  status: BookStatus;
  format: BookFormat;
  author: string;
  tags: string;
  axis: string;
  rating: number;
  dateFrom: string;
  dateTo: string;
}>;

export const libraryLink = (s: LibraryLink) => ({
  to: "/library" as const,
  search: s as Record<string, unknown>,
});

export const weaveLink = (s: { month?: string; tag?: string }) => ({
  to: "/weave" as const,
  search: s as Record<string, unknown>,
});
