"use client";

import { useState } from "react";
import { ImageIcon, Upload, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Image upload field. Uploads the chosen file to the public "images" Storage
 * bucket and stores the resulting public URL in a hidden input named `name`, so
 * the existing form actions (which expect a URL) keep working unchanged.
 */
export function ImageUploadField({
  name,
  label,
  folder,
  defaultValue = "",
}: {
  name: string;
  label: string;
  folder: string;
  defaultValue?: string;
}) {
  const [url, setUrl] = useState(defaultValue);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Backend no configurado.");
      return;
    }

    setUploading(true);
    setError(null);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("images")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (upErr) {
      setError("No se pudo subir la imagen. Intenta de nuevo.");
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("images").getPublicUrl(path);
    setUrl(data.publicUrl);
    setUploading(false);
  }

  return (
    <div>
      <span className="mb-1.5 block text-[0.7rem] uppercase tracking-[0.12em] text-ink-soft">
        {label}
      </span>
      <input type="hidden" name={name} value={url} />

      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-cream">
          {url ? (
            <img src={url} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon size={22} strokeWidth={1.25} className="text-ink-soft/50" />
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-full border border-gold/50 px-4 py-2 text-[0.7rem] uppercase tracking-[0.12em] text-ink transition-colors hover:border-gold hover:text-pink-strong">
            <Upload size={13} strokeWidth={1.5} />
            {uploading ? "Subiendo…" : url ? "Cambiar imagen" : "Subir imagen"}
            <input
              type="file"
              accept="image/*"
              onChange={onFile}
              disabled={uploading}
              className="hidden"
            />
          </label>
          {url ? (
            <button
              type="button"
              onClick={() => setUrl("")}
              className="inline-flex w-fit items-center gap-1.5 text-[0.7rem] uppercase tracking-[0.12em] text-ink-soft transition-colors hover:text-pink-strong"
            >
              <X size={12} strokeWidth={1.5} /> Quitar
            </button>
          ) : null}
          {error ? (
            <span className="text-xs text-pink-strong">{error}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
