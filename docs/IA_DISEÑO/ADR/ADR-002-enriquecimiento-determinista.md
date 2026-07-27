# ADR-002: Enriquecimiento determinista en capa 2

## Estado

Aceptado — 2026-07-27

## Problema

La carta Alba no publica todos los atributos útiles para diseño (temperatura, estilos, combinaciones). Hay que completar conocimiento sin inventar datos oficiales ni depender de un LLM para cada color.

## Alternativas

1. **Enriquecimiento 100 % con IA** (LLM por fila).
2. **Solo datos oficiales** sin capa 2.
3. **Reglas deterministas de colorimetría** sobre HEX/RGB + metadatos oficiales cuando existan.

## Decisión tomada

Implementar capa 2 con **`colorScience.ts`**: funciones reproducibles (HSL, luminancia WCAG, reglas de estilo/ambiente) que generan `colores_alba_tip_diseno.csv`.

## Motivos

- Reproducible y testeable; mismo input → mismo output.
- Sin costo de API ni riesgo de alucinación en códigos o nombres.
- Los ambientes oficiales de Alba se priorizan cuando existen en capa 1.

## Consecuencias

- El enriquecimiento “IA” del nombre del proyecto en capa 2 es **algorítmico** hoy; una fase futura puede añadir columnas LLM sin reemplazar la capa 2 base.
- Cambios en reglas de colorimetría requieren regenerar CSV y documentar en CHANGELOG.
