import type { ScheduleRef } from "./types";

/**
 * Compact string encoding for a schedule booking reference, so it can travel
 * through a URL/param. `s:<sessionId>` for a concrete session, `w:<weeklyId>:<date>`
 * for a virtual template slot. Plain module — usable on client and server.
 */
export function encodeRef(ref: ScheduleRef): string {
  return ref.kind === "session"
    ? `s:${ref.sessionId}`
    : `w:${ref.weeklyId}:${ref.date}`;
}

export function decodeRef(s: string): ScheduleRef | null {
  if (s.startsWith("s:")) {
    const id = s.slice(2);
    return id ? { kind: "session", sessionId: id } : null;
  }
  if (s.startsWith("w:")) {
    const [, weeklyId, date] = s.split(":");
    if (weeklyId && date) return { kind: "weekly", weeklyId, date };
  }
  return null;
}
