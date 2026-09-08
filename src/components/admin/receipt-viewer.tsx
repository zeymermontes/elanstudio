"use client";

import { useEffect, useState } from "react";
import { FileText, X, ExternalLink } from "lucide-react";

/**
 * Abre el comprobante de una transferencia sin salir del panel: una ventana
 * flotante con la imagen, o el PDF embebido. El enlace firmado sigue estando
 * abajo por si el admin quiere descargarlo o verlo a pantalla completa.
 */
export function ReceiptViewer({
  url,
  isPdf,
  memberName,
}: {
  url: string;
  isPdf: boolean;
  memberName: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1.5 inline-flex items-center gap-1 text-xs text-pink-strong underline underline-offset-2"
      >
        <FileText size={11} strokeWidth={1.75} /> Ver comprobante
      </button>

      {open ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} />
          <div className="surface-card animate-in relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl shadow-soft">
            <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3">
              <div className="min-w-0">
                <p className="text-[0.65rem] uppercase tracking-luxe text-gold">
                  Comprobante
                </p>
                <p className="truncate font-serif text-lg text-ink">{memberName}</p>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[0.7rem] uppercase tracking-[0.12em] text-ink-soft transition-colors hover:text-pink-strong"
                >
                  Abrir <ExternalLink size={11} strokeWidth={1.75} />
                </a>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar"
                  className="text-ink"
                >
                  <X size={20} strokeWidth={1.5} />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-cream">
              {isPdf ? (
                <iframe
                  src={url}
                  title={`Comprobante de ${memberName}`}
                  className="h-[80vh] w-full"
                />
              ) : (
                <img
                  src={url}
                  alt={`Comprobante de ${memberName}`}
                  className="mx-auto block max-h-[80vh] w-auto max-w-full object-contain"
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
