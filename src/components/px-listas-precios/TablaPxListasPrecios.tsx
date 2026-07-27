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
import {
  guardarPxListaMargenEdicionAction,
  guardarPxListaPrecioEdicionAction,
} from "@/actions/pxListasPrecios";
import PorcentajeCentInput from "@/components/shared/PorcentajeCentInput";
import PxListaEnteroInput from "@/components/shared/PxListaEnteroInput";
import {
  calcPxListaDesdeMargenSinIvaPct,
} from "@/lib/calculos";
import {
  parsePorcentajeCentNormalized,
  porcentajeCentFromNumber,
} from "@/lib/porcentajeCentMask";
import {
  margenDesdePrecioDux,
  armarCeldaPrecioPxListas,
  celdaRequiereActualizar,
} from "@/lib/pxListasPreciosCelda";
import {
  parsePxListaEnteroNormalized,
  pxListaEnteroFromNumber,
} from "@/lib/pxListaEnteroMask";
import {
  fmtMargenPxListaTabla,
  fmtPxListaTabla,
  MARGEN_PX_LISTA_MAX_CENTS,
  margenesPorcUtilidadDifieren,
  preciosPxListaEnterosIguales,
  roundPxListaEntero,
} from "@/lib/pxListasPreciosFormat";
import type {
  ItemPxListasPreciosTabla,
  ListaPrecioPxListasColumna,
  PrecioListaPxListasCelda,
} from "@/lib/pxListasPrecios";
import { resolverCategoriaMargenPxListas } from "@/lib/pxListasPreciosCategoria";
import type { FinAnaMcCategoriaItem } from "@/lib/finAnaMcCategorias";
import { cn } from "@/lib/utils";

interface Props {
  items: ItemPxListasPreciosTabla[];
  listas: ListaPrecioPxListasColumna[];
  puedeEditar: boolean;
  categoriasMc: FinAnaMcCategoriaItem[];
  idListaGeneral: number | null;
}

type DraftCeldaPxListas = {
  px: number | null;
  margen: number | null;
};

const PX_LISTAS_PCT_DESCRIPCION = 42;
const PX_LISTAS_PCT_CATEGORIA_MC = 8;
/** Resto de la grilla (listas PX + PORC. UTILIDAD); 40 % indicado en UX (42 + 8 + 40 = 90 %; el 10 % restante lo reparte el navegador). */
const PX_LISTAS_PCT_LISTAS = 40;
/** Ancho mínimo por par PX / PORC. cuando hay muchas listas (scroll horizontal). */
const PX_LISTAS_MIN_ANCHO_PAR_LISTA_REM = 5;

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

function aplicarDraftCelda(
  celda: PrecioListaPxListasCelda,
  draft: DraftCeldaPxListas | undefined
): PrecioListaPxListasCelda {
  if (!draft) return celda;
  return {
    ...celda,
    pxEfectivo: draft.px,
    margenPct: draft.margen,
  };
}

const INPUT_PX_LISTA_CLASS =
  "h-[calc(var(--tabla-body-row-min-height)-0.5rem)] min-w-0 max-h-full text-xs tabular-nums";

const INPUT_MARGEN_PX_LISTA_CLASS =
  "h-[calc(var(--tabla-body-row-min-height)-0.5rem)] min-w-0 max-h-full text-xs tabular-nums";

