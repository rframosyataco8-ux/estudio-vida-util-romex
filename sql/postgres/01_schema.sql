-- ROMEX QC — PostgreSQL schema completo
-- Ejecutar en la base romexqc (Render u otro)

CREATE TABLE IF NOT EXISTS productos (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(50) NOT NULL UNIQUE,
  nombre VARCHAR(120) NOT NULL,
  lote VARCHAR(30) NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resultados_micro (
  id SERIAL PRIMARY KEY,
  producto_id INT NOT NULL REFERENCES productos(id),
  anio INT NOT NULL,
  mes INT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  fecha_analisis DATE NULL,
  rtamv INT NOT NULL DEFAULT 0,
  mohos INT NOT NULL DEFAULT 0,
  coliformes INT NOT NULL DEFAULT 0,
  ecoli INT NOT NULL DEFAULT 0,
  enterobacterias INT NOT NULL DEFAULT 0,
  levaduras INT NOT NULL DEFAULT 0,
  saureus INT NOT NULL DEFAULT 0,
  estado VARCHAR(20) NOT NULL DEFAULT 'LIBERADO',
  analista VARCHAR(80) NULL,
  liberado_por VARCHAR(80) NULL,
  notas VARCHAR(500) NULL,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (producto_id, anio, mes)
);

CREATE TABLE IF NOT EXISTS resultados_fisico (
  id SERIAL PRIMARY KEY,
  producto_id INT NOT NULL REFERENCES productos(id),
  anio INT NOT NULL,
  mes INT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  fecha_analisis DATE NULL,
  humedad NUMERIC(8,2) NULL,
  ph NUMERIC(6,2) NULL,
  ceniza NUMERIC(8,2) NULL,
  grasa NUMERIC(8,2) NULL,
  fineza NUMERIC(8,2) NULL,
  acidez NUMERIC(8,2) NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'CONFORME',
  analista VARCHAR(80) NULL,
  notas VARCHAR(500) NULL,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (producto_id, anio, mes)
);

CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  usuario VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  rol VARCHAR(20) NOT NULL CHECK (rol IN ('ADMIN', 'LECTOR')),
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sesiones (
  id SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES usuarios(id),
  token VARCHAR(64) NOT NULL UNIQUE,
  expira_en TIMESTAMPTZ NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_sesiones_token ON sesiones(token);
CREATE INDEX IF NOT EXISTS ix_sesiones_expira ON sesiones(expira_en);
CREATE INDEX IF NOT EXISTS ix_micro_anio_mes ON resultados_micro(anio, mes);
CREATE INDEX IF NOT EXISTS ix_fisico_anio_mes ON resultados_fisico(anio, mes);

CREATE TABLE IF NOT EXISTS auditoria (
  id SERIAL PRIMARY KEY,
  usuario_id INT NULL,
  usuario_nombre VARCHAR(120) NULL,
  accion VARCHAR(40) NOT NULL,
  entidad VARCHAR(40) NOT NULL,
  codigo VARCHAR(50) NULL,
  anio INT NULL,
  mes INT NULL,
  detalle TEXT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_auditoria_creado ON auditoria(creado_en DESC);
