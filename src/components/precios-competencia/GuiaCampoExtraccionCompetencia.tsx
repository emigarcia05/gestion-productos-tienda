import { cn } from "@/lib/utils";

interface Props {
  /** Pasos numerados, en lenguaje simple. */
  pasos: string[];
  /** Tip final (ej. qué opción del menú Copiar usar). */
  tip?: string;
  className?: string;
}

/** Ayuda contextual bajo cada campo del formulario de extracción de precios. */
export default function GuiaCampoExtraccionCompetencia({ pasos, tip, className }: Props) {
  return (
    <div
      className={cn(
        "mt-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-2 text-xs text-muted-foreground",
        className
      )}
    >
      <p className="font-semibold text-foreground mb-1">¿Qué busco?</p>
      <ol className="list-decimal list-inside space-y-1">
        {pasos.map((paso, i) => (
          <li key={i}>{paso}</li>
        ))}
      </ol>
      {tip ? (
        <p className="mt-2 pt-2 border-t border-border text-foreground">
          <span className="font-semibold">Al copiar del inspector:</span> {tip}
        </p>
      ) : null}
    </div>
  );
}
