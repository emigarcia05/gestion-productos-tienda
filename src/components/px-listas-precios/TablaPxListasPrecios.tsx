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
import { guardarPxListaMargenEdicionAction } from "@/actions/pxListasPrecios";
import PorcentajeCentInput from "@/components/shared/PorcentajeCentInput";
import {
  calcPxListaDesdeMargenSinIvaPct,
} from "@/lib/calculos";
import {
  parsePorcentajeCentNormalized,
  porcentajeCentFromNumber,
} from "@/lib/porcentajeCentMask";
import {
  armarCeldaPrecioPxListas,
  celdaRequiereActualizar,
} from "@/lib/pxListasPreciosCelda";
import {
  fmtMargenPxListaTabla,
  fmtPxListaTabla,
  MARGEN_PX_LISTA_MAX_CENTS,
  margenesPorcUtilidadDifieren,
} from "@/lib/pxListasPreciosFormat";
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
  const preciosPorLista = item.preciosPorLista.map((c) => {
    if (c.idLista !== idLista) return c;
    const merged = { ...c, ...patch };
    return {
      ...merged,
      requiereActualizar: celdaRequiereActualizar(merged),
    };
  });
  return { ...item, preciosPorLista };
}

function CeldaPxLista({ celda }: { celda: PrecioListaPxListasCelda }) {
  const display = fmtPxListaTabla(celda.pxEfectivo);
  return (
    <span className="tabular-nums text-foreground">{display || "—"}</span>
  );
}

const INPUT_MARGEN_PX_LISTA_CLASS =
  "h-[calc(var(--tabla-body-row-min-height)-0.5rem)] min-w-0 max-h-full text-xs tabular-nums";

