/*
  ROMEX QC — Mejoras (ejecutar en SSMS sobre RomexQC)
  Seguro si ya corriste 03_bcrypt_passwords.sql.
  1) Amplía PasswordHash a VARCHAR(100)
  2) Índice útil en Sesiones
  3) Limpia sesiones expiradas
*/
USE RomexQC;
GO

-- 1) PasswordHash más amplio (bcrypt ~60 chars)
IF EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('dbo.Usuarios') AND name = 'PasswordHash'
)
BEGIN
  ALTER TABLE dbo.Usuarios ALTER COLUMN PasswordHash VARCHAR(100) NOT NULL;
  PRINT 'PasswordHash -> VARCHAR(100) OK';
END
GO

-- 2) Índice compuesto por si no existe
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Sesiones_Token_Expira' AND object_id = OBJECT_ID('dbo.Sesiones'))
BEGIN
  CREATE INDEX IX_Sesiones_Token_Expira ON dbo.Sesiones(Token, ExpiraEn);
  PRINT 'Índice IX_Sesiones_Token_Expira OK';
END
GO

-- 3) Limpiar sesiones vencidas
DELETE FROM dbo.Sesiones WHERE ExpiraEn < SYSUTCDATETIME();
PRINT 'Sesiones expiradas eliminadas: ' + CAST(@@ROWCOUNT AS VARCHAR(10));
GO

PRINT '04_mejoras.sql completado.';
GO
