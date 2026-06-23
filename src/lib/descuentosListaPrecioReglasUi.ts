import type { CampoReglaDescuentoListaPrecioInput } from "@/lib/validations/descuentosListaPrecioReglas";

export const CAMPOS_REGLA_DESCUENTO_OPCIONES: {
  value: CampoReglaDescuentoListaPrecioInput;
  label: string;
  etiquetaCorta: string;
  tipo: "descuento" | "costo";
  propiedadFila: keyof Pick<
    import("@/services/descuentosListaPrecioReglas.service").DescuentosMaterializadosItem,
    "dtoProveedor" | "dtoMarca" | "dtoRubro" | "dtoCantidad" | "dtoFinanciero" | "cxTransporte"
  >;
}[] = [
  {
    value: "dto_proveedor",
    label: "DESC. PROV.",
    etiquetaCorta: "Prov.",
    tipo: "descuento",
    propiedadFila: "dtoProveedor",
  },
  {
    value: "dto_marca",
    label: "DESC. MARCA",
    etiquetaCorta: "Marca",
    tipo: "descuento",
    propiedadFila: "dtoMarca",
  },
  {
    value: "dto_rubro",
    label: "DESC. RUBRO",
    etiquetaCorta: "Rubro",
    tipo: "descuento",
    propiedadFila: "dtoRubro",
  },
  {
    value: "dto_cantidad",
    label: "DESC. CANT.",
    etiquetaCorta: "Cant.",
    tipo: "descuento",
    propiedadFila: "dtoCantidad",
  },
  {
    value: "dto_financiero",
    label: "DESC. FINAN.",
    etiquetaCorta: "Finan.",
    tipo: "descuento",
    propiedadFila: "dtoFinanciero",
  },
  {
    value: "cx_transporte",
    label: "CX. TRANSP.",
    etiquetaCorta: "Transp.",
    tipo: "costo",
    propiedadFila: "cxTransporte",
  },
];

export function labelCampoReglaDescuento(
  campo: CampoReglaDescuentoListaPrecioInput
): string {
  return CAMPOS_REGLA_DESCUENTO_OPCIONES.find((o) => o.value === campo)?.label ?? campo;
}

export function fmtCondicionesReglaDescuento(regla: {
  idProveedor?: string | null;
  idMarca?: string | null;
  idRubro?: string | null;
  proveedorNombre?: string | null;
  marcaNombre?: string | null;
  rubroNombre?: string | null;
}): string {
  const partes: string[] = [];
  if (regla.idProveedor) {
    partes.push(regla.proveedorNombre ?? "PROVEEDOR");
  }
  if (regla.idMarca) {
    partes.push(regla.marcaNombre ?? "MARCA");
  }
  if (regla.idRubro) {
    partes.push(regla.rubroNombre ?? "RUBRO");
  }
  return partes.length > 0 ? partes.join(" + ") : "TODOS";
}

/** Valor de celda PROVEEDOR / MARCA / RUBRO en grilla de reglas (vacío = comodín o sin dato). */
export function celdaCondicionReglaDescuento(
  regla: {
    idProveedor?: string | null;
    idMarca?: string | null;
    idRubro?: string | null;
    proveedorNombre?: string | null;
    marcaNombre?: string | null;
    rubroNombre?: string | null;
  },
  dimension: "proveedor" | "marca" | "rubro"
): string {
  switch (dimension) {
    case "proveedor":
      return regla.idProveedor ? regla.proveedorNombre?.trim() ?? "" : "";
    case "marca":
      return regla.idMarca ? regla.marcaNombre?.trim() ?? "" : "";
    case "rubro":
      return regla.idRubro ? regla.rubroNombre?.trim() ?? "" : "";
  }
}

export type LineaCondicionReglaDescuento = {
  dimension: "Proveedor" | "Marca" | "Rubro";
  valor: string;
};

/** Líneas para el detalle de regla (modal ítem): Proveedor / Marca / Rubro activos en orden fijo. */
export function lineasCondicionReglaDescuento(regla: {
  idProveedor?: string | null;
  idMarca?: string | null;
  idRubro?: string | null;
  proveedorNombre?: string | null;
  marcaNombre?: string | null;
  rubroNombre?: string | null;
}): LineaCondicionReglaDescuento[] {
  const lineas: LineaCondicionReglaDescuento[] = [];
  if (regla.idProveedor) {
    lineas.push({
      dimension: "Proveedor",
      valor: regla.proveedorNombre?.trim() || "—",
    });
  }
  if (regla.idMarca) {
    lineas.push({
      dimension: "Marca",
      valor: regla.marcaNombre?.trim() || "—",
    });
  }
  if (regla.idRubro) {
    lineas.push({
      dimension: "Rubro",
      valor: regla.rubroNombre?.trim() || "—",
    });
  }
  return lineas;
}
