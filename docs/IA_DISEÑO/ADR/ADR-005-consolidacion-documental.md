# ADR-005: Consolidación documental IA_DISEÑO

## Estado

Aceptado — 2026-07-27

## Problema

Había solapamiento entre `README_PROYECTO_IA_DISENO`, `AGENTEIA_GUIDELINES`, `VISION_PROYECTO` y partes de `PROMPT`/`REGLAS`, lo que alargaba la lectura obligatoria de la IA sin aportar información nueva.

## Alternativas

1. Mantener todos los archivos y solo acortar el checklist.
2. Eliminar guías FE/BE (rechazado: son la fuente de verdad del monorepo).
3. Unificar operación en `AGENTEIA_GUIDELINES`, reducir README a índice, eliminar `VISION`, acotar `REGLAS`/`PROMPT`, ADR de consolidación.

## Decisión tomada

Opción **3**.

## Motivos

- Una sola fuente operativa para capas/comandos/UI.
- Checklist de lectura más corto.
- ADRs históricos intactos (001–004); memoria detallada vive en ADR, no duplicada en la guía.

## Consecuencias

- `VISION_PROYECTO.md` eliminado (roadmap en AGENTEIA).
- `README_PROYECTO_IA_DISENO.md` es índice corto.
- Actualizar reglas Cursor y `docs/README.md`.
