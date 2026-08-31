"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleSessionFeaturedAction } from "@/lib/actions/admin";

/**
 * Flip "announce on the landing page" for an already-created one-off event.
 * Without it a forgotten checkbox could only be fixed by deleting the event —
 * which would drop everyone already booked.
 */
export function EventFeaturedToggle({
  sessionId,
  featured,
}: {
  sessionId: string;
  featured: boolean;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <label className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.12em] text-ink-soft">
      <input
        type="checkbox"
        checked={featured}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.checked;
          start(async () => {
            await toggleSessionFeaturedAction(sessionId, next);
            router.refresh();
          });
        }}
        className="accent-pink"
      />
      En portada
    </label>
  );
}
