import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

export default function ChartCard({
  title,
  caption,
  hint,
  className = "",
  children,
}: {
  title: string;
  caption?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl bg-card shadow-paper p-5 flex flex-col ${className}`}
    >
      <header className="mb-3">
        <h2 className="font-display text-lg leading-tight">{title}</h2>
        {caption && (
          <p className="text-xs text-muted-foreground mt-0.5">{caption}</p>
        )}
      </header>
      <div className="flex-1 min-h-0">{children}</div>
      {hint && (
        <div className="mt-3 text-[11px] font-mono text-muted-foreground/80 flex items-center gap-1">
          <ChevronRight className="h-3 w-3" /> {hint}
        </div>
      )}
    </section>
  );
}

export function ChartEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="h-full min-h-[140px] flex items-center justify-center text-xs text-muted-foreground italic text-center px-4">
      {children}
    </div>
  );
}

export function DrillLink({
  to,
  search,
  children,
  className = "",
}: {
  to: string;
  search?: Record<string, unknown>;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link to={to} search={search as never} className={className}>
      {children}
    </Link>
  );
}
