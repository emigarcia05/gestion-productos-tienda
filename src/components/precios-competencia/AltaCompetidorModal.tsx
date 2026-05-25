"use client";

import { useEffect, useState } from "react";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "sonner";
import { getProveedoresMercaderia } from "@/actions/proveedores";
import { createCompetenciaAction } from "@/actions/competenciaPrecios";
import type { CompetenciaParaCliente } from "@/services/competencia.service";
import CompetidorProveedorNombrePaginaFields, {
  SIN_PROVEEDOR_ASOCIADO,
  aplicarCambioProveedorCompetidor,
  type ProveedorCompetidorOption,
} from "@/components/precios-competencia/CompetidorProveedorNombrePaginaFields";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreado: (competidor: CompetenciaParaCliente) => void;
}

export default function AltaCompetidorModal({ open, onOpenChange, onCreado }: Props) {
  const [nombre, setNombre] = useState("");
  const [web, setWeb] = useState("");
  const [idProveedor, setIdProveedor] = useState<string>(SIN_PROVEEDOR_ASOCIADO);
  const [proveedores, setProveedores] = useState<ProveedorCompetidorOption[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNombre("");
    setWeb("");
    setIdProveedor(SIN_PROVEEDOR_ASOCIADO);
    void getProveedoresMercaderia().then((rows) =>
      setProveedores(rows.map((p) => ({ id: p.id, nombre: p.nombre })))
    );
  }, [open]);

  const handleGuardar = async () => {
    setSaving(true);
    try {
      const result = await createCompetenciaAction({
        nombre: nombre.trim(),
        web: web.trim(),
        idProveedor:
          idProveedor === SIN_PROVEEDOR_ASOCIADO ? null : idProveedor,
        configExtraccion: { reglaDefaultId: "", reglas: [] },
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Competidor creado.");
      onOpenChange(false);
      onCreado(result.data);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppModal
        size="md"
        title="Nuevo Competidor"
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="default"
              disabled={saving || !nombre.trim()}
              onClick={() => void handleGuardar()}
            >
              Crear
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Después de crearlo podés configurar cómo leer el precio en su sitio.
          </p>
          <CompetidorProveedorNombrePaginaFields
            idProveedor={idProveedor}
            nombre={nombre}
            web={web}
            proveedores={proveedores}
            disabled={saving}
            onIdProveedorChange={(value) =>
              aplicarCambioProveedorCompetidor(value, proveedores, setIdProveedor, setNombre)
            }
            onNombreChange={setNombre}
            onWebChange={setWeb}
          />
        </div>
      </AppModal>
    </Dialog>
  );
}
