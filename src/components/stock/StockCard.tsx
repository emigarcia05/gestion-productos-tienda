"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PackageSearch } from "lucide-react";
import { toast } from "sonner";
import SyncModal from "@/components/shared/SyncModal";
import { useListaPreciosTiendaModalSync } from "@/hooks/useListaPreciosTiendaModalSync";

const TARJETA =
  "flex flex-col items-center justify-between w-44 h-56 rounded-2xl border-2 border-brand bg-card/80 hover:shadow-lg hover:shadow-brand/20 hover:scale-105 transition-all duration-200 p-5 group cursor-pointer select-none";

export default function StockCard() {
  const router = useRouter();
  const [modal, setModal] = useState(false);

  const { syncing, progreso, iniciarSync } = useListaPreciosTiendaModalSync((info) => {
    setModal(false);
    const n = info.total > 0 ? info.total : info.processed;
    toast.success(`Base de datos actualizada — ${n.toLocaleString("es-AR")} ítems procesados.`, {
      duration: 3000,
    });
    sessionStorage.setItem("stockSyncJustDone", "1");
    router.push("/gestion-productos/tienda/control-stock");
  });

  return (
    <>
      <button type="button" className={TARJETA} onClick={() => setModal(true)}>
        <div className="flex-1 flex items-center justify-center w-full">
          <PackageSearch className="w-16 h-16 text-brand transition-colors" />
        </div>
        <span className="text-base font-medium text-accent2 text-center leading-tight">
          Control Stock
        </span>
      </button>

      {modal && (
        <SyncModal
          syncing={syncing}
          progreso={progreso}
          onConfirm={iniciarSync}
          onCancel={() => {
            if (!syncing) setModal(false);
          }}
        />
      )}
    </>
  );
}
