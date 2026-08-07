"use server";

import { getCurrentUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolvePromotion } from "@/lib/promotions";
import type { Package } from "@/lib/types";

export type PromoCodeResult = {
  ok: boolean;
  /** Shown under the field when the code can't be used. */
  error?: string;
  /** Present on success — what the member will be charged. */
  applied?: {
    name: string;
    discountMxn: number;
    finalMxn: number;
    terms: string[];
  };
};

/**
 * Validates a promo code against a package for the signed-in member.
 *
 * This is only for showing the member what they'll pay before they type their
 * card. It is NOT the security boundary — /api/mp/process resolves the
 * promotion again from scratch when charging, so a forged response here can't
 * change the price.
 */
export async function applyPromoCodeAction(
  packageId: string,
  code: string,
): Promise<PromoCodeResult> {
  const trimmed = code.trim();
  if (!trimmed) return { ok: false, error: "Escribe un código." };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Inicia sesión para usar un código." };

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "No disponible por ahora." };

  const { data } = await admin
    .from("packages")
    .select("id, name, description, credits, price_mxn, validity_days, featured, active, recurring")
    .eq("id", packageId)
    .eq("active", true)
    .single();
  if (!data) return { ok: false, error: "Ese paquete ya no está disponible." };

  const pkg: Package = {
    id: data.id,
    name: data.name,
    description: data.description ?? "",
    credits: data.credits ?? 1,
    priceMxn: Number(data.price_mxn ?? 0),
    validityDays: data.validity_days ?? 30,
    featured: Boolean(data.featured),
    active: Boolean(data.active),
    recurring: Boolean(data.recurring),
  };

  if (pkg.recurring) {
    return { ok: false, error: "Los códigos no aplican al plan mensual." };
  }

  const applied = await resolvePromotion(admin, {
    pkg,
    userId: user.id,
    code: trimmed,
  });

  // Deliberately vague: enumerating *why* a code failed would let someone probe
  // for valid codes and for whether an account has purchased before.
  if (!applied) {
    return { ok: false, error: "Ese código no es válido para este paquete." };
  }

  return {
    ok: true,
    applied: {
      name: applied.promotion.name,
      discountMxn: applied.discountMxn,
      finalMxn: applied.finalMxn,
      terms: applied.terms,
    },
  };
}
