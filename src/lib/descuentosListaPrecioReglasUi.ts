import type { CampoReglaDescuentoListaPrecioInput } from "@/lib/validations/descuentosListaPrecioReglas";
import type { ReglaDescuentoListaPrecio } from "@/services/descuentosListaPrecioReglas.service";

export const CAMPOS_REGLA_DESCUENTO_OPCIONES: {
  value: CampoReglaDescuentoListaPrecioInput;
  label: string;
}[] = [
  { value: "dto_proveedor", label: "DESC. PROV." },
  { value: "dto_marca", label: "DESC. MARCA" },
  { value: "dto_rubro", label: "DESC. RUBRO" },
  { value: "dto_cantidad", label: "DESC. CANT." },
  { value: "dto_financiero", label: "DESC. FINAN." },
  { value: "cx_transporte", label: "CX. TRANSP." },
];

export function labelCampoReglaDescuento(
  campo: CampoReglaDescuentoListaPrecioInput
): string {
  return CAMPOS_REGLA_DESCUENTO_OPCIONES.find((o) => o.value === campo)?.label ?? campo;
}

export function fmtCondicionesReglaDescuento(regla: ReglaDescuentoListaPrecio): string {
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
  return partes.length > 0 ? partes.join(" + ") : "—";
}
