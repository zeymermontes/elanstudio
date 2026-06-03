import { requireStaff } from "@/lib/auth";
import { SellForm } from "@/components/admin/sell-form";

export const dynamic = "force-dynamic";

export default async function VenderPage() {
  await requireStaff();
  return (
    <div className="max-w-xl">
      <h1 className="font-serif text-4xl text-ink">Vender</h1>
      <p className="mt-1 mb-8 text-sm text-ink-soft">
        Agrega clases a una clienta de forma manual. Solo necesitas su correo.
      </p>
      <SellForm />
    </div>
  );
}
