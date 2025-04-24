-- Agregar la columna email
ALTER TABLE Usuarios ADD COLUMN Email VARCHAR(100);

-- Actualizar los registros existentes con correos electrónicos
UPDATE Usuarios SET Email = 'carlos.hernandez@example.com' WHERE Id = 1;
UPDATE Usuarios SET Email = 'ana.ruiz@example.com' WHERE Id = 2;
UPDATE Usuarios SET Email = 'luis.perez@example.com' WHERE Id = 3;
UPDATE Usuarios SET Email = 'marta.gomez@example.com' WHERE Id = 4;

-- Agregar las restricciones NOT NULL y UNIQUE
ALTER TABLE Usuarios ALTER COLUMN Email SET NOT NULL;
ALTER TABLE Usuarios ADD CONSTRAINT email_unique UNIQUE (Email);

-- Agregar columna estado con valor por defecto TRUE (activo)
ALTER TABLE Usuarios ADD COLUMN Estado BOOLEAN NOT NULL DEFAULT TRUE;