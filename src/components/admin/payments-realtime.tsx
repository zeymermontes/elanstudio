"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Radio } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Toast = { id: number; text: string };

/**
 * Live updates for the admin Pagos screen. Subscribes to changes on the
 * `purchases` table via Supabase Realtime; when a payment is created or
 * approved it plays a chime, shows a toast, and refreshes the server-rendered
 * table. Renders an "En vivo" indicator. No-op when Supabase isn't configured.
 */
export function PaymentsRealtime() {
  const router = useRouter();
  const [live, setLive] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const toastId = useRef(0);

  // Build the AudioContext lazily and unlock it on the first user gesture
  // (browsers block audio until the user interacts with the page).
  useEffect(() => {
    function unlock() {
      if (!audioCtxRef.current) {
        const Ctor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        if (Ctor) audioCtxRef.current = new Ctor();
      }
      audioCtxRef.current?.resume();
    }
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  function chime() {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    // Two soft notes — a gentle "ding-dong".
    [880, 1175].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.42);
    });
  }

  function pushToast(text: string) {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000);
  }

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    const channel = supabase
      .channel("admin-purchases")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "purchases" },
        (payload) => {
          const row = payload.new as { status?: string } | null;
          const approved =
            (payload.eventType === "UPDATE" || payload.eventType === "INSERT") &&
            row?.status === "approved";

          if (approved) {
            chime();
            pushToast("💸 ¡Nuevo pago recibido!");
          }
          // Always refresh so the table reflects the latest state.
          router.refresh();
        },
      )
      .subscribe((status) => setLive(status === "SUBSCRIBED"));

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <span className="inline-flex items-center gap-1.5 text-[0.65rem] uppercase tracking-[0.12em]">
        <Radio
          size={13}
          strokeWidth={1.5}
          className={live ? "text-pink" : "text-ink-soft/50"}
        />
        <span className={live ? "text-pink-strong" : "text-ink-soft/60"}>
          {live ? "En vivo" : "Sin conexión"}
        </span>
      </span>

      <div className="pointer-events-none fixed bottom-6 right-6 z-50 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="surface-card animate-in rounded-xl border-l-2 border-pink px-5 py-3 text-sm text-ink shadow-soft"
          >
            {t.text}
          </div>
        ))}
      </div>
    </>
  );
}
