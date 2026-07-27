# Documentación (retroalimentación IA)

| Documento | Cuándo leerlo |
|-----------|---------------|
| [FRONTEND_GUIDELINES.md](./FRONTEND_GUIDELINES.md) | UI / componentes / estilos — **solo la sección del módulo tocado**, no el archivo entero |
| [BACKEND_GUIDELINES.md](./BACKEND_GUIDELINES.md) | Actions / servicios / Prisma — **buscar el § del dominio** |
| [AGENTEIA_GUIDELINES.md](./AGENTEIA_GUIDELINES.md) | IA Diseño: capas, CSV, scraper, UI Asistente IA |
| [IA_DISEÑO/](./IA_DISEÑO/) | Índice del módulo, reglas, prompt GPT, ADRs, CSVs |

## IA Diseño — lectura mínima

1. [AGENTEIA_GUIDELINES.md](./AGENTEIA_GUIDELINES.md)
2. [REGLAS_NEGOCIO.md](./IA_DISEÑO/REGLAS_NEGOCIO.md) si cambia el comportamiento del asesor
3. ADRs `001` / `002` / `004` / `005` si cambia arquitectura

CSV para cargar a un GPT: **`IA_DISEÑO/colores_alba_ia.csv`**.

```bash
npm run ia-diseno:pipeline
```
