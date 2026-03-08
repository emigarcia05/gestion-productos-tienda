"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog } from "@/components/ui/dialog";
import ProveedorModal, { type ProveedorParaModal } from "./ProveedorModal";
import type { ProveedorListItem } from "@/services/proveedor.service";

interface Props {
  proveedores: ProveedorListItem[];
}

export default function TablaProveedoresLista({ proveedores }: Props) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalProveedor, setModalProveedor] = useState<ProveedorParaModal | null>(null);

  function openEdit(prov: ProveedorListItem) {
    setModalProveedor({ id: prov.id, nombre: prov.nombre, prefijo: prov.prefijo });
    setModalOpen(true);
  }

  function handleSuccess() {
    setModalOpen(false);
    setModalProveedor(null);
    router.refresh();
  }

  return (
    <>
      <div className="flex flex-col h-full min-h-0 gap-0.5">
        <div className="contenedor-tabla-gestion no-scroll-x no-scrollbar flex-1 min-h-0">
          <Table variant="compact" scrollX={false}>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="min-w-0">Proveedor</TableHead>
                <TableHead className="w-24">Prefijo</TableHead>
                <TableHead className="w-28">Cant. Productos</TableHead>
                <TableHead className="w-36">Cant. Productos Provistos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proveedores.map((prov) => (
                <TableRow key={prov.id}>
                  <TableCell className="celda-datos min-w-0">
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={() => openEdit(prov)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openEdit(prov);
                        }
                      }}
                      className="text-primary hover:underline truncate block text-left w-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded"
                    >
                      {prov.nombre}
                    </span>
                  </TableCell>
                  <TableCell className="celda-datos celda-mono whitespace-nowrap">{prov.prefijo}</TableCell>
                  <TableCell className="celda-datos celda-numero">{prov.cantProductos.toLocaleString()}</TableCell>
                  <TableCell className="celda-datos celda-numero">{prov.cantProductosProvistos.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <ProveedorModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          proveedor={modalProveedor}
          onSuccess={handleSuccess}
        />
      </Dialog>
    </>
  );
}
