"use client";

import { ArrowDown, ArrowUp, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fmtPorcentajeTabla } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DescuentoActivoListaPrecio, FilaListaPrecioParaCliente } from "@/services/listaPrecios.service";

const DESCUENTO_INLINE_ICON_CLASS = "h-2.5 w-2.5 shrink-0 opacity-80";

function fmtValorDescuentoTabla(valor: number): string {
  return fmtPorcentajeTabla(valor) || "—";
}

function fmtDescuentosActivosTitulo(
  marca: string,
  descuentos: DescuentoActivoListaPrecio[]
): string {
  const partes = [
    marca,
    ...descuentos.map((d) => `${d.label} ${fmtValorDescuentoTabla(d.valor)}`),
  ].filter(Boolean);
  return partes.join(" · ");
}

export default function SublineaDescuentosListaPrecios({
  fila,
  marca,
  onVerRegla,
}: {
  fila: FilaListaPrecioParaCliente;
  marca: string;
  onVerRegla: (descuento: DescuentoActivoListaPrecio, codExt: string) => void;
}) {
  const descuentosActivos = fila.descuentosActivos ?? [];

  const titulo = fmtDescuentosActivosTitulo(marca, descuentosActivos);

  return (
    <div
      className="lista-precios-sublinea-descuentos celda-sublinea-tabla leading-none tabular-nums"
      title={titulo}
    >
      {marca ? (
        <span className="lista-precios-sublinea-marca truncate font-medium">{marca}</span>
      ) : null}
      {descuentosActivos.length > 0 ? (
        <div className="lista-precios-sublinea-descuentos-lista">
          {descuentosActivos.map((descuento) => {
            const Icon = descuento.tipo === "descuento" ? ArrowDown : ArrowUp;
            return (
              <span key={descuento.campo} className="lista-precios-sublinea-descuento-item">
                <span className="lista-precios-sublinea-descuento-valor">
                  <Icon className={DESCUENTO_INLINE_ICON_CLASS} aria-hidden />
                  <span className="truncate">{descuento.etiquetaCorta}</span>
                  <span className="shrink-0">{fmtValorDescuentoTabla(descuento.valor)}</span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "lista-precios-sublinea-regla-btn",
                    "h-4 w-4 shrink-0 rounded-sm text-primary hover:bg-primary/10 hover:text-primary"
                  )}
                  aria-label={`Ver regla de ${descuento.label}`}
                  onClick={() => onVerRegla(descuento, fila.codExt)}
                >
                  <Info className="h-3 w-3" aria-hidden />
                </Button>
              </span>
            );
          })}
        </div>
      ) : marca ? null : (
        <span className="text-muted-foreground">Sin descuentos activos</span>
      )}
    </div>
  );
}