function CeldaPxLista({
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
  onDraft: (idLista: number, px: number | null) => void;
  onSaved: (idLista: number, patch: Partial<PrecioListaPxListasCelda>) => void;
}) {
  const pxPersistido = celda.pxEfectivo;
  const [draftLocal, setDraftLocal] = useState<string | null>(null);
  const [saving, startTransition] = useTransition();
  const pxAlIniciarRef = useRef<number | null>(null);
  const pxEditable = costoCompra > 0;
  const tieneEdicion = celda.pxEdicion != null;

  const pxVista = fmtPxListaTabla(pxPersistido);
  const draft =
    draftLocal ??
    pxListaEnteroFromNumber(pxPersistido);

  function aplicarDraftEnVivo(next: string) {
    setDraftLocal(next);
    if (next.trim() === "") {
      onDraft(idLista, null);
      return;
    }
    const px = parsePxListaEnteroNormalized(next);
    if (px !== undefined) {
      onDraft(idLista, px);
    }
  }

  function commit() {
    if (!pxEditable) {
      onDraft(idLista, null);
      pxAlIniciarRef.current = null;
      setDraftLocal(null);
      return;
    }

    if (draft.trim() === "") {
      if (!tieneEdicion) {
        onDraft(idLista, null);
        pxAlIniciarRef.current = null;
        setDraftLocal(null);
        return;
      }

      startTransition(async () => {
        const res = await guardarPxListaPrecioEdicionAction({
          codTienda,
          idLista,
          pxEdicion: null,
        });
        if (res.ok) {
          onSaved(
            idLista,
            armarCeldaPrecioPxListas({
              idLista,
              costoCompra,
              pxDux: celda.pxDux,
              pxEdicion: null,
            })
          );
        } else {
          toast.error(res.error);
        }
        pxAlIniciarRef.current = null;
        setDraftLocal(null);
      });
      return;
    }

    const px = parsePxListaEnteroNormalized(draft);
    if (px === undefined) {
      toast.error("Precio inválido.");
      setDraftLocal(null);
      onDraft(idLista, null);
      pxAlIniciarRef.current = null;
      return;
    }

    const pxInicial = pxAlIniciarRef.current;
    if (
      pxInicial != null &&
      preciosPxListaEnterosIguales(px, pxInicial)
    ) {
      onDraft(idLista, null);
      pxAlIniciarRef.current = null;
      setDraftLocal(null);
      return;
    }

    startTransition(async () => {
      const res = await guardarPxListaPrecioEdicionAction({
        codTienda,
        idLista,
        pxEdicion: px,
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
        onDraft(idLista, null);
        setDraftLocal(null);
      }
      pxAlIniciarRef.current = null;
      setDraftLocal(null);
    });
  }

  if (!puedeEditar || !pxEditable) {
    return (
      <span className="tabular-nums text-foreground">
        {pxVista || "—"}
      </span>
    );
  }

  return (
    <PxListaEnteroInput
      valueNormalized={draft}
      onValueNormalizedChange={(next) => {
        if (draftLocal === null) {
          setDraftLocal(pxListaEnteroFromNumber(pxPersistido));
        }
        if (pxAlIniciarRef.current === null) {
          pxAlIniciarRef.current =
            celda.pxEfectivo != null ? roundPxListaEntero(celda.pxEfectivo) : null;
        }
        aplicarDraftEnVivo(next);
      }}
      onCommit={commit}
      disabled={saving}
      className={cn(
        INPUT_PX_LISTA_CLASS,
        "w-full border-primary",
        tieneEdicion && "px-lista-input--edicion"
      )}
      aria-label="Precio calculado"
      title="Editar precio"
    />
  );
}

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
  const [draftLocal, setDraftLocal] = useState<string | null>(null);
  const [saving, startTransition] = useTransition();
  const margenAlIniciarRef = useRef<number | null>(null);
  const margenEditable = costoCompra > 0;
  const tieneEdicion = celda.pxEdicion != null;

  const margenVista =
    celda.margenPct != null ? fmtMargenPxListaTabla(celda.margenPct) : "";

  const draft =
    draftLocal ??
    (margenPersistido != null
      ? porcentajeCentFromNumber(margenPersistido, MARGEN_PX_LISTA_MAX_CENTS, true)
      : "");

  function aplicarDraftEnVivo(next: string) {
    setDraftLocal(next);
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
      onDraft(idLista, null);
      margenAlIniciarRef.current = null;
      setDraftLocal(null);
      return;
    }

    if (draft.trim() === "") {
      if (!tieneEdicion) {
        onDraft(idLista, null);
        margenAlIniciarRef.current = null;
        setDraftLocal(null);
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
        setDraftLocal(null);
      });
      return;
    }

    const margen = parsePorcentajeCentNormalized(draft, MARGEN_PX_LISTA_MAX_CENTS);
    if (margen === undefined) {
      toast.error("Margen inválido.");
      setDraftLocal(null);
      onDraft(idLista, null);
      margenAlIniciarRef.current = null;
      return;
    }

    const margenInicial = margenAlIniciarRef.current;
    if (
      margenInicial != null &&
      !margenesPorcUtilidadDifieren(margen, margenInicial)
    ) {
      onDraft(idLista, null);
      margenAlIniciarRef.current = null;
      setDraftLocal(null);
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
        onDraft(idLista, null);
        setDraftLocal(null);
      }
      margenAlIniciarRef.current = null;
      setDraftLocal(null);
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
        if (draftLocal === null) {
          setDraftLocal(
            margenPersistido != null
              ? porcentajeCentFromNumber(margenPersistido, MARGEN_PX_LISTA_MAX_CENTS, true)
              : ""
          );
        }
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
      aria-label="Porc. utilidad"
      title="Editar porc. utilidad"
    />
  );
}

