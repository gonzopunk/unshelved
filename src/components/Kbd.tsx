import { useEffect, useState } from "react";

export function useIsMac() {
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform));
  }, []);
  return isMac;
}

export function Kbd({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={`inline-flex items-center justify-center rounded border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground leading-none ${className}`}
    >
      {children}
    </kbd>
  );
}
