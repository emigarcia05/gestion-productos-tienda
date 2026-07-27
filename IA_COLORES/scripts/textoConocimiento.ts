/**
 * Construye texto_conocimiento: bloque legible para RAG, embeddings y prompts.
 */
export function buildTextoConocimiento(row: {
  codigo: string;
  nombre: string;
  hex: string;
  rgb: string;
  familia: string;
  temperatura: string;
  luminosidad: string;
  saturacion: string;
  nivel_luminosidad: string;
  nivel_saturacion: string;
  familia_visual: string;
  estilos_recomendados: string;
  ambientes_oficiales: string;
  ambientes_recomendados: string;
  combina_con: string;
  contrasta_con: string;
  sensacion_visual: string;
  descripcion_tecnica: string;
  descripcion_alba: string;
}): string {
  const parts: string[] = [
    `Color Alba ${row.codigo} — ${row.nombre}.`,
    `HEX ${row.hex}, RGB ${row.rgb}.`,
  ];

  if (row.familia) parts.push(`Familia oficial: ${row.familia}.`);
  if (row.descripcion_alba) parts.push(`Descripción Alba: ${row.descripcion_alba}`);

  if (row.temperatura) {
    parts.push(
      `Temperatura ${row.temperatura}; luminosidad ${row.nivel_luminosidad} (${row.luminosidad}/10); saturación ${row.nivel_saturacion} (${row.saturacion}/10).`,
    );
  }
  if (row.familia_visual) parts.push(`Familia visual: ${row.familia_visual}.`);
  if (row.sensacion_visual) {
    parts.push(`Sensación: ${row.sensacion_visual.replace(/;/g, ", ")}.`);
  }
  if (row.estilos_recomendados) {
    parts.push(`Estilos: ${row.estilos_recomendados.replace(/;/g, ", ")}.`);
  }
  if (row.ambientes_oficiales) {
    parts.push(`Ambientes Alba: ${row.ambientes_oficiales.replace(/;/g, ", ")}.`);
  }
  if (row.ambientes_recomendados) {
    parts.push(
      `Ambientes recomendados: ${row.ambientes_recomendados.replace(/;/g, ", ")}.`,
    );
  }
  if (row.combina_con) {
    parts.push(`Combina con: ${row.combina_con.replace(/;/g, ", ")}.`);
  }
  if (row.contrasta_con) {
    parts.push(`Contrasta con: ${row.contrasta_con.replace(/;/g, ", ")}.`);
  }
  if (row.descripcion_tecnica) parts.push(row.descripcion_tecnica);

  return parts.join(" ");
}
