"use client";

import { useEffect } from "react";
import { Loader2, AlertTriangle } from "lucide-react";

/**
 * Branded confirmation modal with a loading state. Replaces the native
 * confirm() for destructive actions.
 */
export function ConfirmDialog({
  title = "¿Estás segura?",
  message,
  confirmLabel = "Eliminar",
  loadingLabel = "Eliminando…",
  loading = false,
  onConfirm,
  onCancel,
}: {
  title?: string;
  message: string;
  confirmLabel?: string;
  loadingLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  // Close on Escape (unless busy).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [loading, onCancel]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink/40"
        onClick={loading ? undefined : onCancel}
      />
      <div className="surface-card animate-in relative w-full max-w-sm rounded-2xl px-7 py-7 shadow-soft">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pink-soft/70">
            <AlertTriangle size={17} strokeWidth={1.75} className="text-pink-strong" />
          </span>
          <div>
            <h3 className="font-serif text-2xl text-ink">{title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
              {message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-full border border-line px-5 py-2.5 text-[0.75rem] uppercase tracking-[0.15em] text-ink-soft transition-colors hover:text-ink disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full bg-pink-strong px-6 py-2.5 text-[0.75rem] uppercase tracking-[0.15em] text-white shadow-soft transition-colors hover:bg-pink disabled:opacity-70"
          >
            {loading ? (
              <>
                <Loader2 size={14} strokeWidth={2} className="animate-spin" />
                {loadingLabel}
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
