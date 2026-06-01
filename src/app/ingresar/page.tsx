import type { Metadata } from "next";
import { AuthCard } from "@/components/auth-card";
import { SignInForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Ingresar" };

export default async function IngresarPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <AuthCard title="Bienvenida de nuevo" subtitle="Ingresa para reservar tus clases">
      <SignInForm next={next ?? "/cuenta"} />
    </AuthCard>
  );
}
