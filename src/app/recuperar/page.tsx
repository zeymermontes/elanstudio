import type { Metadata } from "next";
import { AuthCard } from "@/components/auth-card";
import { RequestResetForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function RecuperarPage() {
  return (
    <AuthCard
      title="Recupera tu contraseña"
      subtitle="Te enviaremos un enlace para crear una nueva"
    >
      <RequestResetForm />
    </AuthCard>
  );
}
