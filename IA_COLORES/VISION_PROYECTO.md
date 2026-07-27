# Visión del proyecto — Asesor Inteligente de Diseño y Colores

## Qué es

Plataforma de conocimiento reutilizable para una pinturería: catálogo oficial Alba enriquecido con atributos de diseño (temperatura, luminosidad, estilos, combinaciones) y un agente IA que asesora en elección de colores, ambientes y renders.

No es solo un GPT personalizado: es una **base de datos de conocimiento** independiente del modelo de IA, con pipeline documentado y reglas de negocio explícitas.

## Qué pretende lograr

1. **Asesoría confiable:** recomendaciones basadas en colores reales del catálogo Alba, nunca inventados.
2. **Conocimiento escalable:** un mismo dataset alimenta GPT, Gemini, APIs, WhatsApp y aplicaciones web.
3. **Operación mantenible:** actualización del catálogo vía scraper; regeneración de capas derivadas sin edición manual.
4. **Experiencia de diseño:** hasta tres recomendaciones justificadas, con prompt de render para visualización.

## Cómo evolucionará

### Fase 1 — Fundación (actual)

- Scraper Alba → CSV oficial + imágenes.
- Enriquecimiento determinista (colorimetría).
- CSV unificado para IA.
- Documentación, ADRs, prompt del asesor.

### Fase 2 — Consumo interno

- API o servicio en el monorepo para consultar colores y recomendaciones.
- Integración en herramientas internas (gestión productos, marketing).

### Fase 3 — Canales externos

- GPT / Gemini personalizados conectados a la base de conocimiento.
- WhatsApp u otros canales con el mismo backend.
- Búsqueda semántica (embeddings) sobre `texto_conocimiento`.

### Fase 4 — Experiencia cliente

- Aplicación web para clientes finales (simulador, asesor, carrito).
- Posible enriquecimiento IA supervisado (textos de marketing validados).

## Principios no negociables

- Escalabilidad y mantenibilidad por encima de rapidez.
- El conocimiento es del negocio, no del proveedor de IA.
- Toda decisión arquitectónica relevante queda en ADR.
