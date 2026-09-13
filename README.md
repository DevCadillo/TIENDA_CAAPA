# Sistema de Inventario de Tienda

Aplicación web con Node.js + Express + EJS + PostgreSQL/Supabase.

## Funciones
- Login con sesiones persistidas en PostgreSQL.
- Roles: administrador y empleado.
- CRUD de productos para administradores.
- Empleados con acceso de solo lectura al inventario.
- Buscador por nombre o número/código.
- Dashboard: total, disponibles, poco stock, sin stock y gráfica por categorías.
- Entradas y salidas de stock con historial.
- Historial automático de cambios de precios.
- Imágenes mediante Supabase Storage.
- Gestión de cuentas de empleados/administradores.

## Requisitos
- Node.js 20 o superior.
- Una cuenta/proyecto Supabase.
- PostgreSQL de Supabase.

## Instalación local
1. Copia `.env.example` como `.env`.
2. En Supabase abre SQL Editor y ejecuta todo `schema.sql`.
3. En Supabase Storage crea un bucket público llamado `product-images`.
4. Completa `.env` con `DATABASE_URL`, `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`.
5. Ejecuta:

```bash
npm install
npm run seed:admin
npm run dev
```

6. Abre http://localhost:3000

## Importante
`SUPABASE_SERVICE_ROLE_KEY` es secreta. Nunca la publiques en GitHub ni la coloques en JavaScript del navegador.

## Despliegue en Render
- Sube el proyecto a GitHub sin el archivo `.env`.
- En Render crea un Web Service conectado al repositorio.
- Build Command: `npm install`
- Start Command: `npm start`
- Agrega las variables de `.env` en Environment de Render.
- Define `NODE_ENV=production`.
<<<<<<< HEAD

## Módulo Proveedores / lugares de compra
Se añadió una pestaña **Proveedores** sin modificar las columnas ni los registros existentes de `productos`.

Funciones nuevas:
- Usa los productos existentes (imagen, nombre y código) mediante búsqueda automática.
- Registra un precio de compra/original independiente del precio de venta del inventario.
- Permite exactamente un registro **Ceja** y uno **Ingavi** por producto.
- Reseña y descripción detallada del lugar de compra.
- Foto del lugar mediante el mismo Supabase Storage.
- Captura la ubicación actual mediante GPS/geolocalización del navegador.
- Botón **Ir a ubicación** que abre las coordenadas en Google Maps.
- Buscador, filtro por Ceja/Ingavi y orden por precio.
- CRUD restringido a administrador; empleados tienen solo lectura.

### Si ya tienes la base de datos llena
**NO vuelvas a ejecutar todo `schema.sql` por necesidad.** En tu Supabase SQL Editor ejecuta únicamente:

`migrations/001_proveedores.sql`

Ese script crea solo la tabla e índices del nuevo módulo y no borra ni cambia tus productos actuales.

### Importante sobre ubicación
La geolocalización del navegador funciona en `localhost` y en sitios HTTPS. En producción (Render u otro hosting) debes entrar por HTTPS y permitir ubicación en el navegador/celular.
=======
>>>>>>> fb5b3b6ce7b41d4879e6287e9c2b3b53e4ddcf05
