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

  // En móvil el texto no cabe junto a Cerrar y Reservar: queda solo el ícono,
  // como botón redondo del mismo alto que los otros dos.
  return (
    <button
      type="button"
      onClick={share}
      aria-label={done ? "Link copiado" : label}
      title={done ? "Link copiado" : label}
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-line text-[0.7rem] uppercase tracking-[0.12em] text-ink-soft transition-colors hover:text-pink-strong h-10 w-10 sm:h-auto sm:w-auto sm:px-4 sm:py-2.5 ${className}`}
    >
      {done ? (
        <>
          <Check size={15} strokeWidth={1.75} className="text-gold" />
          <span className="hidden sm:inline">Link copiado</span>
        </>
      ) : (
        <>
          <Share2 size={15} strokeWidth={1.5} />
          <span className="hidden sm:inline">{label}</span>
        </>
      )}
    </button>
  );
}
