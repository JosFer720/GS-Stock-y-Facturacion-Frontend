-- Usuarios iniciales (contraseñas: admin123, vendedor123, etc.)
INSERT INTO Usuarios (Id_Roles, Nombre, Apellido) VALUES
(1, 'Carlos', 'Hernández'),
(2, 'Ana', 'Ruiz'),
(3, 'Luis', 'Pérez'),
(4, 'Marta', 'Gómez')
ON CONFLICT DO NOTHING;

-- Cuentas de usuarios (contraseñas hasheadas con bcrypt)
INSERT INTO Cuentas_Usuarios (Id_Usuarios, Usuario, Contrasena) VALUES
(1, 'carlos_admin', '$2b$10$WZZBlifHpUXlxBWaEyMm3eLGLmv53j0WwtJTfVqn0Nkt1KqnMh2WS'), -- admin123
(2, 'ana_vendedor', '$2b$10$/W5Of12FVH1Kh8V7oHbzUu7nCt1DHwvGtVnEGTRdho1m/RwDCE1oS'), -- vendedor123
(3, 'luis_inventario', '$2b$10$zubEP6byabBQfIbZhEyMJelY15ODKI.aC91QVo8EcP4FrblYgk85G'), -- inventario123
(4, 'marta_secretaria', '$2b$10$pW2bcEGon0WLlOCsVZeAWuvCltgiW.BHlcOHGKxGGoazrGJroEUje') -- secretaria123
ON CONFLICT DO NOTHING;