"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Handshake, ShoppingBag, ClipboardList, PackageSearch } from "lucide-react";

const ITEM_BASE =
  "flex flex-col items-center justify-center gap-0.5 min-w-[4rem] py-2 px-2 rounded-lg border-2 text-xs font-medium transition-all duration-200";
const ITEM_INACTIVO =
  "border-brand/40 bg-card/50 text-accent2 hover:border-brand hover:bg-brand/10 hover:shadow-sm";
const ITEM_ACTIVO = "border-brand bg-brand text-white shadow-md";

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
        className={`${ITEM_BASE} ${proveedoresActivo ? ITEM_ACTIVO : ITEM_INACTIVO}`}
      >
        <Handshake className="h-5 w-5 shrink-0" />
        <span className="leading-tight text-center">Lista Proveedores</span>
      </Link>

      {mostrarTienda && (
        <Link
          href="/tienda"
          className={`${ITEM_BASE} ${tiendaActivo ? ITEM_ACTIVO : ITEM_INACTIVO}`}
        >
          <ShoppingBag className="h-5 w-5 shrink-0" />
          <span className="leading-tight text-center">Lista Tienda</span>
        </Link>
      )}

      {mostrarStock && (
        <Link
          href="/stock"
          className={`${ITEM_BASE} ${stockActivo ? ITEM_ACTIVO : ITEM_INACTIVO}`}
        >
          <PackageSearch className="h-5 w-5 shrink-0" />
          <span className="leading-tight text-center">Control Stock</span>
        </Link>
      )}

      <Link
        href="/pedidos"
        className={`${ITEM_BASE} ${pedidosActivo ? ITEM_ACTIVO : ITEM_INACTIVO}`}
      >
        <ClipboardList className="h-5 w-5 shrink-0" />
        <span className="leading-tight text-center">Pedidos</span>
      </Link>
    </nav>
  );
}