function FilaPxListasPrecios({
  item,
  puedeEditar,
  onItemChange,
  categoriasMc,
  idListaGeneral,
}: {
  item: ItemPxListasPreciosTabla;
  puedeEditar: boolean;
  onItemChange: (item: ItemPxListasPreciosTabla) => void;
  categoriasMc: FinAnaMcCategoriaItem[];
  idListaGeneral: number | null;
}) {
  const [draftPorLista, setDraftPorLista] = useState<
    Record<number, DraftCeldaPxListas>
  >({});

  const descripcionRequiereActualizar = item.preciosPorLista.some(
    (c) => c.requiereActualizar
  );

  const limpiarDraft = (idLista: number) => {
    setDraftPorLista((prev) => {
      if (!(idLista in prev)) return prev;
      const next = { ...prev };
      delete next[idLista];
      return next;
    });
  };

  const handleMargenDraft = (idLista: number, margen: number | null) => {
    if (margen == null) {
      limpiarDraft(idLista);
      return;
    }
    const px = calcPxListaDesdeMargenSinIvaPct(margen, item.costoCompra);
    setDraftPorLista((prev) => ({
      ...prev,
      [idLista]: { px, margen },
    }));
  };

  const handlePxDraft = (idLista: number, px: number | null) => {
    if (px == null) {
      limpiarDraft(idLista);
      return;
    }
    const margen = margenDesdePrecioDux(px, item.costoCompra);
    setDraftPorLista((prev) => ({
      ...prev,
      [idLista]: { px, margen },
    }));
  };

  const handleCeldaSaved = (
    idLista: number,
    patch: Partial<PrecioListaPxListasCelda>
  ) => {
    limpiarDraft(idLista);
    onItemChange(actualizarCeldaEnItem(item, idLista, patch));
  };

  const celdaGeneral =
    idListaGeneral == null
      ? null
      : item.preciosPorLista.find((c) => c.idLista === idListaGeneral) ?? null;
  const draftGeneral =
    idListaGeneral == null ? undefined : draftPorLista[idListaGeneral];
  const porcUtilidadGeneral = celdaGeneral
    ? aplicarDraftCelda(celdaGeneral, draftGeneral).margenPct
    : null;
  const categoriaMargen = resolverCategoriaMargenPxListas(
    porcUtilidadGeneral,
    categoriasMc
  );

  return (
    <TableRow>
      <TableCell
        className={cn(
          "celda-datos celda-px-listas-col-fija celda-px-listas-col-fija-desc",
          descripcionRequiereActualizar && "celda-px-listas-actualizar"
        )}
      >
        <span className="block truncate" title={item.descripcion}>
          {item.descripcion}
        </span>
      </TableCell>
      <TableCell
        className={cn(
          "celda-datos whitespace-nowrap celda-px-listas-col-fija celda-px-listas-col-fija-cat",
          descripcionRequiereActualizar && "celda-px-listas-actualizar"
        )}
        title={categoriaMargen || undefined}
      >
        <span className="block truncate">{categoriaMargen}</span>
      </TableCell>
      {item.preciosPorLista.flatMap((celda) => {
        const draft = draftPorLista[celda.idLista];
        const celdaVista = aplicarDraftCelda(celda, draft);
        const listaActualizar = celda.requiereActualizar;

        return [
          <TableCell
            key={`${item.codTienda}-${celda.idLista}-px`}
            className={cn(
              "celda-datos celda-numero celda-px-lista-col border-l border-border",
              listaActualizar && "celda-px-listas-actualizar"
            )}
          >
            <CeldaPxLista
              key={`${item.codTienda}-${celda.idLista}-px-${celda.pxEfectivo ?? "n"}-${celda.pxEdicion ?? "d"}`}
              codTienda={item.codTienda}
              idLista={celda.idLista}
              costoCompra={item.costoCompra}
              celda={celdaVista}
              puedeEditar={puedeEditar}
              onDraft={handlePxDraft}
              onSaved={handleCeldaSaved}
            />
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
  categoriasMc,
  idListaGeneral,
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

  const colCount = 2 + listas.length * 2;
  const pctSubcolLista =
    listas.length > 0 ? PX_LISTAS_PCT_LISTAS / (listas.length * 2) : 0;
  const tablasListasMinWidthRem = listas.length * PX_LISTAS_MIN_ANCHO_PAR_LISTA_REM;

  return (
    <Table
      variant="compact"
      scrollX
      className="tabla-px-listas-listado tabla-px-listas-precios"
      style={{
        ["--px-listas-num-listas" as string]: String(listas.length),
        minWidth: `max(100cqw, calc(${PX_LISTAS_PCT_DESCRIPCION}cqw + ${PX_LISTAS_PCT_CATEGORIA_MC}cqw + max(${PX_LISTAS_PCT_LISTAS}cqw, ${tablasListasMinWidthRem}rem)))`,
        width: `max(100cqw, calc(${PX_LISTAS_PCT_DESCRIPCION}cqw + ${PX_LISTAS_PCT_CATEGORIA_MC}cqw + max(${PX_LISTAS_PCT_LISTAS}cqw, ${tablasListasMinWidthRem}rem)))`,
      }}
    >
      <colgroup>
        <col className="col-px-listas-desc" />
        <col className="col-px-listas-cat" />
        {listas.flatMap((lista) => [
          <col key={`${lista.idLista}-px`} className="col-px-listas-lista" style={{ width: `${pctSubcolLista}%` }} />,
          <col key={`${lista.idLista}-mg`} className="col-px-listas-lista" style={{ width: `${pctSubcolLista}%` }} />,
        ])}
      </colgroup>
      <TableHeader>
        <TableRow>
          <TableHead
            rowSpan={2}
            className="align-middle celda-px-listas-col-fija celda-px-listas-col-fija-desc"
          >
            DESCRIPCIÓN
          </TableHead>
          <TableHead
            rowSpan={2}
            className="align-middle celda-px-listas-col-fija celda-px-listas-col-fija-cat"
          >
            CATEGORÍA M.C
          </TableHead>
          {listas.map((lista) => (
            <TableHead
              key={lista.idLista}
              colSpan={2}
              className="text-center border-l border-primary-foreground/25 tabla-px-listas-col-lista"
            >
              {lista.nombreLista.toUpperCase()}
            </TableHead>
          ))}
        </TableRow>
        <TableRow>
          {listas.flatMap((lista) => [
            <TableHead
              key={`${lista.idLista}-px-h`}
              className="text-center border-l border-primary-foreground/25 tabla-px-listas-col-lista"
            >
              PX
            </TableHead>,
            <TableHead
              key={`${lista.idLista}-mg-h`}
              className="text-center tabla-px-listas-col-lista"
            >
              PORC. UTILIDAD
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
              categoriasMc={categoriasMc}
              idListaGeneral={idListaGeneral}
            />
          ))
        )}
      </TableBody>
    </Table>
  );
}
