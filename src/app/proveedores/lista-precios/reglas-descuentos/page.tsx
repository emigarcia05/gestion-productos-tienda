import { redirect } from "next/navigation";

/** Ruta legacy: reglas de descuento viven en modal desde Lista Precios. */
export default function ReglasDescuentosListaPrecioPage() {
  redirect("/gestion-productos/proveedores/lista-precios");
}
