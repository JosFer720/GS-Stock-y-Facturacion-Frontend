-- Migración: Agregar rol Super Admin
-- Fecha: 2025-11-03
-- Descripción: Crea el rol Super Admin con acceso completo y usuarios super admin que no pueden ser modificados

-- 1. Agregar el rol Super Admin (será ID 5)
INSERT INTO Roles (Rol) VALUES ('Super Admin')
ON CONFLICT DO NOTHING;

-- 2. Agregar columna para marcar usuarios como super admin (protección adicional)
ALTER TABLE Usuarios 
ADD COLUMN IF NOT EXISTS es_super_admin BOOLEAN DEFAULT FALSE;

-- 3. Insertar usuario Super Admin en la tabla Usuarios (será ID 5)
INSERT INTO Usuarios (Id_Roles, Nombre, Apellido, Email, es_super_admin) VALUES
(5, 'Super', 'Admin', 'superadmin@sistema.local', TRUE)
ON CONFLICT DO NOTHING;

-- 4. Crear cuenta de usuario super admin (contraseña: admin123 - misma que carlos_admin)
-- Usamos el ID del usuario recién creado
INSERT INTO Cuentas_Usuarios (Id_Usuarios, Usuario, Contrasena) 
SELECT u.Id, 'superadmin', '$2b$10$WZZBlifHpUXlxBWaEyMm3eLGLmv53j0WwtJTfVqn0Nkt1KqnMh2WS' -- admin123
FROM Usuarios u
WHERE u.Email = 'superadmin@sistema.local'
  AND NOT EXISTS (SELECT 1 FROM Cuentas_Usuarios cu WHERE cu.Id_Usuarios = u.Id)
LIMIT 1;

-- 5. Crear índice para mejorar consultas de super admin
CREATE INDEX IF NOT EXISTS idx_usuarios_super_admin ON Usuarios(es_super_admin) WHERE es_super_admin = TRUE;

-- 6. Comentarios sobre las columnas
COMMENT ON COLUMN Usuarios.es_super_admin IS 'Indica si el usuario es Super Admin con permisos especiales y protección contra cambios de rol';
COMMENT ON TABLE Roles IS 'Roles del sistema: 1-Administrador, 2-Vendedor, 3-Encargado de Inventario, 4-Secretaria, 5-Super Admin';

