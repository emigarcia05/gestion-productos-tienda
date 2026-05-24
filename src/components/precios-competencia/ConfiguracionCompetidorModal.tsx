"use client";

import { useEffect, useState } from "react";
import AppModal from "@/components/shared/AppModal";
import ModalMicroLabel from "@/components/shared/ModalMicroLabel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "sonner";
import { getProveedores } from "@/actions/proveedores";
import { updateCompetenciaAction } from "@/actions/competenciaPrecios";
import type { CompetenciaParaCliente } from "@/services/competencia.service";
import {
  type CompetenciaConfigExtraccion,
} from "@/lib/competenciaConfigExtraccion";
import CompetenciaExtraccionReglasEditor from "@/components/precios-competencia/CompetenciaExtraccionReglasEditor";

const SIN_PROVEEDOR_ASOCIADO = "__SIN_PROVEEDOR__";

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
  const [proveedores, setProveedores] = useState<{ id: string; nombre: string }[]>([]);
  const [configExtraccion, setConfigExtraccion] =
    useState<CompetenciaConfigExtraccion>(CONFIG_VACIA);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !competidor) return;
    setNombre(competidor.nombre);
    setWeb(competidor.web);
    setIdProveedor(competidor.idProveedor ?? SIN_PROVEEDOR_ASOCIADO);
    setConfigExtraccion(competidor.configExtraccion ?? CONFIG_VACIA);
    void getProveedores().then((rows) =>
      setProveedores(rows.map((p) => ({ id: p.id, nombre: p.nombre })))
    );
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
              disabled={saving || !nombre.trim() || !web.trim()}
              onClick={() => void handleGuardar()}
            >
              Guardar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <ModalMicroLabel>Nombre</ModalMicroLabel>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre del competidor"
              className="mt-1"
            />
          </div>
          <div>
            <ModalMicroLabel>Sitio Web</ModalMicroLabel>
            <Input
              value={web}
              onChange={(e) => setWeb(e.target.value)}
              placeholder="https://ejemplo.com"
              className="mt-1"
            />
          </div>
          <div>
            <ModalMicroLabel>Proveedor (Px. Vta. Sugerido)</ModalMicroLabel>
            <p className="mt-1 text-xs text-muted-foreground">
              Si el producto está vinculado en lista proveedor con Px. Vta. Sugerido, el
              relevamiento usa ese valor y no hace scraping.
            </p>
            <Select value={idProveedor} onValueChange={setIdProveedor}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue placeholder="SELECCIONAR PROVEEDOR" />
              </SelectTrigger>
              <SelectContent position="popper" side="bottom" align="start">
                <SelectItem value={SIN_PROVEEDOR_ASOCIADO}>SIN PROVEEDOR</SelectItem>
                {proveedores.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nombre.toLocaleUpperCase("es")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <CompetenciaExtraccionReglasEditor
            value={configExtraccion}
            onChange={setConfigExtraccion}
          />
        </div>
      </AppModal>
    </Dialog>
  );
}
