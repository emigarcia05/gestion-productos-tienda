# Changelog — IA_DISEÑO

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
