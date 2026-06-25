"use client";

import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AppModal from "@/components/shared/AppModal";
import {
  guardarIvaComparacionPedidoAction,
  type EstadoIvaComparacionPedido,
} from "@/actions/finBalPosicionIvaComparacionPedido";
import { modoComparacionCostoDesdeSaldo } from "@/lib/precioComparacionPedidoUrgenteReposicion";
import { fmtPrecio } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  puedeEditar: boolean;
  estadoInicial: EstadoIvaComparacionPedido;
  onActualizado?: () => void;
}

function parsePesosEnteroSaldo(raw: string): number | null {
  const s = raw.trim();
  if (s === "") return null;
  const neg = s.startsWith("-");
  const digitsOnly = s.replace(/[^\d]/g, "");
  if (!digitsOnly) return null;
  let v = parseInt(digitsOnly, 10);
  if (neg) v = -v;
  return Number.isFinite(v) ? v : null;
}

function pesosEnterosToInput(saldo: number): string {
  if (!Number.isFinite(saldo) || saldo === 0) return "";
  return String(Math.trunc(saldo));
}

function etiquetaToolbar(estado: EstadoIvaComparacionPedido): string {
  const saldo = estado.saldoEfectivoComparacion;
  const modo = modoComparacionCostoDesdeSaldo(saldo);
  const modoTxt = modo === "SIN_IVA" ? "SIN IVA" : "CON IVA";
  const origen = estado.usarValorConfigurado ? "CFG" : "AUTO";
  const monto =
    saldo === 0
      ? "$0"
      : saldo < 0
        ? `$-${fmtPrecio(Math.abs(saldo))}`
        : `$${fmtPrecio(saldo)}`;
  return `IVA CMP. ${monto} · ${modoTxt} (${origen})`;
}

export default function ConfigurarIvaComparacionPedidosControl({
  puedeEditar,
  estadoInicial,
  onActualizado,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [estado, setEstado] = useState(estadoInicial);
  const [usarConfigurado, setUsarConfigurado] = useState(estadoInicial.usarValorConfigurado);
  const [saldoInput, setSaldoInput] = useState(() =>
    pesosEnterosToInput(estadoInicial.saldoPesosConfigurado)
  );

  const estadoToolbar = open ? estado : estadoInicial;
  const labelBoton = etiquetaToolbar(estadoToolbar);

  function handleOpen(next: boolean) {
    if (next) {
      setEstado(estadoInicial);
      setUsarConfigurado(estadoInicial.usarValorConfigurado);
      setSaldoInput(pesosEnterosToInput(estadoInicial.saldoPesosConfigurado));
    }
    setOpen(next);
  }

  const handleGuardar = useCallback(() => {
    if (usarConfigurado) {
      const saldo = parsePesosEnteroSaldo(saldoInput);
      if (saldo === null) {
        toast.error("Ingresá el saldo IVA configurado (puede ser negativo).");
        return;
      }
      startTransition(async () => {
        const result = await guardarIvaComparacionPedidoAction({
          usarValorConfigurado: true,
          saldoPesos: saldo,
        });
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        setEstado(result.data);
        toast.success("Comparación de pedidos actualizada.");
        setOpen(false);
        onActualizado?.();
      });
      return;
    }

    startTransition(async () => {
      const result = await guardarIvaComparacionPedidoAction({
        usarValorConfigurado: false,
        saldoPesos: estadoInicial.saldoPesosConfigurado,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setEstado(result.data);
      toast.success("Se usa el acumulado automático de Posición IVA.");
      setOpen(false);
      onActualizado?.();
    });
  }, [usarConfigurado, saldoInput, estadoInicial.saldoPesosConfigurado, onActualizado]);

  if (!puedeEditar) {
    return (
      <Button
        type="button"
        variant="default"
        size="default"
        className="btn-primario-gestion shrink-0 tabular-nums pointer-events-none max-w-[22rem] truncate"
        tabIndex={-1}
        title={labelBoton}
        aria-label={labelBoton}
      >
        {labelBoton}
      </Button>
    );
  }

  const modoEfectivoPreview = usarConfigurado
    ? modoComparacionCostoDesdeSaldo(parsePesosEnteroSaldo(saldoInput) ?? 0)
    : modoComparacionCostoDesdeSaldo(estadoInicial.saldoAcumuladoCalculado);

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="default"
          size="default"
          className="btn-primario-gestion shrink-0 gap-2 tabular-nums max-w-[22rem]"
          title={labelBoton}
        >
          <Settings2 className="h-4 w-4 shrink-0" aria-hidden />
          <span className="truncate">{labelBoton}</span>
        </Button>
      </DialogTrigger>
      <AppModal
        title="Configurar IVA Comparación Pedidos"
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleGuardar} disabled={pending} className="gap-2 min-w-[7.5rem]">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Define qué saldo IVA usa el sistema para elegir el proveedor más barato en Pedido Urgente y
            Reposición. Si el saldo es <strong className="text-foreground font-medium">mayor a 0</strong>,
            compara costos <strong className="text-foreground font-medium">sin IVA</strong>; si es{" "}
            <strong className="text-foreground font-medium">menor o igual a 0</strong>, compara{" "}
            <strong className="text-foreground font-medium">con IVA</strong> según la política del proveedor.
          </p>

          <div className="grid grid-cols-[1.35fr_minmax(0,1fr)] gap-x-4 gap-y-2 items-center">
            <Label className="text-right font-medium text-sm text-foreground">ORIGEN SALDO</Label>
            <div className="flex w-full min-w-0 gap-2">
              <Button
                type="button"
                variant={!usarConfigurado ? "default" : "outline"}
                size="sm"
                className="min-w-0 flex-1"
                disabled={pending}
                onClick={() => setUsarConfigurado(false)}
              >
                Automático
              </Button>
              <Button
                type="button"
                variant={usarConfigurado ? "default" : "outline"}
                size="sm"
                className="min-w-0 flex-1"
                disabled={pending}
                onClick={() => setUsarConfigurado(true)}
              >
                Configurado
              </Button>
            </div>

            {!usarConfigurado ? (
              <>
                <span className="text-right text-sm font-medium text-foreground">ACUM. CALCULADO</span>
                <p className="text-sm tabular-nums text-foreground">
                  {estadoInicial.saldoAcumuladoCalculado < 0
                    ? `$-${fmtPrecio(Math.abs(estadoInicial.saldoAcumuladoCalculado))}`
                    : `$${fmtPrecio(estadoInicial.saldoAcumuladoCalculado)}`}
                </p>
              </>
            ) : (
              <>
                <Label htmlFor="iva-comparacion-saldo" className="text-right font-medium text-sm text-foreground">
                  IVA SALDO
                </Label>
                <Input
                  id="iva-comparacion-saldo"
                  value={saldoInput}
                  onChange={(e) => setSaldoInput(e.target.value)}
                  placeholder="EJ. -234962"
                  className={cn("tabular-nums border-primary w-full min-w-0")}
                  autoComplete="off"
                  disabled={pending}
                />
              </>
            )}

            <span className="text-right text-sm font-medium text-foreground">MODO COMPARACIÓN</span>
            <p className="text-sm font-semibold text-primary">
              {modoEfectivoPreview === "SIN_IVA" ? "SIN IVA" : "CON IVA"}
            </p>
          </div>
        </div>
      </AppModal>
    </Dialog>
  );
}
