"use client";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { fmtPorcentajeTabla } from "@/lib/format";
import {
  fmtCondicionesReglaDescuento,
  labelCampoReglaDescuento,
} from "@/lib/descuentosListaPrecioReglasUi";
import type { DescuentoActivoListaPrecio } from "@/services/listaPrecios.service";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  descuento: DescuentoActivoListaPrecio | null;
  codExt?: string;
}

export default function ReglaDescuentoItemListaPreciosModal({
  open,
  onOpenChange,
  descuento,
  codExt,
}: Props) {
  const titulo = descuento ? labelCampoReglaDescuento(descuento.campo) : "Regla De Descuento";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppModal
        size="sm"
        padding="sm"
        title={titulo}
        actions={
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        }
      >
        {!descuento ? (
          <p className="text-sm text-muted-foreground">Sin datos de descuento.</p>
        ) : (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
            {codExt ? (
              <>
                <dt className="font-medium text-foreground">Cód. Ext.</dt>
                <dd className="celda-mono tabular-nums">{codExt}</dd>
              </>
            ) : null}
            <dt className="font-medium text-foreground">Valor</dt>
            <dd className="tabular-nums">{fmtPorcentajeTabla(descuento.valor)}</dd>
            {descuento.regla ? (
              <>
                <dt className="font-medium text-foreground">Condiciones</dt>
                <dd>{fmtCondicionesReglaDescuento(descuento.regla)}</dd>
                <dt className="font-medium text-foreground">Especificidad</dt>
                <dd className="tabular-nums">{descuento.regla.especificidad}</dd>
              </>
            ) : (
              <>
                <dt className="font-medium text-foreground">Regla</dt>
                <dd className="text-muted-foreground">
                  No se encontró la regla que genera este valor.
                </dd>
              </>
            )}
          </dl>
        )}
      </AppModal>
    </Dialog>
  );
}
