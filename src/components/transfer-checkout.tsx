"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Landmark, Upload, Check, Loader2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { submitTransferAction } from "@/lib/actions/transfer";
import { RECEIPTS_BUCKET } from "@/lib/receipts";
import { formatMxn } from "@/lib/format";
import { PromoSection, type CheckoutPromo } from "@/components/promo-section";
import { trackPixel, packageParams } from "@/lib/pixel";

/**
 * Pago por transferencia: la alumna ve las cuentas del estudio, transfiere el
 * total y sube su comprobante. Al enviarlo, sus clases se acreditan al momento
 * (confiamos en ella) y la transferencia queda en Pagos para que el admin la
 * revise.
 *
 * El comprobante va directo del navegador al bucket privado `receipts`, a la
 * carpeta de la alumna — la política del bucket no la deja subir a otra —, y
 * la acción del servidor solo recibe la ruta.
 */
export function TransferCheckout({
  packageId,
  packageName,
  amount,
  accounts,
  initialPromo = null,
}: {
  packageId: string;
  packageName?: string;
  /** Precio de lista, antes de descuentos. */
  amount: number;
  /** Datos de las cuentas tal cual los escribió el admin. */
  accounts: string;
  initialPromo?: CheckoutPromo | null;
}) {
  const router = useRouter();
  const [promo, setPromo] = useState<CheckoutPromo | null>(initialPromo);
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [receiptPath, setReceiptPath] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const checkoutTracked = useRef(false);

  const total = promo?.finalMxn ?? amount;

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    // Pixel: subir el comprobante es el primer paso real del pago. Una vez
    // por checkout, aunque cambie el archivo.
    if (!checkoutTracked.current) {
      checkoutTracked.current = true;
      trackPixel(
        "InitiateCheckout",
        packageParams({ id: packageId, name: packageName, valueMxn: total }),
      );
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Los pagos aún no están disponibles.");
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Inicia sesión de nuevo para subir tu comprobante.");
      return;
    }

    setUploading(true);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(RECEIPTS_BUCKET)
      .upload(path, file, { upsert: false });
    setUploading(false);

    if (upErr) {
      setError(
        "No se pudo subir el comprobante. Prueba con una imagen o PDF de menos de 10 MB.",
      );
      return;
    }
    setReceiptPath(path);
    setFileName(file.name);
  }

  function submit() {
    if (!receiptPath) return;
    setError(null);
    startTransition(async () => {
      const res = await submitTransferAction({
        packageId,
        receiptPath,
        promoCode: appliedCode,
      });
      if (res.ok) {
        // Cuenta como compra desde ya: las clases se acreditan al momento y
        // el rechazo posterior es la excepción.
        trackPixel(
          "Purchase",
          packageParams({
            id: packageId,
            name: packageName,
            valueMxn: res.amountMxn ?? total,
          }),
          res.purchaseId,
        );
        router.push("/cuenta?pago=transferencia");
      } else setError(res.error ?? "No se pudo registrar tu pago.");
    });
  }

  return (
    <div>
      <PromoSection
        packageId={packageId}
        amount={amount}
        initialPromo={initialPromo}
        onChange={(p, c) => {
          setPromo(p);
          setAppliedCode(c);
        }}
      />

      {/* Cuentas */}
      <div className="rounded-xl border border-gold/40 bg-gold-soft/20 px-5 py-4">
        <p className="flex items-center gap-2 text-[0.7rem] uppercase tracking-luxe text-gold">
          <Landmark size={14} strokeWidth={1.5} /> Transfiere{" "}
          <span className="text-ink">{formatMxn(total)}</span> a
        </p>
        <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed text-ink">
          {accounts}
        </pre>
      </div>

      {/* Comprobante */}
      <div className="mt-5">
        <p className="text-sm text-ink-soft">
          Cuando hayas transferido, súbenos el comprobante (captura o PDF).
        </p>
        <label
          className={`mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-5 text-sm transition-colors ${
            receiptPath
              ? "border-gold/60 bg-gold-soft/20 text-ink"
              : "border-line text-ink-soft hover:border-pink hover:text-pink-strong"
          }`}
        >
          {uploading ? (
            <>
              <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
              Subiendo…
            </>
          ) : receiptPath ? (
            <>
              <Check size={16} strokeWidth={1.75} className="text-gold" />
              <span className="truncate">{fileName}</span>
              <span className="text-xs text-ink-soft">· cambiar</span>
            </>
          ) : (
            <>
              <Upload size={16} strokeWidth={1.5} /> Subir comprobante
            </>
          )}
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={onFile}
            disabled={uploading || pending}
            className="hidden"
          />
        </label>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl bg-pink-soft/60 px-4 py-3 text-sm text-pink-strong">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={submit}
        disabled={!receiptPath || uploading || pending}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-pink px-7 py-3 text-sm uppercase tracking-[0.18em] text-white shadow-soft transition-colors hover:bg-pink-strong disabled:opacity-50"
      >
        {pending ? (
          <>
            <Loader2 size={15} strokeWidth={2} className="animate-spin" />
            Registrando…
          </>
        ) : (
          "Ya transferí"
        )}
      </button>
      <p className="mt-3 text-center text-xs text-ink-soft">
        Tus clases quedan disponibles al momento. Revisamos la transferencia y
        te avisamos solo si algo no cuadra.
      </p>
    </div>
  );
}
