import type { BookStatus, BookFormat } from "@/lib/queries";

export type ImportSource =
  | "goodreads"
  | "storygraph"
  | "generic"
  | "paste";

export type ImportRow = {
  uid: string;
  title: string;
  author: string | null;
  isbn: string | null;
  format: BookFormat;
  status: BookStatus;
  rating: number | null;        // 0–5 scale, null = unknown
  totalPages: number | null;
  currentPage: number | null;
  startedAt: string | null;     // ISO
  finishedAt: string | null;
  tags: string[];
  note: string | null;
  // enrichment
  coverUrl: string | null;
  coverColor: string | null;
  coverSecondaryColor: string | null;
  coverTextColor: string | null;
  bookmarkColor: string | null;
  enrichTried: boolean;
  // review-time
  selected: boolean;
  duplicate: boolean;
  matchedBookId: string | null;
};

export type FieldKey =
  | "title" | "author" | "isbn" | "format" | "status" | "rating"
  | "totalPages" | "currentPage" | "startedAt" | "finishedAt"
  | "tags" | "note";

export const FIELD_LABELS: Record<FieldKey, string> = {
  title: "Title",
  author: "Author",
  isbn: "ISBN",
  format: "Format",
  status: "Shelf",
  rating: "Rating (0–5)",
  totalPages: "Total pages",
  currentPage: "Current page",
  startedAt: "Started date",
  finishedAt: "Finished date",
  tags: "Tags / shelves",
  note: "Notes / review",
};

export type ColumnMap = Partial<Record<FieldKey, string>>;
