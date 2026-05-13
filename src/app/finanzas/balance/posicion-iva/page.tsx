import { redirect } from "next/navigation";

/** URL canónica bajo el módulo FINANZAS (sidebar). */
export default function BalancePosicionIvaLegacyRedirectPage() {
  redirect("/finanzas/posicion-iva");
}
