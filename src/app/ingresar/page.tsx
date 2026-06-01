import type { Metadata } from "next";
import { AuthCard } from "@/components/auth-card";
import { SignInForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Ingresar" };

export default async function IngresarPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  return (
    <AuthCard title="Bienvenida de nuevo" subtitle="Ingresa para reservar tus clases">
      {error === "confirm" ? (
        <p className="mb-4 rounded-xl bg-pink-soft/60 px-4 py-3 text-sm text-pink-strong">
          El enlace de confirmación no es válido o ya expiró. Intenta ingresar o
          solicita uno nuevo.
        </p>
      ) : null}
      <SignInForm next={next ?? "/cuenta"} />
    </AuthCard>
  );
}
