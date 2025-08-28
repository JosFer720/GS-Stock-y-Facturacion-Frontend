-- 1. Create new table for inventory states (simplified)
CREATE TABLE Estados_Inventario (
    Id SERIAL PRIMARY KEY,
    Estado VARCHAR(50) NOT NULL UNIQUE CHECK (Estado IN ('Disponible', 'Reservado', 'Agotado', 'No Disponible'))
);

-- 2. Insert the predefined states
INSERT INTO Estados_Inventario (Estado) VALUES
('Disponible'),
('Reservado'),
('Agotado'),
('No Disponible')
ON CONFLICT (Estado) DO NOTHING;

-- 3. Add the new foreign key columns to Inventarios table
ALTER TABLE Inventarios 
ADD COLUMN Id_Estado_Inventario INT,
ADD COLUMN Id_Tipo_Linea_Producto INT;

-- 4. Set default values for existing records
-- Map existing 'Disponible' to the new state
UPDATE Inventarios 
SET Id_Estado_Inventario = (SELECT Id FROM Estados_Inventario WHERE Estado = 'Disponible')
WHERE Estado = 'Disponible';

-- Map existing 'Agotado' to the new state
UPDATE Inventarios 
SET Id_Estado_Inventario = (SELECT Id FROM Estados_Inventario WHERE Estado = 'Agotado')
WHERE Estado = 'Agotado';

-- Set default Linea Nacional for existing records
UPDATE Inventarios 
SET Id_Tipo_Linea_Producto = (SELECT Id FROM Tipos_Linea_Producto WHERE Nombre = 'Linea Nacional' LIMIT 1)
WHERE Id_Tipo_Linea_Producto IS NULL;

-- 5. Add foreign key constraints
ALTER TABLE Inventarios
ADD CONSTRAINT fk_inventarios_estado
    FOREIGN KEY (Id_Estado_Inventario) REFERENCES Estados_Inventario(Id),
ADD CONSTRAINT fk_inventarios_tipo_linea
    FOREIGN KEY (Id_Tipo_Linea_Producto) REFERENCES Tipos_Linea_Producto(Id);

-- 6. Make the new columns NOT NULL after setting all values
ALTER TABLE Inventarios 
ALTER COLUMN Id_Estado_Inventario SET NOT NULL,
ALTER COLUMN Id_Tipo_Linea_Producto SET NOT NULL;

-- 7. Drop the old varchar estado column
ALTER TABLE Inventarios DROP COLUMN Estado;