# TIENDA CAAPA - versión web limpia

Esta versión parte del proyecto original funcional y agrega una sola vez:
- Diseño verde TIENDA CAAPA.
- Menú Proveedores.
- CRUD de Ceja / Ingavi.
- Precio de compra, reseña, detalle del lugar, foto y GPS.
- Buscador automático de productos existentes.

## IMPORTANTE
No reemplaces ni recrees la base de datos.
Conserva tu archivo `.env` actual.

Si todavía no existe la tabla `proveedores_producto`, ejecuta UNA SOLA VEZ en Supabase SQL Editor:
`migrations/001_proveedores.sql`

## Ejecución
npm install
npm run dev

## Para actualizar un proyecto existente
Es preferible hacer una copia de seguridad y reemplazar los archivos del proyecto por esta carpeta limpia, conservando únicamente el `.env` real. No mezcles vistas viejas con las nuevas.
