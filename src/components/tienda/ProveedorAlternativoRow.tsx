import { ArrowRightLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Props {
  id: string;
  prefijo: string;
  precioFinalLabel: string;
  variacionNode: React.ReactNode;
  zebraClass: string;
  esMenorCostoAlternativo: boolean;
  disabled?: boolean;
  onCambiarPrincipal: () => void;
  onEliminar: () => void;
}

export default function ProveedorAlternativoRow({
  id,
  prefijo,
  precioFinalLabel,
  variacionNode,
  zebraClass,
  esMenorCostoAlternativo,
  disabled,
  onCambiarPrincipal,
  onEliminar,
}: Props) {
  const filaClasses = [
    "modal-vinculos-fila",
    zebraClass,
    esMenorCostoAlternativo ? "modal-vinculos-fila--destacado" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div key={id} className={filaClasses}>
      <div className="modal-vinculos-celda modal-vinculos-celda--centrado">
        <Button
          variant="outline"
          size="sm"
          onClick={onCambiarPrincipal}
          disabled={disabled}
          title="Marcar como proveedor principal del ítem"
          className={`btn-convertir-proveedor-principal ${esMenorCostoAlternativo ? "btn-convertir-proveedor-principal--destacado" : ""}`}
        >
          <ArrowRightLeft className="h-3 w-3 shrink-0" />
          <span className="block">
            <span className="block">Convertir</span>
            <span className="block">Principal</span>
          </span>
        </Button>
      </div>

      <div className="modal-vinculos-celda modal-vinculos-celda--contenido-y-variacion">
        <div className="modal-vinculos-fila-principal-contenido">
          <Badge variant="secondary" className="modal-vinculos-prefijo">
            {prefijo}
          </Badge>
          <span className="modal-vinculos-celda--principal-numero">
            {precioFinalLabel}
          </span>
        </div>
        <div className="modal-vinculos-celda--variacion">{variacionNode}</div>
      </div>

      <div className="modal-vinculos-celda modal-vinculos-celda--acciones">
        <Button
          variant="ghost"
          size="icon"
          onClick={onEliminar}
          disabled={disabled}
          className="btn-desvincular-icono"
          title="Desvincular"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

