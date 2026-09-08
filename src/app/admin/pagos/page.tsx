import { Landmark, CreditCard, ExternalLink } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatMxn, formatDayLabel, formatTime, cap } from "@/lib/format";
import { getStudioUtcOffset } from "@/lib/data";
import { PaymentsRealtime } from "@/components/admin/payments-realtime";
import { TransferReview } from "@/components/admin/transfer-review";
import { requireAdmin } from "@/lib/auth";
import { paymentRejectionMessage } from "@/lib/mp-errors";
import { RECEIPTS_BUCKET, RECEIPT_LINK_SECONDS } from "@/lib/receipts";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  user_id: string;
  amount_mxn: number;
  credits: number;
  status: string;
  method: string;
  receipt_path: string | null;
  reviewed_at: string | null;
  mp_status_detail: string | null;
  created_at: string;
  packages: { name: string } | { name: string }[] | null;
};

function pkgName(p: Row["packages"]): string {
  if (!p) return "—";
  return Array.isArray(p) ? (p[0]?.name ?? "—") : p.name;
}

const STATUS_LABEL: Record<string, string> = {
  approved: "Aprobado",
  pending: "Pendiente",
  rejected: "Rechazado",
  cancelled: "Cancelado",
};

export default async function AdminPagosPage() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  const offset = await getStudioUtcOffset();

  let rows: Row[] = [];
  const names = new Map<string, string>();
  // Enlaces firmados a los comprobantes: el bucket es privado y así el admin
  // los abre sin que la URL sirva para siempre.
  const receiptUrls = new Map<string, string>();

  if (supabase) {
    const { data } = await supabase
      .from("purchases")
      .select(
        "id, user_id, amount_mxn, credits, status, method, receipt_path, reviewed_at, mp_status_detail, created_at, packages(name)",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    rows = (data ?? []) as unknown as Row[];

    const ids = [...new Set(rows.map((r) => r.user_id))];
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ids);
      for (const p of profs ?? []) names.set(p.id, p.full_name);
    }

    const paths = rows
      .map((r) => r.receipt_path)
      .filter((p): p is string => !!p);
    if (admin && paths.length) {
      const { data: signed } = await admin.storage
        .from(RECEIPTS_BUCKET)
        .createSignedUrls(paths, RECEIPT_LINK_SECONDS);
      for (const s of signed ?? [])
        if (s.path && s.signedUrl) receiptUrls.set(s.path, s.signedUrl);
    }
  }

  const toReview = rows.filter(
    (r) => r.method === "transfer" && !r.reviewed_at && r.status !== "cancelled",
  );

  const when = (iso: string) =>
    `${cap(formatDayLabel(iso, offset))} · ${formatTime(iso, offset)}`;

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-serif text-4xl text-ink">Pagos</h1>
        <PaymentsRealtime />
      </div>
      <p className="mt-1 mb-8 text-sm text-ink-soft">
        Compras de paquetes con tarjeta (Mercado Pago) y por transferencia. La
        lista se actualiza en vivo.
      </p>

      {/* ---------- Transferencias por revisar ---------- */}
      {toReview.length > 0 ? (
        <section className="mb-10">
          <h2 className="mb-1 flex items-center gap-2 font-serif text-2xl text-ink">
            <Landmark size={18} strokeWidth={1.5} className="text-gold" />
            Transferencias por revisar
            <span className="ml-1 rounded-full bg-pink-strong px-2 py-0.5 text-[0.65rem] font-medium text-white">
              {toReview.length}
            </span>
          </h2>
          <p className="mb-4 text-xs text-ink-soft">
            Las clases ya están acreditadas. Abre el comprobante, compara con tu
            cuenta y confirma. Si no llegó, recházala y se le retiran.
          </p>
          <div className="space-y-3">
            {toReview.map((r) => (
              <article
                key={r.id}
                className="surface-card flex flex-col gap-4 rounded-2xl px-6 py-5 shadow-soft sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-serif text-xl text-ink">
                    {names.get(r.user_id) ?? "—"}
                  </p>
                  <p className="mt-1 text-sm text-ink-soft">
                    {pkgName(r.packages)} ·{" "}
                    <span className="text-ink">{formatMxn(Number(r.amount_mxn))}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-ink-soft">{when(r.created_at)}</p>
                  <ReceiptLink url={r.receipt_path ? receiptUrls.get(r.receipt_path) : undefined} />
                </div>
                <TransferReview
                  purchaseId={r.id}
                  status={r.status}
                  reviewed={false}
                  memberName={names.get(r.user_id) ?? "la alumna"}
                  credits={r.credits}
                />
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {/* ---------- Historial ---------- */}
      {rows.length === 0 ? (
        <p className="text-sm text-ink-soft">Aún no hay pagos registrados.</p>
      ) : (
        <div className="surface-card overflow-hidden rounded-2xl shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-line text-[0.65rem] uppercase tracking-[0.12em] text-ink-soft">
                <tr>
                  <th className="px-5 py-3">Miembro</th>
                  <th className="px-5 py-3">Paquete</th>
                  <th className="px-5 py-3">Monto</th>
                  <th className="px-5 py-3">Método</th>
                  <th className="px-5 py-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const transfer = r.method === "transfer";
                  return (
                    <tr key={r.id} className="border-b border-line/60 last:border-0 align-top">
                      <td className="px-5 py-3 text-ink">
                        {names.get(r.user_id) ?? "—"}
                        <p className="mt-0.5 text-xs text-ink-soft">{when(r.created_at)}</p>
                      </td>
                      <td className="px-5 py-3 text-ink-soft">{pkgName(r.packages)}</td>
                      <td className="px-5 py-3 text-ink-soft">
                        {formatMxn(Number(r.amount_mxn))}
                      </td>
                      <td className="px-5 py-3 text-ink-soft">
                        <span className="inline-flex items-center gap-1.5">
                          {transfer ? (
                            <Landmark size={13} strokeWidth={1.5} className="text-gold" />
                          ) : (
                            <CreditCard size={13} strokeWidth={1.5} className="text-gold" />
                          )}
                          {transfer ? "Transferencia" : "Tarjeta"}
                        </span>
                        {transfer ? (
                          <ReceiptLink
                            url={r.receipt_path ? receiptUrls.get(r.receipt_path) : undefined}
                          />
                        ) : null}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.1em] ${
                            r.status === "approved"
                              ? "bg-gold-soft/50 text-ink"
                              : r.status === "pending"
                                ? "bg-pink-soft/60 text-pink-strong"
                                : "bg-line text-ink-soft"
                          }`}
                        >
                          {STATUS_LABEL[r.status] ?? r.status}
                        </span>
                        {transfer && !r.reviewed_at && r.status !== "cancelled" ? (
                          <p className="mt-1.5 text-xs text-pink-strong">Por revisar</p>
                        ) : null}
                        {/* Why it failed, in the same words the member saw — so a
                            mistyped CVV and a bank block don't read as one problem. */}
                        {!transfer && r.status === "rejected" && r.mp_status_detail ? (
                          <p
                            className="mt-1.5 max-w-[22rem] text-xs text-ink-soft"
                            title={r.mp_status_detail}
                          >
                            {paymentRejectionMessage(r.mp_status_detail)}
                          </p>
                        ) : null}
                        {/* Una transferencia ya revisada se puede corregir. */}
                        {transfer && r.reviewed_at && r.status !== "cancelled" ? (
                          <div className="mt-2">
                            <TransferReview
                              purchaseId={r.id}
                              status={r.status}
                              reviewed
                              memberName={names.get(r.user_id) ?? "la alumna"}
                              credits={r.credits}
                            />
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ReceiptLink({ url }: { url: string | undefined }) {
  if (!url)
    return <p className="mt-1.5 text-xs text-ink-soft/70">Sin comprobante</p>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1.5 inline-flex items-center gap-1 text-xs text-pink-strong underline underline-offset-2"
    >
      Ver comprobante <ExternalLink size={11} strokeWidth={1.75} />
    </a>
  );
}
