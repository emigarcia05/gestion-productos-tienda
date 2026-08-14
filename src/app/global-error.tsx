"use client";

import { useEffect } from "react";
import { GP_ROUTES } from "@/lib/gestionProductosRoutes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import "./globals.css";

/**
 * Boundary GLOBAL: captura cualquier excepción no atrapada que ocurra durante el
 * render del root layout o de cualquier Server Component bajo `src/app/`.
 *
 * Sin este archivo, Next.js muestra el mensaje genérico:
 *   "An error occurred in the Server Components render. The specific message
 *    is omitted in production builds... A digest property is included..."
 *
 * Adicionalmente, loggeamos el `digest` (y el mensaje en local) para que el
 * error quede grepeable en Vercel Function Logs en lugar de quedar opaco.
 *
 * Notas obligatorias de Next.js para `global-error.tsx`:
 *  - DEBE ser Client Component.
 *  - DEBE renderizar sus propios `<html>` y `<body>` (reemplaza al root layout).
 *  - Se importa `globals.css` para poder usar tokens (`bg-background`, `border-border`, etc.).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const tag = "[global-error]";
    if (process.env.NODE_ENV === "production") {
      console.error(tag, "digest:", error.digest);
    } else {
      console.error(tag, error);
    }
  }, [error]);

  return (
    <html lang="es">
      <body
        className={cn(
          "m-0 min-h-screen flex items-center justify-center p-4",
          "bg-background font-sans text-foreground antialiased"
        )}
      >
        <div
          className={cn(
            "w-full max-w-[30rem] rounded-xl border border-border bg-card p-6 text-left shadow-sm"
          )}
        >
          <h1 className="m-0 text-lg font-semibold text-foreground">
            Algo salió mal
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ocurrió un error inesperado al renderizar la página. Reintentá la
            operación; si el problema persiste, contactá a soporte con el código
            indicado abajo.
          </p>
          {error.digest ? (
            <p className="mt-3 break-all font-mono text-xs text-muted-foreground">
              digest: {error.digest}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" onClick={() => reset()}>
              Reintentar
            </Button>
            <Button variant="outline" asChild>
              <a href={GP_ROUTES.defaultEntry}>Ir Al Inicio</a>
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
