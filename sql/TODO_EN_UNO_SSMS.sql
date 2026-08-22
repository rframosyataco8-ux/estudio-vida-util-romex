/*
  ROMEX QC — TODO EN UNO (SQL Server / SSMS Express)
  Idempotente: se puede ejecutar aunque ya corriste 02, 03, 04 o 05.
  NO borra Productos ni Resultados.

  Qué hace:
  1) Usuarios + Sesiones (si no existen)
  2) PasswordHash -> VARCHAR(100)
  3) Usuarios iniciales (solo si la tabla está vacía)
  4) Hashes bcrypt (solo si aún son SHA-256 o la tabla recién se creó)
  5) Tabla Auditoria + índices
  6) Limpia sesiones expiradas

  Uso: SSMS -> conectado a cualquier BD -> F5 (usa RomexQC)
*/
USE master;
GO

IF DB_ID(N'RomexQC') IS NULL
BEGIN
  CREATE DATABASE RomexQC;
  PRINT 'Base RomexQC creada.';
END
ELSE
  PRINT 'Base RomexQC ya existe.';
GO

USE RomexQC;
GO

/* ═══════════════════════════════════════════════════════════
   1) USUARIOS
   ═══════════════════════════════════════════════════════════ */
IF OBJECT_ID('dbo.Usuarios', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.Usuarios (
    Id            INT IDENTITY(1,1) PRIMARY KEY,
    Usuario       VARCHAR(50)  NOT NULL,
    PasswordHash  VARCHAR(100) NOT NULL,
    Nombre        NVARCHAR(120) NOT NULL,
    Rol           VARCHAR(20)  NOT NULL
                    CONSTRAINT CK_Usuarios_Rol CHECK (Rol IN ('ADMIN', 'LECTOR')),
    Activo        BIT NOT NULL CONSTRAINT DF_Usuarios_Activo DEFAULT (1),
    CreadoEn      DATETIME2 NOT NULL CONSTRAINT DF_Usuarios_Creado DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT UQ_Usuarios_Usuario UNIQUE (Usuario)
  );
  PRINT 'Tabla Usuarios creada.';
END
ELSE
  PRINT 'Tabla Usuarios ya existe.';
GO

/* Ampliar PasswordHash si quedó en CHAR(64) u otro tamaño chico */
IF EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('dbo.Usuarios') AND name = 'PasswordHash'
)
BEGIN
  ALTER TABLE dbo.Usuarios ALTER COLUMN PasswordHash VARCHAR(100) NOT NULL;
  PRINT 'PasswordHash -> VARCHAR(100) OK.';
END
GO

/* ═══════════════════════════════════════════════════════════
   2) SESIONES
   ═══════════════════════════════════════════════════════════ */
