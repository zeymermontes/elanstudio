import type { Metadata } from "next";
import { AuthCard } from "@/components/auth-card";
import { SignUpForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegistroPage() {
  return (
    <AuthCard
      title="Crea tu cuenta"
      subtitle="Únete a ÉLANSTUDIO y empieza a reservar"
    >
      <SignUpForm />
    </AuthCard>
  );
}
