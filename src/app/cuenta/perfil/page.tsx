import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ProfileEditForm } from "@/components/profile-edit-form";

export const metadata: Metadata = { title: "Mi información" };
export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  if (!isSupabaseConfigured()) redirect("/cuenta");

  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/cuenta");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/ingresar?next=/cuenta/perfil");

  const { data: p } = await supabase
    .from("profiles")
    .select("birth_date, injuries, health_conditions, notes")
    .eq("id", user.id)
    .single();

  return (
    <div className="mx-auto max-w-xl px-5 py-14">
      <Link
        href="/cuenta"
        className="mb-6 inline-flex items-center gap-2 text-[0.75rem] uppercase tracking-[0.15em] text-ink-soft transition-colors hover:text-pink-strong"
      >
        <ArrowLeft size={14} strokeWidth={1.5} /> Mi cuenta
      </Link>

      <h1 className="font-serif text-4xl text-ink">Mi información</h1>
      <p className="mt-1 mb-8 text-sm text-ink-soft">
        Mantén tu información al día para que podamos cuidarte mejor. Guardamos
        un registro de los cambios.
      </p>

      <ProfileEditForm
        birthDate={p?.birth_date ?? ""}
        injuries={p?.injuries ?? ""}
        health={p?.health_conditions ?? ""}
        notes={p?.notes ?? ""}
      />
    </div>
  );
}
