-- Seed usuarios (bcrypt cost 10) + productos base
-- Contraseñas: admin123, rodrigo123, romex2026, lector123

INSERT INTO usuarios (usuario, password_hash, nombre, rol)
SELECT 'admin', '$2b$10$WykcXWAGgghC5WAaYiMP1OEn2qzcASR6OMPHBjL3eUvjsbcodFVPS', 'Administrador', 'ADMIN'
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE usuario = 'admin');

INSERT INTO usuarios (usuario, password_hash, nombre, rol)
SELECT 'rodrigo', '$2b$10$n8.K3cUxp/RKt2IcdW3JM.5IUStcJw5PTRwmh3kB4I.mDYNVjOaay', 'Rodrigo / Admin', 'ADMIN'
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE usuario = 'rodrigo');

INSERT INTO usuarios (usuario, password_hash, nombre, rol)
SELECT 'nereyda', '$2b$10$jBMw1GBBgj8TMFzVR2PbvepnDd8WgS38IphhWp2u0lPlOEUaJVOmS', 'Nereyda Huachua Flores', 'ADMIN'
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE usuario = 'nereyda');

INSERT INTO usuarios (usuario, password_hash, nombre, rol)
SELECT 'lector', '$2b$10$YYSFWFTNUQdz9KJTu2QXDuJIQYOxef9oCAZbQ4sY9vFVU2vqKG6PS', 'Usuario Solo Lectura', 'LECTOR'
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE usuario = 'lector');

INSERT INTO productos (codigo, nombre, lote)
SELECT v.codigo, v.nombre, v.lote FROM (VALUES
  ('torta_natural', 'Torta Natural de Cacao', '44260304'),
  ('torta_alcalina', 'Torta Alcalina de Cacao', '13260318'),
  ('cocoa_natural', 'Cocoa Natural', '11260513'),
  ('cocoa_alcalina', 'Cocoa Alcalina', '07260324'),
  ('licor', 'Licor de Cacao', '260516'),
  ('manteca', 'Manteca de Cacao', '19260321')
) AS v(codigo, nombre, lote)
WHERE NOT EXISTS (SELECT 1 FROM productos p WHERE p.codigo = v.codigo);
