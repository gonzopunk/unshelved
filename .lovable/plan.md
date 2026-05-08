# Make ⌘K Discoverable

Replace the bare search icon in the top nav with a labeled "search pill" that always shows the keyboard shortcut, and add a small hint row at the bottom of the command palette so the shortcut keeps reinforcing itself.

## Changes

### 1. Search pill in the top nav (`src/routes/_authenticated.tsx`)
Replace the current icon-only search button with a wider pill button:

```text
[ 🔍  Search…                    ⌘K ]
```

- Sits in the same nav slot, between the Connections nav item and the Add book button.
- Muted background, subtle border, hover state matches existing nav pills.
- Right side shows `⌘K` (Mac) or `Ctrl K` (Win/Linux) in a small `kbd`-styled chip — detect platform once via `navigator.platform`.
- On narrow viewports (mobile, < ~640px) it collapses back to just the icon to preserve nav space; tapping still opens the palette.
- Same `onClick` and `aria-label` wiring as today; the existing ⌘K global keydown handler is unchanged.

### 2. Footer hint inside the palette (`src/components/CommandPalette.tsx`)
Add a thin footer row below the `CommandList`, inside the dialog:

```text
↵ open    esc close    ⌘K toggle anywhere
```

- Uses muted text + `kbd` chips, same platform detection as the nav pill.
- Always visible regardless of search state.

### 3. Small style helper
Either inline Tailwind classes or a tiny `Kbd` component in `src/components/ui/` rendering `<kbd>` with the project's existing border/muted tokens — no new design tokens required.

## Out of scope
- No first-run toast.
- No Settings → Shortcuts page.
- No new shortcuts beyond the existing ⌘K.
