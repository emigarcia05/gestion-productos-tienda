"use client";

import Link from "next/link";
import { FileOutput } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function GenerarPedidoButton() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="default" size="default" className="btn-primario-gestion gap-2" asChild>
          <Link href="/pedidos/historial">
            <FileOutput className="h-4 w-4" />
            Generar Pedido
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent>Generar archivo de pedido</TooltipContent>
    </Tooltip>
  );
}
