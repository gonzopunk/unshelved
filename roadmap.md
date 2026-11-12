# Roadmap
- [x] Unified SessionLogDialog (home / book / sessions tab)
  - null AND 0 minutes = "no duration" everywhere
  - "Reading now" uses the currently selected book
  - ETA: date-based only with >=3 distinct session days, else pace, else none
  - "today" compared in local timezone
- [x] Restrict correction prompts to today's logs and infer backdated starts from history
- [x] Mark date-only sessions, exclude them from time-of-day totals, and hide fabricated timestamps
- [x] Verify backdated saving and add regression tests
