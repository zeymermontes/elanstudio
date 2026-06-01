import { getSettings } from "@/lib/data";
import { SettingsForm } from "@/components/admin/settings-form";

export const dynamic = "force-dynamic";

export default async function AjustesPage() {
  const settings = await getSettings();
  return (
    <div>
      <h1 className="font-serif text-4xl text-ink">Marca & Ajustes</h1>
      <p className="mt-1 mb-8 text-sm text-ink-soft">
        Configura el nombre, los colores y el contacto de {settings.studioName}.
      </p>
      <SettingsForm settings={settings} />
    </div>
  );
}
