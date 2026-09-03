import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { ConfirmForm } from "@/components/confirm-form";

export const metadata: Metadata = { title: "Confirmar" };
export const dynamic = "force-dynamic";

/**
 * Destino de los enlaces de los correos de autenticación (alta, magic link,
 * cambio de correo, recuperación). Sirve de antesala: enseña un botón y deja
 * que confirmEmailAction consuma el token al apretarlo.
 *
 * Antes se verificaba aquí mismo, al cargar. El token es de un solo uso, y los
 * filtros de seguridad del correo abren los enlaces al entregar el mensaje, así
 * que Outlook y compañía lo gastaban antes de que nadie lo tocara: la persona
 * llegaba y el enlace ya estaba usado. Un escáner carga páginas, no aprieta
 * botones.
 */
const COPY: Record<
  string,
  { title: string; subtitle: string; label: string }
> = {
  email: {
    title: "Confirma tu correo",
    subtitle: "Un paso más y tu cuenta queda lista.",
    label: "Confirmar mi cuenta",
  },
  email_change: {
    title: "Confirma tu nuevo correo",
    subtitle: "Con esto quedará como tu correo de acceso.",
    label: "Confirmar el cambio",
  },
  recovery: {
    title: "Restablece tu contraseña",
    subtitle: "Continúa para elegir una contraseña nueva.",
    label: "Continuar",
  },
};

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; next?: string }>;
}) {
  const { token_hash, type, next } = await searchParams;
  if (!token_hash || !type) redirect("/ingresar?error=confirm");

  const copy = COPY[type] ?? COPY.email;

  return (
    <AuthCard title={copy.title} subtitle={copy.subtitle}>
      <ConfirmForm
        tokenHash={token_hash}
        type={type}
        next={next ?? "/cuenta"}
        label={copy.label}
      />
    </AuthCard>
  );
}
