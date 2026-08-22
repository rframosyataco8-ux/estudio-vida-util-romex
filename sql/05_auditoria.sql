/*
  ROMEX QC — Auditoría de cambios (SQL Server / SSMS)
  Ejecutar en RomexQC. No borra datos.
*/
USE RomexQC;
GO

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
  CREATE INDEX IX_Auditoria_Creado ON dbo.Auditoria(CreadoEn DESC);
  CREATE INDEX IX_Auditoria_Codigo ON dbo.Auditoria(Codigo);
  PRINT 'Tabla Auditoria creada';
END
ELSE
  PRINT 'Tabla Auditoria ya existe';
GO
