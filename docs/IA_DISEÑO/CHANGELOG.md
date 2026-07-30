# Changelog — IA_DISEÑO

## 0.9.1 — 2026-07-30

**Descripción:** Prompt Maestro de Diseñar Colores como seed; variables `{{Superficies}}` / `{{Objetivos}}` / `{{Estilo}}` / `{{CombinarCon}}` rellenadas desde el formulario (`Superficie, ColorN`; vacías si no aplica).

**Motivo:** Estandarizar el prompt del asesor y completar automáticamente las variables según la selección del usuario.

## 0.9.0 — 2026-07-30

**Descripción:** Módulo hub **Diseñar Colores**: foto de referencia a la izquierda + cuestionario (cantidad, superficies→Color N, objetivos, estilo, combinar) a la derecha; variables de prompt y CTA copiar/abrir ChatGPT.

**Motivo:** Estandarizar el pedido de recomendaciones de color antes de consultar al asesor.

## 0.8.1 — 2026-07-30

**Descripción:** Catálogo **Objetivos De Diseño** (`prod_ia_diseno_objetivo`) en **GESTION DISEÑO**.

**Motivo:** Completar las listas del formulario de recomendaciones de colores.

## 0.8.0 — 2026-07-30

**Descripción:** **GESTION DISEÑO** en Asistente IA: tablas `prod_ia_diseno_sup_pintar`, `prod_ia_diseno_estilos`, `prod_ia_diseno_combinar`; botón header + modal hub + CRUD por catálogo (buscador + `+` / editar / borrar).

**Motivo:** Catálogos para estandarizar el formulario de recomendaciones de colores (siguiente fase).

## 0.7.0 — 2026-07-28

**Descripción:** PDF de aproximación de código desde imagen (jsPDF cliente): imagen anotada + 5 coincidencias parseadas de la respuesta IA. Prompt seed con columna HEX.

**Motivo:** Entregar un informe imprimible al cerrar el flujo Buscar Código Desde Imagen.

## 0.6.0 — 2026-07-28

**Descripción:** Rename UI **Buscar Código Desde Imagen**; hub con tiles 2:1 (`AsistenteIaFuncionTile`). Lookup de prompt compatible con nombre legacy.

**Motivo:** Acceso por función (ícono + nombre en mayúsculas) y alinear el nombre del módulo al objetivo (código Alba).

## 0.5.0 — 2026-07-27

**Descripción:** Variables de prompt con sintaxis `{{CLAVE}}` (p. ej. `{{RGB}}`); chips **Insertar Variable** en GESTION PROMP & URL; el cuentagotas completa `{{RGB}}` (compat `(R,G,B)`).

**Motivo:** Marcar explícitamente qué partes del prompt se rellenan en runtime.

## 0.4.0 — 2026-07-27

**Descripción:** UI **Buscar Color Desde Imagen** — cuentagotas local (**Abrir Imagen Muestra**, selección de zona, RGB). El prompt es el de `prod_ia_diseno_promp`; se reemplaza el placeholder `(R,G,B)` con el color muestado. La imagen no se guarda en servidor.

**Motivo:** Tomar el color real de una muestra e inyectarlo en el prompt configurable del módulo antes de consultar el catálogo vía ChatGPT.

## 0.3.0 — 2026-07-27

**Descripción:** Auditoría documental: eliminado `VISION_PROYECTO.md`; `AGENTEIA_GUIDELINES` pasa a ser la guía operativa única; README del módulo reducido a índice; `REGLAS`/`PROMPT` acotados; ADR-005.

**Motivo:** Menos solapamiento y menor costo de lectura para la IA, sin perder reglas ni decisiones (ADRs).

## 0.2.0 — 2026-07-27

Centralización en `docs/` + renombre `IA_DISEÑO` (ADR-004).

## 0.1.0 — 2026-07-27

Bootstrap pipeline CSV + docs + ADRs iniciales.
