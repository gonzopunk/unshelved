import { useEffect } from "react";

export type KeyHandlers = {
  onDown: () => void;
  onUp: () => void;
  onOpen: () => void;
  onCopy: () => void;
  onExport: () => void;
  onHelp: () => void;
};

function isEditable(t: EventTarget | null) {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    t.isContentEditable
  );
}

export function useNotationsKeyboard(h: KeyHandlers, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditable(e.target)) return;
      switch (e.key) {
        case "j": e.preventDefault(); h.onDown(); break;
        case "k": e.preventDefault(); h.onUp(); break;
        case "o": e.preventDefault(); h.onOpen(); break;
        case "c": e.preventDefault(); h.onCopy(); break;
        case "e": e.preventDefault(); h.onExport(); break;
        case "?": e.preventDefault(); h.onHelp(); break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, h]);
}
