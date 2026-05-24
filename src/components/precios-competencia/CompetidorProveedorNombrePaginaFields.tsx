"use client";

import ModalMicroLabel from "@/components/shared/ModalMicroLabel";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const SIN_PROVEEDOR_ASOCIADO = "__SIN_PROVEEDOR__";

export type ProveedorCompetidorOption = { id: string; nombre: string };

interface Props {
  idProveedor: string;
  nombre: string;
  web: string;
  proveedores: ProveedorCompetidorOption[];
  disabled?: boolean;
  onIdProveedorChange: (value: string) => void;
  onNombreChange: (value: string) => void;
  onWebChange: (value: string) => void;
}

export function aplicarCambioProveedorCompetidor(
  value: string,
  proveedores: ProveedorCompetidorOption[],
  setIdProveedor: (id: string) => void,
  setNombre: (nombre: string) => void
): void {
  setIdProveedor(value);
  if (value === SIN_PROVEEDOR_ASOCIADO) return;
  const prov = proveedores.find((p) => p.id === value);
  if (prov) setNombre(prov.nombre);
}

export default function CompetidorProveedorNombrePaginaFields({
  idProveedor,
  nombre,
  web,
  proveedores,
  disabled = false,
  onIdProveedorChange,
  onNombreChange,
  onWebChange,
}: Props) {
  const nombreBloqueadoPorProveedor = idProveedor !== SIN_PROVEEDOR_ASOCIADO;

  return (
    <>
      <div>
        <ModalMicroLabel>Proveedor</ModalMicroLabel>
        <Select
          value={idProveedor}
          onValueChange={onIdProveedorChange}
          disabled={disabled}
        >
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
      <div>
        <ModalMicroLabel>Nombre</ModalMicroLabel>
        <Input
          value={nombre}
          onChange={(e) => onNombreChange(e.target.value)}
          placeholder="Nombre del competidor"
          className="mt-1"
          disabled={nombreBloqueadoPorProveedor || disabled}
          readOnly={nombreBloqueadoPorProveedor}
        />
      </div>
      <div>
        <ModalMicroLabel>Pagina</ModalMicroLabel>
        <Input
          value={web}
          onChange={(e) => onWebChange(e.target.value)}
          placeholder="https://ejemplo.com"
          className="mt-1"
          disabled={disabled}
        />
      </div>
    </>
  );
}
