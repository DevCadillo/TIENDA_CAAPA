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