IF OBJECT_ID('dbo.Sesiones', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.Sesiones (
    Id          INT IDENTITY(1,1) PRIMARY KEY,
    UsuarioId   INT NOT NULL REFERENCES dbo.Usuarios(Id),
    Token       VARCHAR(64) NOT NULL,
    ExpiraEn    DATETIME2 NOT NULL,
    CreadoEn    DATETIME2 NOT NULL CONSTRAINT DF_Sesiones_Creado DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT UQ_Sesiones_Token UNIQUE (Token)
  );
  PRINT 'Tabla Sesiones creada.';
END
ELSE
  PRINT 'Tabla Sesiones ya existe.';
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Sesiones_Token' AND object_id = OBJECT_ID('dbo.Sesiones'))
  CREATE INDEX IX_Sesiones_Token ON dbo.Sesiones(Token);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Sesiones_Expira' AND object_id = OBJECT_ID('dbo.Sesiones'))
  CREATE INDEX IX_Sesiones_Expira ON dbo.Sesiones(ExpiraEn);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Sesiones_Token_Expira' AND object_id = OBJECT_ID('dbo.Sesiones'))
  CREATE INDEX IX_Sesiones_Token_Expira ON dbo.Sesiones(Token, ExpiraEn);

PRINT 'Índices Sesiones OK.';
GO

/* ═══════════════════════════════════════════════════════════
   3) USUARIOS INICIALES (solo si no hay ninguno)
   ═══════════════════════════════════════════════════════════ */
IF NOT EXISTS (SELECT 1 FROM dbo.Usuarios)
BEGIN
  INSERT INTO dbo.Usuarios (Usuario, PasswordHash, Nombre, Rol) VALUES
  ('admin',   'PLACEHOLDER_SHA', N'Administrador', 'ADMIN'),
  ('rodrigo', 'PLACEHOLDER_SHA', N'Rodrigo / Admin', 'ADMIN'),
  ('nereyda', 'PLACEHOLDER_SHA', N'Nereyda Huachua Flores', 'ADMIN'),
  ('lector',  'PLACEHOLDER_SHA', N'Usuario Solo Lectura', 'LECTOR');
  PRINT 'Usuarios iniciales insertados.';
END
ELSE
  PRINT 'Ya hay usuarios; no se insertan de nuevo.';
GO

/* Asegurar que existan los 4 usuarios típicos (sin tocar los que ya están) */
IF NOT EXISTS (SELECT 1 FROM dbo.Usuarios WHERE Usuario = 'admin')
  INSERT INTO dbo.Usuarios (Usuario, PasswordHash, Nombre, Rol)
  VALUES ('admin', 'PLACEHOLDER', N'Administrador', 'ADMIN');

IF NOT EXISTS (SELECT 1 FROM dbo.Usuarios WHERE Usuario = 'rodrigo')
  INSERT INTO dbo.Usuarios (Usuario, PasswordHash, Nombre, Rol)
  VALUES ('rodrigo', 'PLACEHOLDER', N'Rodrigo / Admin', 'ADMIN');

IF NOT EXISTS (SELECT 1 FROM dbo.Usuarios WHERE Usuario = 'nereyda')
  INSERT INTO dbo.Usuarios (Usuario, PasswordHash, Nombre, Rol)
  VALUES ('nereyda', 'PLACEHOLDER', N'Nereyda Huachua Flores', 'ADMIN');

IF NOT EXISTS (SELECT 1 FROM dbo.Usuarios WHERE Usuario = 'lector')
  INSERT INTO dbo.Usuarios (Usuario, PasswordHash, Nombre, Rol)
  VALUES ('lector', 'PLACEHOLDER', N'Usuario Solo Lectura', 'LECTOR');
GO

/* ═══════════════════════════════════════════════════════════
   4) BCRYPT
      Solo actualiza si el hash NO empieza por $2 (aún no es bcrypt)
      Contraseñas:
        admin    / admin123
        rodrigo  / rodrigo123
        nereyda  / romex2026
        lector   / lector123
   ═══════════════════════════════════════════════════════════ */
UPDATE dbo.Usuarios
SET PasswordHash = '$2b$10$WykcXWAGgghC5WAaYiMP1OEn2qzcASR6OMPHBjL3eUvjsbcodFVPS'
WHERE Usuario = 'admin'
  AND (PasswordHash IS NULL OR PasswordHash NOT LIKE '$2%');

UPDATE dbo.Usuarios
SET PasswordHash = '$2b$10$n8.K3cUxp/RKt2IcdW3JM.5IUStcJw5PTRwmh3kB4I.mDYNVjOaay'
WHERE Usuario = 'rodrigo'
  AND (PasswordHash IS NULL OR PasswordHash NOT LIKE '$2%');

UPDATE dbo.Usuarios
SET PasswordHash = '$2b$10$jBMw1GBBgj8TMFzVR2PbvepnDd8WgS38IphhWp2u0lPlOEUaJVOmS'
WHERE Usuario = 'nereyda'
  AND (PasswordHash IS NULL OR PasswordHash NOT LIKE '$2%');

UPDATE dbo.Usuarios
SET PasswordHash = '$2b$10$YYSFWFTNUQdz9KJTu2QXDuJIQYOxef9oCAZbQ4sY9vFVU2vqKG6PS'
WHERE Usuario = 'lector'
  AND (PasswordHash IS NULL OR PasswordHash NOT LIKE '$2%');

PRINT 'Hashes bcrypt aplicados donde hacía falta.';
GO

/* ═══════════════════════════════════════════════════════════
   5) AUDITORÍA
   ═══════════════════════════════════════════════════════════ */
IF OBJECT_ID('dbo.Auditoria', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.Auditoria (
    Id            INT IDENTITY(1,1) PRIMARY KEY,
    UsuarioId     INT NULL,
    UsuarioNombre NVARCHAR(120) NULL,
    Accion        VARCHAR(40) NOT NULL,
    Entidad      VARCHAR(40) NOT NULL,
    Codigo        VARCHAR(50) NULL,
    Anio          INT NULL,
    Mes           INT NULL,
    Detalle       NVARCHAR(MAX) NULL,
    CreadoEn      DATETIME2 NOT NULL CONSTRAINT DF_Aud_Creado DEFAULT (SYSUTCDATETIME())
  );
  PRINT 'Tabla Auditoria creada.';
END
ELSE
  PRINT 'Tabla Auditoria ya existe.';
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Auditoria_Creado' AND object_id = OBJECT_ID('dbo.Auditoria'))
  CREATE INDEX IX_Auditoria_Creado ON dbo.Auditoria(CreadoEn DESC);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Auditoria_Codigo' AND object_id = OBJECT_ID('dbo.Auditoria'))
  CREATE INDEX IX_Auditoria_Codigo ON dbo.Auditoria(Codigo);

PRINT 'Índices Auditoria OK.';
GO

/* ═══════════════════════════════════════════════════════════
   6) LIMPIEZA SESIONES EXPIRADAS
   ═══════════════════════════════════════════════════════════ */
DELETE FROM dbo.Sesiones WHERE ExpiraEn < SYSUTCDATETIME();
PRINT 'Sesiones expiradas eliminadas: ' + CAST(@@ROWCOUNT AS VARCHAR(12));
GO

/* ═══════════════════════════════════════════════════════════
   7) VERIFICACIÓN
   ═══════════════════════════════════════════════════════════ */
PRINT '---------- RESUMEN ----------';
SELECT 'Usuarios' AS Tabla, COUNT(*) AS Filas FROM dbo.Usuarios
UNION ALL SELECT 'Sesiones', COUNT(*) FROM dbo.Sesiones
UNION ALL SELECT 'Auditoria', COUNT(*) FROM dbo.Auditoria;

IF OBJECT_ID('dbo.Productos', 'U') IS NOT NULL
  SELECT 'Productos' AS Tabla, COUNT(*) AS Filas FROM dbo.Productos;
IF OBJECT_ID('dbo.ResultadosMicro', 'U') IS NOT NULL
  SELECT 'ResultadosMicro' AS Tabla, COUNT(*) AS Filas FROM dbo.ResultadosMicro;
IF OBJECT_ID('dbo.ResultadosFisico', 'U') IS NOT NULL
  SELECT 'ResultadosFisico' AS Tabla, COUNT(*) AS Filas FROM dbo.ResultadosFisico;

SELECT Id, Usuario, Nombre, Rol, Activo,
       LEFT(PasswordHash, 7) AS HashPrefix
FROM dbo.Usuarios
ORDER BY Id;

PRINT 'TODO_EN_UNO_SSMS.sql completado. No hace falta ejecutar 02/03/04/05 por separado.';
GO
