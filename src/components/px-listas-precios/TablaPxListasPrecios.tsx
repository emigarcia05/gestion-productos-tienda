"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  EmptyTableRow,
} from "@/components/ui/table";
import { guardarPxListaPrecioEdicionAction } from "@/actions/pxListasPrecios";
import {
  calcMargenSinIvaPct,
  calcPxListaDesdeMargenSinIvaPct,
} from "@/lib/calculos";
import {
  fmtMargenPxListaTabla,
  fmtPxListaTabla,
  formatMargenPxListaInput,
  parseMargenPxListaInput,
  roundPxListaEntero,
} from "@/lib/pxListasPreciosFormat";
import { parsePrecio } from "@/lib/parsearImport";
import type {
  ItemPxListasPreciosTabla,
  ListaPrecioPxListasColumna,
  PrecioListaPxListasCelda,
} from "@/lib/pxListasPrecios";
import { cn } from "@/lib/utils";

interface Props {
  items: ItemPxListasPreciosTabla[];
  listas: ListaPrecioPxListasColumna[];
  puedeEditar: boolean;
}

function actualizarCeldaEnItem(
  item: ItemPxListasPreciosTabla,
  idLista: number,
  patch: Partial<PrecioListaPxListasCelda>
): ItemPxListasPreciosTabla {
  return {
    ...item,
    preciosPorLista: item.preciosPorLista.map((c) =>
      c.idLista === idLista ? { ...c, ...patch } : c
    ),
  };
}

function CeldaPxLista({
  codTienda,
  idLista,
  celda,
  puedeEditar,
  onSaved,
}: {
  codTienda: string;
  idLista: number;
  celda: PrecioListaPxListasCelda;
  puedeEditar: boolean;
  onSaved: (idLista: number, patch: Partial<PrecioListaPxListasCelda>) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const display = fmtPxListaTabla(celda.pxEfectivo);
  const tieneEdicion = celda.pxEdicion != null;

  function iniciarEdicion() {
    setDraft(display);
    setEditando(true);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      el?.focus();
      el?.select();
    });
  }

  function commit() {
    const trimmed = draft.trim();
    if (trimmed === "") {
      if (!tieneEdicion) {
        setEditando(false);
        return;
      }
      startTransition(async () => {
        const res = await guardarPxListaPrecioEdicionAction({
          codTienda,
          idLista,
          precio: null,
        });
        if (res.ok) {
          const pxEfectivo = celda.pxDux;
          onSaved(idLista, {
            pxEdicion: null,
            pxEfectivo,
            margenPct: res.data.margenPct,
          });
        } else {
          toast.error(res.error);
        }
        setEditando(false);
      });
      return;
    }

    const num = roundPxListaEntero(parsePrecio(trimmed));
    if (!Number.isFinite(num) || num <= 0) {
      toast.error("Precio inválido.");
      setDraft(display);
      setEditando(false);
      return;
    }

    const pxActual =
      celda.pxEfectivo != null ? roundPxListaEntero(celda.pxEfectivo) : null;
    if (pxActual != null && num === pxActual) {
      setEditando(false);
      return;
    }

    startTransition(async () => {
      const res = await guardarPxListaPrecioEdicionAction({
        codTienda,
        idLista,
        precio: num,
      });
      if (res.ok) {
        onSaved(idLista, {
          pxEdicion: res.data.precio,
          pxEfectivo: res.data.precio,
          margenPct: res.data.margenPct,
        });
      } else {
        toast.error(res.error);
        setDraft(display);
      }
      setEditando(false);
    });
  }

  if (!puedeEditar) {
    return (
      <span className="tabular-nums text-foreground">
        {display || "—"}
      </span>
    );
  }

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      readOnly={!editando}
      value={editando ? draft : display}
      disabled={saving}
      onFocus={() => {
        if (!editando) iniciarEdicion();
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") inputRef.current?.blur();
        if (e.key === "Escape") {
          setDraft(display);
          setEditando(false);
          inputRef.current?.blur();
        }
      }}
      className={cn(
        "w-full min-w-0 text-center tabular-nums",
        tieneEdicion && "px-lista-input--edicion"
      )}
      aria-label="PX"
      title="Clic Para Editar PX"
    />
  );
}

