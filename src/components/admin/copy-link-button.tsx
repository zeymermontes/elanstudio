"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";

/** Copies this site's origin + `path` to the clipboard, for a social post. */
export function CopyLinkButton({
  path,
  label = "Copiar link",
}: {
  path: string;
  label?: string;
}) {
  const [done, setDone] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch {
      window.prompt("Copia el link:", `${window.location.origin}${path}`);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1 text-[0.7rem] uppercase tracking-[0.12em] text-ink-soft transition-colors hover:text-pink-strong"
    >
      {done ? (
        <>
          <Check size={13} strokeWidth={1.75} className="text-gold" /> Copiado
        </>
      ) : (
        <>
          <Link2 size={13} strokeWidth={1.5} /> {label}
        </>
      )}
    </button>
  );
}
