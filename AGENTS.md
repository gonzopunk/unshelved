
- Session logging goes through one component (SessionLogDialog) with save rules in src/lib/session-log.ts and math in src/lib/session-math.ts — pure modules keep the rules unit-testable; minutes null and 0 both mean "no duration".
