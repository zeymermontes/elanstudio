import type { Metadata } from "next";
import { AuthCard } from "@/components/auth-card";
import { UpdatePasswordForm } from "@/components/auth-forms";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default async function RestablecerPage() {
  // The recovery link (via /auth/confirm) establishes a session before landing here.
  await requireUser("/restablecer");
  return (
    <AuthCard
      title="Crea una nueva contraseña"
      subtitle="Elige una contraseña para tu cuenta"
    >
      <UpdatePasswordForm />
    </AuthCard>
  );
}
