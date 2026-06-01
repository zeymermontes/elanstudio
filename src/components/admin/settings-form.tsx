"use client";

import { useActionState } from "react";
import { updateSettingsAction, type FormState } from "@/lib/actions/admin";
import { Field, StatusBanner, SaveButton, inputClass } from "./form-ui";
import type { SiteSettings } from "@/lib/site";

export function SettingsForm({ settings }: { settings: SiteSettings }) {
  const [state, action] = useActionState<FormState, FormData>(
    updateSettingsAction,
    null,
  );

  return (
    <form action={action} className="space-y-6">
      <StatusBanner state={state} />

      <div className="surface-card rounded-2xl px-7 py-7 shadow-soft">
        <h2 className="mb-5 font-serif text-2xl text-ink">Identidad</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre del estudio">
            <input
              name="studio_name"
              defaultValue={settings.studioName}
              className={inputClass}
            />
          </Field>
          <Field label="Tagline">
            <input
              name="tagline"
              defaultValue={settings.tagline}
              className={inputClass}
            />
          </Field>
        </div>
      </div>

      <div className="surface-card rounded-2xl px-7 py-7 shadow-soft">
        <h2 className="mb-1 font-serif text-2xl text-ink">Colores de marca</h2>
        <p className="mb-5 text-xs text-ink-soft">
          Estos colores se aplican a todo el sitio al guardar.
        </p>
        <div className="grid gap-5 sm:grid-cols-3">
          <ColorField label="Rosa principal" name="primary_color" value={settings.primaryColor} />
          <ColorField label="Dorado / acento" name="accent_color" value={settings.accentColor} />
          <ColorField label="Fondo (mármol)" name="bg_color" value={settings.bgColor} />
        </div>
      </div>

      <div className="surface-card rounded-2xl px-7 py-7 shadow-soft">
        <h2 className="mb-5 font-serif text-2xl text-ink">Contacto</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="WhatsApp">
            <input name="whatsapp" defaultValue={settings.whatsapp} className={inputClass} />
          </Field>
          <Field label="Email">
            <input name="email" defaultValue={settings.email} className={inputClass} />
          </Field>
          <Field label="Instagram (usuario)">
            <input name="instagram" defaultValue={settings.instagram} className={inputClass} />
          </Field>
          <Field label="Dirección / ciudad">
            <input name="address" defaultValue={settings.address} className={inputClass} />
          </Field>
        </div>
      </div>

      <SaveButton label="Guardar cambios" />
    </form>
  );
}

function ColorField({
  label,
  name,
  value,
}: {
  label: string;
  name: string;
  value: string;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-3">
        <input
          type="color"
          defaultValue={value}
          onChange={(e) => {
            const text = e.currentTarget
              .closest("div")
              ?.querySelector<HTMLInputElement>("input[type=text]");
            if (text) text.value = e.currentTarget.value;
          }}
          className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-line bg-surface"
        />
        <input
          type="text"
          name={name}
          defaultValue={value}
          className={inputClass}
        />
      </div>
    </Field>
  );
}
