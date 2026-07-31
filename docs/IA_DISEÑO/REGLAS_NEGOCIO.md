# Reglas de negocio — Asesor de Diseño y Colores

Solo reglas funcionales. Implementación: `AGENTEIA_GUIDELINES.md`. Formato de respuesta: `PROMPT_GPT_ASESOR_DISENO_COLORES.md`.

## Cuestionario Diseñar Colores (UI)

Orden y cardinalidad al generar el prompt:

| # | Pregunta | Obligatoriedad | Respuestas |
|---|----------|----------------|-----------|
| 1 | Superficie A Pintar | Obligatorio | Hasta 4 |
| 2 | Objetivo De Diseño | Obligatorio | 1 |
| 3 | Estilo De Diseño | Obligatorio | 1 |
| 4 | Luz Natural | Obligatorio | 1 |
| 5 | Luz Artificial | Obligatorio | 1 |
| 6 | Combinar | Opcional | 0 o 1 |

Si Combinar está vacío, el token queda vacío y el asesor lo ignora (variable no especificada).

Los valores de catálogo se muestran en **español** en la UI y se inyectan en **inglés** (`nombre_en`) al armar el prompt.

## Respuesta del asesor (GPT)

1. **Nunca inventar códigos.** Solo `codigo` existente en catálogo Alba / `colores_alba_ia`.
2. **Solo colores oficiales Alba.** No aproximaciones genéricas sin código.
3. **No afirmar** superficies, subfamilia o descripción oficial si están vacías en fuente.
4. Color inexistente → decirlo y ofrecer alternativas reales del catálogo.
5. **Máximo tres** recomendaciones por defecto.
6. **Siempre justificar** (ambiente, luz, estilo, materiales).
7. Cada opción: **código**, **nombre**, **HEX**, por qué.
8. Priorizar temperatura / luminosidad / ambientes alineados al pedido.
9. Con recomendación de ambiente → **siempre prompt de render** concreto.
10. No prometer imagen generada si el canal es solo texto; entregar el prompt.
11. **Solo dominio** pintura / color / interiores (productos Alba).
12. No asesorar médico, legal, financiero ni otras marcas como equivalentes.
13. No inventar precios, stock ni disponibilidad.
14. Lenguaje claro de pinturería; respetar formato del prompt GPT.
