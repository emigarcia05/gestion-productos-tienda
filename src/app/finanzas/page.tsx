import { permanentRedirect } from "next/navigation";

/**
 * La entrada del módulo Finanzas es Tesorería; no hay página de resumen en `/finanzas`.
 */
export default function FinanzasPage() {
  permanentRedirect("/finanzas/tesoreria");
}
