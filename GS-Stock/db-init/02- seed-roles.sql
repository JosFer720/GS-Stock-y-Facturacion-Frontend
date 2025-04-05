-- Roles del sistema
INSERT INTO Roles (Rol) VALUES 
('Administrador'), 
('Vendedor'), 
('Encargado de Inventario'), 
('Secretaria')
ON CONFLICT DO NOTHING;