# Reglas de negocio — Asesor de Diseño y Colores

Solo reglas funcionales. Implementación: `AGENTEIA_GUIDELINES.md`. Formato de respuesta: `PROMPT_GPT_ASESOR_DISENO_COLORES.md`.

## Cuestionario Diseñar Colores (UI)

Orden y cardinalidad al generar el prompt:

| # | Pregunta | Obligatoriedad | Respuestas |
|---|----------|----------------|-----------|
| 1 | Modo De Diseño | Obligatorio | 1 |
| 2 | Superficie A Pintar | Obligatorio | Hasta 4 |
| 3 | Objetivo De Diseño | Obligatorio | 1 |
| 4 | Estilo De Diseño | Obligatorio | 1 |
| 5 | Luz Natural | Obligatorio | 1 |
| 6 | Luz Artificial | Obligatorio | 1 |
| 7 | Combinar | Opcional | 0 o 1 |

Si Combinar está vacío: con el bloque `{{#COMBINARCON}}…{{/COMBINARCON}}` en el prompt, **no se incluye** esa sección en el texto generado. Sin el bloque, el token queda vacío y el Prompt Maestro indica ignorar variables vacías.

Los valores de catálogo se muestran con **`nombre`** en la UI y se inyectan con **`texto`** al armar el prompt. Excepción **Superficies**: `texto` + Color A–D se combinan con una plantilla única (`plantilla_superficies`) repetida por cada superficie elegida.

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
