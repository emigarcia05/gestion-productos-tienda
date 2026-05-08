"use client";

import { useEffect } from "react";

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
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f6f7f8",
          color: "#0f172a",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: 480,
            width: "calc(100% - 2rem)",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: "1.5rem 1.5rem 1.25rem",
            boxShadow:
              "0 1px 2px 0 rgba(0,0,0,0.04), 0 1px 3px 0 rgba(0,0,0,0.06)",
            textAlign: "left",
          }}
        >
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
            Algo salió mal
          </h1>
          <p style={{ marginTop: 8, fontSize: 14, color: "#475569" }}>
            Ocurrió un error inesperado al renderizar la página. Reintentá la
            operación; si el problema persiste, contactá a soporte con el código
            indicado abajo.
          </p>
          {error.digest ? (
            <p
              style={{
                marginTop: 12,
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                fontSize: 12,
                color: "#334155",
                wordBreak: "break-all",
              }}
            >
              digest: {error.digest}
            </p>
          ) : null}
          <div
            style={{
              marginTop: 16,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => reset()}
              style={{
                cursor: "pointer",
                padding: "0.5rem 0.875rem",
                fontSize: 14,
                fontWeight: 500,
                color: "#ffffff",
                background: "#0072bb",
                border: "1px solid #0072bb",
                borderRadius: 8,
              }}
            >
              Reintentar
            </button>
            <a
              href="/gestion-productos/proveedores"
              style={{
                padding: "0.5rem 0.875rem",
                fontSize: 14,
                fontWeight: 500,
                color: "#0f172a",
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: 8,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              Ir al inicio
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
