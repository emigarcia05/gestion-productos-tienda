# Changelog — IA_DISEÑO

## 0.12.0 — 2026-08-03

**Descripción:** Pregunta **1. Modo De Diseño** (obligatoria, 1 respuesta). Catálogo `prod_ia_diseno_modo_diseno` en GESTION DISEÑO; variable `{{MODO_DISENO}}`. Orden: Modo → Superficie → Objetivo → Estilo → Luz Nat → Luz Art → Combinar.

**Motivo:** Priorizar el modo de diseño al inicio del cuestionario, gestionable desde el hub.

## 0.11.4 — 2026-07-31

**Descripción:** Bloques opcionales `{{#VAR}}…{{/VAR}}` en el prompt: si la variable está vacía, se omite el bloque (`omitirBloquesCondicionalesVacios` dentro de `aplicarVariablesAlPrompt`). Seed de Diseñar Colores envuelve la sección Combinar.

**Motivo:** Combinar es opcional; no dejar la frase/sección en el prompt cuando no hay respuesta.

## 0.11.3 — 2026-07-31

**Descripción:** Plantilla editable de superficies en `prod_ia_diseno_promp.plantilla_superficies` (GESTION PROMP · Diseñar Colores). Placeholders `{{SUPERFICIE}}` / `{{COLOR}}`; se repite 1–4 filas. Default: `- {{SUPERFICIE}} → {{COLOR}}`.

**Motivo:** Definir desde la UI cómo se escribe cada superficie+color, sin tocar el `texto` del catálogo.

## 0.11.2 — 2026-07-31

**Descripción:** Catálogos: columna `nombre_en` renombrada a **`texto`**. Convención: `nombre` = pantalla, `texto` = valor al generar el prompt (`textoCatalogoParaPrompt`).

**Motivo:** Clarificar semántica (no solo “inglés”) alineada al uso real del campo.

## 0.11.1 — 2026-07-31

**Descripción:** `formatSuperficiesParaPrompt` → `Paint the {{Surface Name}} with a color of your choice (Color A|B|C|D)` (1–4 filas; Title Case del `nombre_en`). Select UI: Color A–D.

**Motivo:** Formato de instrucción en inglés pedido para GPT; letras en lugar de números.

## 0.11.0 — 2026-07-31

**Descripción:** Catálogos GESTION DISEÑO con `nombre` (ES, UI) + `nombre_en` (EN, prompt). CRUD pide ambos; `nombreCatalogoParaPrompt` inyecta inglés al generar.

**Motivo:** Mejor precisión del prompt en inglés sin cambiar la UX en español.

## 0.10.9 — 2026-07-31

**Descripción:** `formatSuperficiesParaPrompt` deja la tabla Markdown y pasa lista: `- Nombre {{ColorN}}.` (una línea por superficie).

**Motivo:** Formato pedido para inyectar `{{SUPERFICIES}}` en el prompt final.

## 0.10.8 — 2026-07-31

**Descripción:** Lookup de `prod_ia_diseno_promp.submodulo` **case-insensitive** (`mode: "insensitive"` + `mismoSubmoduloPromp`). GESTION PROMP & URL lista el **módulo canónico** del hub por fila (`submoduloCanonicoDesdeBd`).

**Motivo:** Las filas en BD están en MAYÚSCULAS (`DISEÑAR COLORES`, `BUSCAR COLOR DESDE IMAGEN`) y la comparación exacta contra los nombres canónicos nunca matcheaba: el runtime caía siempre al prompt default de código, así que los prompts editados no se usaban.

## 0.10.7 — 2026-07-31

**Descripción:** Diseñar Colores: nuevo orden 1 Superficie (≤4) → 2 Objetivo (1) → 3 Estilo (1) → 4 Luz Natural (1) → 5 Luz Artificial (1) → 6 Combinar (opcional, 1). Hub GESTION DISEÑO con etiquetas numeradas idénticas al acordeón; Objetivo/Combinar pasan a selección única.

**Motivo:** Definir obligatoriedad y cardinalidad del cuestionario; Combinar al final como opcional; alinear nombres del hub con la página.

## 0.10.6 — 2026-07-31

**Descripción:** Restaurado el armado del informe en `handleGenerarPdf` (Buscar Código Desde Imagen): `imagenDataUrl`, `imagenNaturalW/H`, `muestra: { color, x, y }` y `coincidencias`, según `InformeAproximacionCodigoImagen`.

**Motivo:** La refactorización de 0.10.3 pasaba `metaMuestra` como `muestra` y rompía el build (`Property 'color' is missing in type 'MuestraPuntoImagen'`).

## 0.10.5 — 2026-07-30

**Descripción:** Hub GESTION DISEÑO reordenado (preguntas 1–6) + catálogos `luz_natural` / `luz_artificial` (`prod_ia_diseno_luz_nat` / `_luz_art`) con seed; formulario lee luz desde catálogo.

**Motivo:** Alinear el menú de gestión con el orden del cuestionario y permitir editar opciones de iluminación.

## 0.10.4 — 2026-07-30

**Descripción:** Diseñar Colores: preguntas 5–6 de iluminación natural/artificial (opción única, listas fijas) + variables `{{ILUMINACION_NATURAL}}` / `{{ILUMINACION_ARTIFICIAL}}`.

**Motivo:** Incorporar contexto lumínico al prompt del asesor de color.

## 0.10.3 — 2026-07-30

**Descripción:** Al copiar/generar el prompt se relee la config desde BD (`resolverConfigAsistenteIa`); al guardar se actualiza el estado del cliente. Evita pegar el Prompt Maestro viejo tras editar.

**Motivo:** La página pasaba props stale del primer render y `router.refresh` no alcanzaba a actualizar el clipboard.

## 0.10.2 — 2026-07-30

**Descripción:** En Editar Prompt, chips por variable reemplazados por botón **Insertar Variable** + desplegable (`DropdownMenu`).

**Motivo:** Un solo control para elegir e insertar el token en el prompt.

## 0.10.1 — 2026-07-30

**Descripción:** Eliminada la variable inyectable `{{CANTIDAD_COLORES}}` / fuente «Cantidad de colores» del catálogo y del runtime de Diseñar Colores.

**Motivo:** La cantidad ya no se pide ni se inyecta; el número de colores se deduce de las asignaciones Color N en `{{SUPERFICIES}}`.

## 0.10.0 — 2026-07-30

**Descripción:** **Gestionar Variables** en Editar Prompt: listado de fuentes inyectables por módulo + nombre MAYÚSCULA persistido en `prod_ia_diseno_promp_var`; chips y runtime usan el alias.

**Motivo:** Que el editor controle qué etiqueta `{{…}}` corresponde a cada respuesta/dato de la app.

## 0.9.2 — 2026-07-30

**Descripción:** Variables de Diseñar Colores en MAYÚSCULA; `{{SUPERFICIES}}` con tabla Markdown cuando hay 2+ superficies (formato óptimo para GPT).

**Motivo:** Estandarizar tokens y mejorar la interpretación de asignaciones superficie↔ColorN.

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
