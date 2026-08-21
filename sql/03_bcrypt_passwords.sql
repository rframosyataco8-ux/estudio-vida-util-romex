/*
  ROMEX QC — Migrar contraseñas a bcrypt
  Ejecutar en RomexQC DESPUÉS de 02_roles_usuarios.sql

  Amplía PasswordHash y actualiza hashes bcrypt (cost 10).
  Contraseñas:
    admin    / admin123
    rodrigo  / rodrigo123
    nereyda  / romex2026
    lector   / lector123
*/
USE RomexQC;
GO

-- Ampliar columna (bcrypt ~60 chars)
IF EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('dbo.Usuarios') AND name = 'PasswordHash'
)
BEGIN
  ALTER TABLE dbo.Usuarios ALTER COLUMN PasswordHash VARCHAR(100) NOT NULL;
END
GO

UPDATE dbo.Usuarios SET PasswordHash = '$2b$10$WykcXWAGgghC5WAaYiMP1OEn2qzcASR6OMPHBjL3eUvjsbcodFVPS'
WHERE Usuario = 'admin';

UPDATE dbo.Usuarios SET PasswordHash = '$2b$10$n8.K3cUxp/RKt2IcdW3JM.5IUStcJw5PTRwmh3kB4I.mDYNVjOaay'
WHERE Usuario = 'rodrigo';

UPDATE dbo.Usuarios SET PasswordHash = '$2b$10$jBMw1GBBgj8TMFzVR2PbvepnDd8WgS38IphhWp2u0lPlOEUaJVOmS'
WHERE Usuario = 'nereyda';

UPDATE dbo.Usuarios SET PasswordHash = '$2b$10$YYSFWFTNUQdz9KJTu2QXDuJIQYOxef9oCAZbQ4sY9vFVU2vqKG6PS'
WHERE Usuario = 'lector';
GO

PRINT 'Contraseñas actualizadas a bcrypt.';
SELECT Usuario, LEFT(PasswordHash, 7) AS HashPrefix, Rol FROM dbo.Usuarios;
GO
