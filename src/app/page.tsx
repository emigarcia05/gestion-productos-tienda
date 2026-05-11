import { redirect } from "next/navigation";

/** Entrada por defecto: módulo Gestión Productos, vista alineada al rol simple (Px. Vta. Sugeridos). */
export default function HomePage() {
  redirect("/gestion-productos/proveedores/sugeridos");
}
