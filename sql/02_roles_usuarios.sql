/*
  ROMEX QC — Roles y autenticación (SQL Server / SSMS)
  Ejecutar sobre la base RomexQC existente (NO borra datos).

  Roles:
    ADMIN  → puede editar, agregar productos, agregar meses
    LECTOR → solo lectura

  Usuarios iniciales (contraseña en texto plano → se guarda SHA-256):
    admin    / admin123     → ADMIN
    rodrigo  / rodrigo123   → ADMIN
    nereyda  / romex2026    → ADMIN
    lector   / lector123    → LECTOR
*/
USE RomexQC;
GO

/* ── Tabla Usuarios ─────────────────────────────────────── */
IF OBJECT_ID('dbo.Usuarios', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.Usuarios (
    Id            INT IDENTITY(1,1) PRIMARY KEY,
    Usuario       VARCHAR(50)  NOT NULL,
    PasswordHash  CHAR(64)     NOT NULL,  -- SHA-256 hex
    Nombre        NVARCHAR(120) NOT NULL,
    Rol           VARCHAR(20)  NOT NULL
                    CONSTRAINT CK_Usuarios_Rol CHECK (Rol IN ('ADMIN', 'LECTOR')),
    Activo        BIT NOT NULL CONSTRAINT DF_Usuarios_Activo DEFAULT (1),
    CreadoEn      DATETIME2 NOT NULL CONSTRAINT DF_Usuarios_Creado DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT UQ_Usuarios_Usuario UNIQUE (Usuario)
  );
END
GO

/* ── Tabla Sesiones (tokens de login) ───────────────────── */
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
  CREATE INDEX IX_Sesiones_Token ON dbo.Sesiones(Token);
  CREATE INDEX IX_Sesiones_Expira ON dbo.Sesiones(ExpiraEn);
END
GO

/* ── Seed usuarios (solo si la tabla está vacía) ─────────── */
IF NOT EXISTS (SELECT 1 FROM dbo.Usuarios)
BEGIN
  INSERT INTO dbo.Usuarios (Usuario, PasswordHash, Nombre, Rol) VALUES
  (
    'admin',
    LOWER(CONVERT(VARCHAR(64), HASHBYTES('SHA2_256', 'admin123'), 2)),
    N'Administrador',
    'ADMIN'
  ),
  (
    'rodrigo',
    LOWER(CONVERT(VARCHAR(64), HASHBYTES('SHA2_256', 'rodrigo123'), 2)),
    N'Rodrigo / Admin',
    'ADMIN'
  ),
  (
    'nereyda',
    LOWER(CONVERT(VARCHAR(64), HASHBYTES('SHA2_256', 'romex2026'), 2)),
    N'Nereyda Huachua Flores',
    'ADMIN'
  ),
  (
    'lector',
    LOWER(CONVERT(VARCHAR(64), HASHBYTES('SHA2_256', 'lector123'), 2)),
    N'Usuario Solo Lectura',
    'LECTOR'
  );
END
GO

PRINT 'Usuarios y Sesiones listos.';
SELECT Id, Usuario, Nombre, Rol, Activo FROM dbo.Usuarios;
GO