function CeldaMargenLista({
  codTienda,
  idLista,
  costoCompra,
  celda,
  puedeEditar,
  onSaved,
}: {
  codTienda: string;
  idLista: number;
  costoCompra: number;
  celda: PrecioListaPxListasCelda;
  puedeEditar: boolean;
  onSaved: (idLista: number, patch: Partial<PrecioListaPxListasCelda>) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const margenDisplay =
    celda.margenPct != null ? formatMargenPxListaInput(celda.margenPct) : "";
  const margenEditable = costoCompra > 0;

  const margenVista =
    celda.margenPct != null ? fmtMargenPxListaTabla(celda.margenPct) : "";

  function iniciarEdicion() {
    setDraft(margenDisplay);
    setEditando(true);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      el?.focus();
      el?.select();
    });
  }

  function commit() {
    if (!margenEditable) {
      setEditando(false);
      return;
    }

    const trimmed = draft.trim().replace("%", "");
    if (trimmed === "") {
      setDraft(margenDisplay);
      setEditando(false);
      return;
    }

    const margen = parseMargenPxListaInput(trimmed);
    if (margen === undefined) {
      toast.error("Margen inválido.");
      setDraft(margenDisplay);
      setEditando(false);
      return;
    }

    if (
      celda.margenPct != null &&
      Math.abs(margen - celda.margenPct) < 0.00005
    ) {
      setEditando(false);
      return;
    }

    const px = calcPxListaDesdeMargenSinIvaPct(margen, costoCompra);
    if (px == null) {
      toast.error("No se pudo calcular el precio.");
      setEditando(false);
      return;
    }

    startTransition(async () => {
      const res = await guardarPxListaPrecioEdicionAction({
        codTienda,
        idLista,
        precio: px,
      });
      if (res.ok) {
        onSaved(idLista, {
          pxEdicion: res.data.precio,
          pxEfectivo: res.data.precio,
          margenPct: res.data.margenPct ?? calcMargenSinIvaPct(px, costoCompra),
        });
      } else {
        toast.error(res.error);
        setDraft(margenDisplay);
      }
      setEditando(false);
    });
  }

  if (!puedeEditar || !margenEditable) {
    return (
      <span className="tabular-nums text-foreground">
        {margenVista || "—"}
      </span>
    );
  }

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      readOnly={!editando}
      value={editando ? draft : margenVista}
      disabled={saving}
      onFocus={() => {
        if (!editando) iniciarEdicion();
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") inputRef.current?.blur();
        if (e.key === "Escape") {
          setDraft(margenDisplay);
          setEditando(false);
          inputRef.current?.blur();
        }
      }}
      className={cn(
        "w-full min-w-0 text-center tabular-nums",
        celda.pxEdicion != null && "px-lista-input--edicion"
      )}
      aria-label="Margen"
      title="Clic Para Editar Margen"
    />
  );
}

export default function TablaPxListasPrecios({
  items: inicial,
  listas,
  puedeEditar,
}: Props) {
  const [items, setItems] = useState(inicial);

  useEffect(() => {
    setItems(inicial);
  }, [inicial]);

  const handleCeldaSaved = useCallback(
    (codTienda: string, idLista: number, patch: Partial<PrecioListaPxListasCelda>) => {
      setItems((prev) =>
        prev.map((item) =>
          item.codTienda === codTienda
            ? actualizarCeldaEnItem(item, idLista, patch)
            : item
        )
      );
    },
    []
  );

  const colCount = 1 + listas.length * 2;

  return (
    <Table
      variant="compact"
      scrollX
      className="tabla-px-listas-listado tabla-px-listas-precios min-w-max"
    >
      <colgroup>
        <col className="w-[22rem]" />
        {listas.flatMap((lista) => [
          <col key={`${lista.idLista}-px`} className="w-[6.5rem]" />,
          <col key={`${lista.idLista}-mg`} className="w-[5.5rem]" />,
        ])}
      </colgroup>
      <TableHeader>
        <TableRow>
          <TableHead rowSpan={2} className="align-middle">
            DESCRIPCIÓN
          </TableHead>
          {listas.map((lista) => (
            <TableHead
              key={lista.idLista}
              colSpan={2}
              className="text-center border-l border-primary-foreground/25"
            >
              {lista.nombreLista.toUpperCase()}
            </TableHead>
          ))}
        </TableRow>
        <TableRow>
          {listas.flatMap((lista) => [
            <TableHead
              key={`${lista.idLista}-px-h`}
              className="text-center border-l border-primary-foreground/25"
            >
              PX.
            </TableHead>,
            <TableHead key={`${lista.idLista}-mg-h`} className="text-center">
              MARGEN
            </TableHead>,
          ])}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <EmptyTableRow colSpan={colCount} message="NO HAY PRODUCTOS." />
        ) : (
          items.map((item) => (
            <TableRow key={item.codTienda}>
              <TableCell className="celda-datos max-w-[22rem]">
                <span className="block truncate" title={item.descripcion}>
                  {item.descripcion}
                </span>
              </TableCell>
              {item.preciosPorLista.flatMap((celda) => [
                <TableCell
                  key={`${item.codTienda}-${celda.idLista}-px`}
                  className="celda-datos celda-numero celda-px-lista-col border-l border-border"
                >
                  <CeldaPxLista
                    codTienda={item.codTienda}
                    idLista={celda.idLista}
                    celda={celda}
                    puedeEditar={puedeEditar}
                    onSaved={(idLista, patch) =>
                      handleCeldaSaved(item.codTienda, idLista, patch)
                    }
                  />
                </TableCell>,
                <TableCell
                  key={`${item.codTienda}-${celda.idLista}-mg`}
                  className="celda-datos celda-numero celda-marcacion-col"
                >
                  <CeldaMargenLista
                    codTienda={item.codTienda}
                    idLista={celda.idLista}
                    costoCompra={item.costoCompra}
                    celda={celda}
                    puedeEditar={puedeEditar}
                    onSaved={(idLista, patch) =>
                      handleCeldaSaved(item.codTienda, idLista, patch)
                    }
                  />
                </TableCell>,
              ])}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
