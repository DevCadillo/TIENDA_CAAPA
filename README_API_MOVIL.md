# API móvil TIENDA CAAPA

Esta versión agrega las rutas requeridas por la app Flutter:

- POST `/api/mobile/login`
- POST `/api/mobile/logout`
- GET `/api/mobile/me`
- GET `/api/mobile/status`
- GET `/api/mobile/productos`
- GET `/api/mobile/productos/buscar?q=`
- GET `/api/mobile/proveedores`
- POST `/api/mobile/proveedores`
- PUT `/api/mobile/proveedores/:id`
- DELETE `/api/mobile/proveedores/:id`

## Prueba rápida después de desplegar en Render
Abre:

`https://tienda-caapa.onrender.com/api/mobile/status`

Debe responder JSON parecido a:

```json
{"ok":true,"app":"TIENDA CAAPA","api":"mobile","version":1}
```

Si esa URL da 404, Render todavía está ejecutando una versión anterior.
