-- Añadir la columna precio_par a la tabla Zapatos
ALTER TABLE Zapatos ADD COLUMN IF NOT EXISTS precio_par DECIMAL(10,2) DEFAULT 0.00;

-- Actualizar los registros existentes con un precio base
UPDATE Zapatos SET precio_par = 100.00 WHERE precio_par IS NULL OR precio_par = 0;