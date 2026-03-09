"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
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

export default function TablaProveedoresGestion({ proveedores }: Props) {
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
      <Card className="card-contenedor-tabla h-full flex flex-col rounded-xl border border-card-border bg-card overflow-hidden shadow-sm">
        <CardContent className="flex-1 min-h-0 overflow-auto p-0">
          <Table variant="compact">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Proveedor</TableHead>
                <TableHead>Prefijo</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Productos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proveedores.map((prov) => (
                <TableRow key={prov.id}>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => openEdit(prov)}
                      className="text-primary hover:underline text-left"
                    >
                      {prov.nombre}
                    </button>
                  </TableCell>
                  <TableCell>{prov.prefijo}</TableCell>
                  <TableCell className="font-mono text-xs">{prov.codigoUnico}</TableCell>
                  <TableCell>{prov.cantProductos}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
