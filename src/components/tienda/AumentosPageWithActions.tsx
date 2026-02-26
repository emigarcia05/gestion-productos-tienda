"use client";

import { useRef } from "react";
import SectionHeader from "@/components/SectionHeader";
import TablaAumentos from "@/components/tienda/TablaAumentos";
import ExportarAumentosButton from "@/components/tienda/ExportarAumentosButton";
import type { ControlAumentosData } from "@/actions/tienda";
import type { TablaAumentosHandle } from "./TablaAumentos";

interface Props {
  data: ControlAumentosData;
}

export default function AumentosPageWithActions({ data }: Props) {
  const tableRef = useRef<TablaAumentosHandle>(null);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <SectionHeader
        titulo="Lista Tienda"
        subtitulo="Control aumentos"
        actions={<ExportarAumentosButton tableRef={tableRef} />}
      />

      <div className="flex-1 overflow-hidden max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-4">
        <TablaAumentos ref={tableRef} data={data} />
      </div>
    </div>
  );
}
