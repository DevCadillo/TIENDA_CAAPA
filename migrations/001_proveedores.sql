-- Módulo Proveedores / Lugares de compra
-- Seguro para una base existente: solo crea una tabla e índices nuevos.
-- NO modifica ni elimina registros de productos, usuarios, categorías, stock o precios actuales.

CREATE TABLE IF NOT EXISTS proveedores_producto (
  id BIGSERIAL PRIMARY KEY,
  producto_id BIGINT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  lugar VARCHAR(20) NOT NULL CHECK (lugar IN ('Ceja', 'Ingavi')),
  precio_compra NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (precio_compra >= 0),
  resena VARCHAR(300),
  detalle_lugar TEXT,
  latitud NUMERIC(10,7),
  longitud NUMERIC(10,7),
  foto_lugar_url TEXT,
  usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_proveedor_producto_lugar UNIQUE (producto_id, lugar),
  CONSTRAINT ck_latitud_valida CHECK (latitud IS NULL OR latitud BETWEEN -90 AND 90),
  CONSTRAINT ck_longitud_valida CHECK (longitud IS NULL OR longitud BETWEEN -180 AND 180),
  CONSTRAINT ck_coordenadas_completas CHECK (
    (latitud IS NULL AND longitud IS NULL) OR
    (latitud IS NOT NULL AND longitud IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_proveedores_producto_producto ON proveedores_producto(producto_id);
CREATE INDEX IF NOT EXISTS idx_proveedores_producto_lugar ON proveedores_producto(lugar);
CREATE INDEX IF NOT EXISTS idx_proveedores_producto_precio ON proveedores_producto(precio_compra);
