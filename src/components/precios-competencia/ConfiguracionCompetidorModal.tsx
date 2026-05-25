"use client";

import { useEffect, useState } from "react";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "sonner";
import { getProveedoresMercaderia } from "@/actions/proveedores";
import { updateCompetenciaAction } from "@/actions/competenciaPrecios";
import type { CompetenciaParaCliente } from "@/services/competencia.service";
import {
  type CompetenciaConfigExtraccion,
} from "@/lib/competenciaConfigExtraccion";
import CompetenciaExtraccionReglasEditor from "@/components/precios-competencia/CompetenciaExtraccionReglasEditor";
import CompetidorProveedorNombrePaginaFields, {
  SIN_PROVEEDOR_ASOCIADO,
  aplicarCambioProveedorCompetidor,
  type ProveedorCompetidorOption,
} from "@/components/precios-competencia/CompetidorProveedorNombrePaginaFields";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  competidor: CompetenciaParaCliente | null;
  onGuardado: () => void;
}

const CONFIG_VACIA: CompetenciaConfigExtraccion = { reglaDefaultId: "", reglas: [] };

export default function ConfiguracionCompetidorModal({
  open,
  onOpenChange,
  competidor,
  onGuardado,
}: Props) {
  const [nombre, setNombre] = useState("");
  const [web, setWeb] = useState("");
  const [idProveedor, setIdProveedor] = useState<string>(SIN_PROVEEDOR_ASOCIADO);
  const [proveedores, setProveedores] = useState<ProveedorCompetidorOption[]>([]);
  const [configExtraccion, setConfigExtraccion] =
    useState<CompetenciaConfigExtraccion>(CONFIG_VACIA);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !competidor) return;
    const pid = competidor.idProveedor ?? SIN_PROVEEDOR_ASOCIADO;
    setWeb(competidor.web);
    setIdProveedor(pid);
    setConfigExtraccion(competidor.configExtraccion ?? CONFIG_VACIA);
    void getProveedoresMercaderia().then((rows) => {
      const mapped = rows.map((p) => ({ id: p.id, nombre: p.nombre }));
      setProveedores(mapped);
      if (pid !== SIN_PROVEEDOR_ASOCIADO) {
        const prov = mapped.find((p) => p.id === pid);
        setNombre(prov?.nombre ?? competidor.nombre);
      } else {
        setNombre(competidor.nombre);
      }
    });
  }, [open, competidor]);

  const handleGuardar = async () => {
    if (!competidor) return;
    setSaving(true);
    try {
      const result = await updateCompetenciaAction({
        id: competidor.id,
        nombre: nombre.trim(),
        web: web.trim(),
        idProveedor:
          idProveedor === SIN_PROVEEDOR_ASOCIADO ? null : idProveedor,
        configExtraccion,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Configuración guardada.");
      onOpenChange(false);
      onGuardado();
    } finally {
      setSaving(false);
    }
  };

  if (!competidor) return null;

  const tituloNombre = (nombre.trim() || competidor.nombre).toLocaleUpperCase("es");
  const titulo = `Configuracion Competidor - ${tituloNombre}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppModal
        size="xl"
        title={titulo}
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
              Guardar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-1">
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
          <CompetenciaExtraccionReglasEditor
            value={configExtraccion}
            onChange={setConfigExtraccion}
          />
        </div>
      </AppModal>
    </Dialog>
  );
}
