/**
 * Limited-run packages: how many of a capped package are still available.
 *
 * Everything here runs server-side with the service-role client. Counting what
 * everyone has bought means reading every purchase, and RLS deliberately limits
 * a member to their own rows — so the anon client can't answer this question.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Package } from "./types";

/** The only three fields availability depends on. */
export type Stockable = Pick<Package, "id" | "recurring" | "stockLimit">;

export type PackageStock = {
  limit: number;
  sold: number;
  left: number;
  soldOut: boolean;
};

/**
 * What counts as a taken spot for a one-time package: pending as well as
 * approved. A card still settling holds its place — the same rule the promotion
 * caps use (see src/lib/promotions.ts) — so a run of 20 can't be oversold while
 * payments clear.
 */
const PURCHASE_HELD = ["pending", "approved"];

/**
 * And for a monthly plan: only subscriptions that actually exist. A 'pending'
 * one is just someone who pressed "Suscribirme" and was sent to Mercado Pago;
 * most never authorize, and holding a spot for each would retire a capped plan
 * without a single member joining. A cancellation frees the spot, which is what
 * a capped membership should do.
 */
const SUB_HELD = ["authorized", "paused"];

/**
 * Availability of one package, or null when it has no cap.
 *
 * The count-then-charge sequence isn't atomic: two members racing for the last
 * spot can both get through. That's the same trade the promotion caps make, and
 * for a studio selling in the tens it beats locking the table on every render.
 */
export async function resolveStock(
  admin: SupabaseClient,
  pkg: Stockable,
): Promise<PackageStock | null> {
  const limit = pkg.stockLimit;
  if (limit == null || limit <= 0) return null;

  const { count } = pkg.recurring
    ? await admin
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("package_id", pkg.id)
        .in("status", SUB_HELD)
    : await admin
        .from("purchases")
        .select("id", { count: "exact", head: true })
        .eq("package_id", pkg.id)
        .in("status", PURCHASE_HELD);

  const sold = count ?? 0;
  const left = Math.max(0, limit - sold);
  return { limit, sold, left, soldOut: left === 0 };
}

/**
 * Availability for a list of packages, keyed by id. Uncapped packages are
 * absent from the map, so `map.get(id)?.soldOut` reads false for them.
 *
 * Resolves each package separately rather than tallying one big query: only the
 * capped ones hit the DB at all, and the catalog is a handful of rows.
 */
export async function resolveStockFor(
  admin: SupabaseClient,
  packages: Stockable[],
): Promise<Map<string, PackageStock>> {
  const entries = await Promise.all(
    packages.map(
      async (pkg) => [pkg.id, await resolveStock(admin, pkg)] as const,
    ),
  );
  return new Map(
    entries.filter((e): e is [string, PackageStock] => e[1] !== null),
  );
}

/** "Quedan 3 lugares" — how the remaining spots are announced to a member. */
export function stockLabel(stock: PackageStock): string {
  return stock.left === 1 ? "Queda 1 lugar" : `Quedan ${stock.left} lugares`;
}
