CREATE TABLE IF NOT EXISTS usuarios (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  email VARCHAR(180) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  rol VARCHAR(20) NOT NULL DEFAULT 'empleado' CHECK (rol IN ('admin', 'empleado')),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categorias (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(120) UNIQUE NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS productos (
  id BIGSERIAL PRIMARY KEY,
  numero VARCHAR(50) UNIQUE,
  nombre VARCHAR(180) NOT NULL,
  categoria_id BIGINT REFERENCES categorias(id) ON DELETE SET NULL,
  cantidad INTEGER NOT NULL DEFAULT 0 CHECK (cantidad >= 0),
  stock_minimo INTEGER NOT NULL DEFAULT 5 CHECK (stock_minimo >= 0),
  precio_mayor NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (precio_mayor >= 0),
  precio_unitario NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (precio_unitario >= 0),
  imagen_url TEXT,
  disponible BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_productos_nombre ON productos (LOWER(nombre));
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos (categoria_id);

CREATE TABLE IF NOT EXISTS movimientos_stock (
  id BIGSERIAL PRIMARY KEY,
  producto_id BIGINT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('entrada','salida','ajuste')),
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  stock_anterior INTEGER NOT NULL,
  stock_nuevo INTEGER NOT NULL,
  motivo VARCHAR(250),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS historial_precios (
  id BIGSERIAL PRIMARY KEY,
  producto_id BIGINT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  precio_mayor_anterior NUMERIC(12,2),
  precio_mayor_nuevo NUMERIC(12,2),
  precio_unitario_anterior NUMERIC(12,2),
  precio_unitario_nuevo NUMERIC(12,2),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
) WITH (OIDS=FALSE);

DO $$ BEGIN
  ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

INSERT INTO categorias (nombre) VALUES
('Bebidas'), ('Abarrotes'), ('Limpieza'), ('Golosinas'), ('Otros')
ON CONFLICT (nombre) DO NOTHING;

-- =========================================================
-- MÓDULO PROVEEDORES / LUGARES DE COMPRA
-- Cada producto admite como máximo 1 registro Ceja y 1 Ingavi.
-- =========================================================
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
