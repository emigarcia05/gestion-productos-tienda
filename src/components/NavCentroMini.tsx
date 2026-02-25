"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Handshake, ShoppingBag, ClipboardList, PackageSearch } from "lucide-react";

const W = "w-[5.5rem]"; // mismo ancho para todos
const ITEM_BASE =
  "flex flex-col items-center justify-center gap-1 min-h-[4.5rem] py-2.5 px-2 rounded-lg border-2 text-xs font-medium transition-all duration-200 shrink-0";
/** No seleccionado: fondo azul, letras e icono blanco */
const ITEM_INACTIVO =
  "border-brand bg-brand text-white hover:opacity-90 hover:shadow-sm";
/** Seleccionado: fondo negro, logo y letras amarillas */
const ITEM_ACTIVO =
  "border-accent2 bg-black text-accent2 shadow-md";

interface Props {
  mostrarTienda?: boolean;
  mostrarStock?: boolean;
}

export default function NavCentroMini({ mostrarTienda = false, mostrarStock = false }: Props) {
  const pathname = usePathname();

  const proveedoresActivo = pathname.startsWith("/proveedores");
  const tiendaActivo = pathname.startsWith("/tienda");
  const stockActivo = pathname.startsWith("/stock");
  const pedidosActivo = pathname.startsWith("/pedidos");

  return (
    <nav className="flex items-center gap-2 flex-wrap justify-center" aria-label="Navegación principal">
      <Link
        href="/proveedores"
        className={`${W} ${ITEM_BASE} ${proveedoresActivo ? ITEM_ACTIVO : ITEM_INACTIVO}`}
      >
        <Handshake className="h-5 w-5 shrink-0" />
        <span className="leading-tight text-center line-clamp-2">Lista Proveedores</span>
      </Link>

      {mostrarTienda && (
        <Link
          href="/tienda"
          className={`${W} ${ITEM_BASE} ${tiendaActivo ? ITEM_ACTIVO : ITEM_INACTIVO}`}
        >
          <ShoppingBag className="h-5 w-5 shrink-0" />
          <span className="leading-tight text-center line-clamp-2">Lista Tienda</span>
        </Link>
      )}

      {mostrarStock && (
        <Link
          href="/stock"
          className={`${W} ${ITEM_BASE} ${stockActivo ? ITEM_ACTIVO : ITEM_INACTIVO}`}
        >
          <PackageSearch className="h-5 w-5 shrink-0" />
          <span className="leading-tight text-center line-clamp-2">Control Stock</span>
        </Link>
      )}

      <Link
        href="/pedidos"
        className={`${W} ${ITEM_BASE} ${pedidosActivo ? ITEM_ACTIVO : ITEM_INACTIVO}`}
      >
        <ClipboardList className="h-5 w-5 shrink-0" />
        <span className="leading-tight text-center line-clamp-2">Pedidos</span>
      </Link>
    </nav>
  );
}