function CeldaMargenLista({
  codTienda,
  idLista,
  costoCompra,
  celda,
  puedeEditar,
  onDraft,
  onSaved,
}: {
  codTienda: string;
  idLista: number;
  costoCompra: number;
  celda: PrecioListaPxListasCelda;
  puedeEditar: boolean;
  onDraft: (idLista: number, margen: number | null) => void;
  onSaved: (idLista: number, patch: Partial<PrecioListaPxListasCelda>) => void;
}) {
  const margenPersistido = celda.margenPct;
  const [draft, setDraft] = useState(() =>
    margenPersistido != null
      ? porcentajeCentFromNumber(margenPersistido, MARGEN_PX_LISTA_MAX_CENTS)
      : ""
  );
  const [saving, startTransition] = useTransition();
  const margenAlIniciarRef = useRef<number | null>(null);
  const margenEditable = costoCompra > 0;
  const tieneEdicion = celda.pxEdicion != null;

  const margenVista =
    celda.margenPct != null ? fmtMargenPxListaTabla(celda.margenPct) : "";

  function aplicarDraftEnVivo(next: string) {
    setDraft(next);
    if (next.trim() === "") {
      onDraft(idLista, null);
      return;
    }
    const margen = parsePorcentajeCentNormalized(next, MARGEN_PX_LISTA_MAX_CENTS);
    if (margen !== undefined) {
      onDraft(idLista, margen);
    }
  }

  function commit() {
    if (!margenEditable) {
      onDraft(idLista, celda.margenManual);
      margenAlIniciarRef.current = null;
      return;
    }

    if (draft.trim() === "") {
      if (!tieneEdicion) {
        onDraft(idLista, celda.margenManual);
        margenAlIniciarRef.current = null;
        return;
      }

      startTransition(async () => {
        const res = await guardarPxListaMargenEdicionAction({
          codTienda,
          idLista,
          margenManual: null,
        });
        if (res.ok) {
          onSaved(idLista, armarCeldaPrecioPxListas({
            idLista,
            costoCompra,
            pxDux: celda.pxDux,
            pxEdicion: null,
          }));
        } else {
          toast.error(res.error);
        }
        margenAlIniciarRef.current = null;
      });
      return;
    }

    const margen = parsePorcentajeCentNormalized(draft, MARGEN_PX_LISTA_MAX_CENTS);
    if (margen === undefined) {
      toast.error("Margen inválido.");
      setDraft(
        margenPersistido != null
          ? porcentajeCentFromNumber(margenPersistido, MARGEN_PX_LISTA_MAX_CENTS)
          : ""
      );
      onDraft(idLista, celda.margenManual);
      margenAlIniciarRef.current = null;
      return;
    }

    const margenInicial = margenAlIniciarRef.current;
    if (
      margenInicial != null &&
      !margenesPorcUtilidadDifieren(margen, margenInicial)
    ) {
      onDraft(idLista, celda.margenManual);
      margenAlIniciarRef.current = null;
      return;
    }

    startTransition(async () => {
      const res = await guardarPxListaMargenEdicionAction({
        codTienda,
        idLista,
        margenManual: margen,
      });
      if (res.ok) {
        onSaved(
          idLista,
          armarCeldaPrecioPxListas({
            idLista,
            costoCompra,
            pxDux: celda.pxDux,
            pxEdicion: res.data.pxEdicion,
          })
        );
      } else {
        toast.error(res.error);
        onDraft(idLista, celda.margenManual);
        setDraft(
          margenPersistido != null
            ? porcentajeCentFromNumber(margenPersistido, MARGEN_PX_LISTA_MAX_CENTS)
            : ""
        );
      }
      margenAlIniciarRef.current = null;
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
    <PorcentajeCentInput
      valueNormalized={draft}
      maxCents={MARGEN_PX_LISTA_MAX_CENTS}
      onValueNormalizedChange={(next) => {
        if (margenAlIniciarRef.current === null) {
          margenAlIniciarRef.current = celda.margenPct;
        }
        aplicarDraftEnVivo(next);
      }}
      onCommit={commit}
      disabled={saving}
      className={cn(
        INPUT_MARGEN_PX_LISTA_CLASS,
        "w-full border-primary",
        tieneEdicion && "px-lista-input--edicion"
      )}
      aria-label="Margen manual"
      title="Editar margen manual"
    />
  );
}

function FilaPxListasPrecios({
  item,
  puedeEditar,
  onItemChange,
}: {
  item: ItemPxListasPreciosTabla;
  puedeEditar: boolean;
  onItemChange: (item: ItemPxListasPreciosTabla) => void;
}) {
  const [draftPxPorLista, setDraftPxPorLista] = useState<
    Record<number, number | null>
  >({});

  const descripcionRequiereActualizar = item.preciosPorLista.some(
    (c) => c.requiereActualizar
  );

  const handleMargenDraft = (idLista: number, margen: number | null) => {
    if (margen == null) {
      setDraftPxPorLista((prev) => {
        const next = { ...prev };
        delete next[idLista];
        return next;
      });
      return;
    }
    const px = calcPxListaDesdeMargenSinIvaPct(margen, item.costoCompra);
    setDraftPxPorLista((prev) => ({ ...prev, [idLista]: px }));
  };

  const handleCeldaSaved = (
    idLista: number,
    patch: Partial<PrecioListaPxListasCelda>
  ) => {
    setDraftPxPorLista((prev) => {
      const next = { ...prev };
      delete next[idLista];
      return next;
    });
    onItemChange(actualizarCeldaEnItem(item, idLista, patch));
  };

  return (
    <TableRow>
      <TableCell
        className={cn(
          "celda-datos max-w-[22rem]",
          descripcionRequiereActualizar && "celda-px-listas-actualizar"
        )}
      >
        <span className="block truncate" title={item.descripcion}>
          {item.descripcion}
        </span>
      </TableCell>
      {item.preciosPorLista.flatMap((celda) => {
        const pxDraft = draftPxPorLista[celda.idLista];
        const celdaVista: PrecioListaPxListasCelda =
          pxDraft !== undefined
            ? { ...celda, pxEfectivo: pxDraft }
            : celda;
        const listaActualizar = celda.requiereActualizar;

        return [
          <TableCell
            key={`${item.codTienda}-${celda.idLista}-px`}
            className={cn(
              "celda-datos celda-numero celda-px-lista-col border-l border-border",
              listaActualizar && "celda-px-listas-actualizar"
            )}
          >
            <CeldaPxLista celda={celdaVista} />
          </TableCell>,
          <TableCell
            key={`${item.codTienda}-${celda.idLista}-mg`}
            className={cn(
              "celda-datos celda-numero celda-marcacion-col",
              listaActualizar && "celda-px-listas-actualizar"
            )}
          >
            <CeldaMargenLista
              key={`${item.codTienda}-${celda.idLista}-mg-${celda.margenPct ?? "n"}-${celda.pxEdicion ?? "d"}`}
              codTienda={item.codTienda}
              idLista={celda.idLista}
              costoCompra={item.costoCompra}
              celda={celdaVista}
              puedeEditar={puedeEditar}
              onDraft={handleMargenDraft}
              onSaved={handleCeldaSaved}
            />
          </TableCell>,
        ];
      })}
    </TableRow>
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

  const handleItemChange = useCallback((updated: ItemPxListasPreciosTabla) => {
    setItems((prev) =>
      prev.map((item) =>
        item.codTienda === updated.codTienda ? updated : item
      )
    );
  }, []);

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
              PX. CALC.
            </TableHead>,
            <TableHead key={`${lista.idLista}-mg-h`} className="text-center">
              MARG. MAN.
            </TableHead>,
          ])}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <EmptyTableRow colSpan={colCount} message="NO HAY PRODUCTOS." />
        ) : (
          items.map((item) => (
            <FilaPxListasPrecios
              key={item.codTienda}
              item={item}
              puedeEditar={puedeEditar}
              onItemChange={handleItemChange}
            />
          ))
        )}
      </TableBody>
    </Table>
  );
}
