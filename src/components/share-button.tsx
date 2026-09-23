"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

/**
 * Share a link to this page's origin + `path`. Uses the device share sheet
 * when there is one (phones) and copies the link otherwise.
 */
export function ShareButton({
  path,
  title,
  label = "Compartir",
  className = "",
}: {
  path: string;
  title: string;
  label?: string;
  className?: string;
}) {
  const [done, setDone] = useState(false);

  async function share() {
    const url = `${window.location.origin}${path}`;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch {
      // Cerró la hoja de compartir o negó el portapapeles: nada que decir.
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className={`inline-flex items-center gap-1.5 text-[0.7rem] uppercase tracking-[0.12em] text-ink-soft transition-colors hover:text-pink-strong ${className}`}
    >
      {done ? (
        <>
          <Check size={13} strokeWidth={1.75} className="text-gold" /> Link copiado
        </>
      ) : (
        <>
          <Share2 size={13} strokeWidth={1.5} /> {label}
        </>
      )}
    </button>
  );
}
