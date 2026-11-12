
- Session logging goes through one component (SessionLogDialog) with save rules in src/lib/session-log.ts and math in src/lib/session-math.ts — pure modules keep the rules unit-testable; minutes null and 0 both mean "no duration".
- Backdated starts are inferred in the pure session-log module from refreshed book history; time-of-day totals are computed in session-math so synthetic noon timestamps cannot skew rhythm statistics.
