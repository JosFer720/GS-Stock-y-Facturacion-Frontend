-- Elimina actualizaciones condicionales
ALTER TABLE Pedidos 
ADD COLUMN IF NOT EXISTS Id_Tipo_Linea_Producto INT NOT NULL DEFAULT 1;

-- FK válida
ALTER TABLE Pedidos
ADD CONSTRAINT fk_pedidos_tipo_linea 
FOREIGN KEY (Id_Tipo_Linea_Producto) 
REFERENCES Tipos_Linea_Producto(Id);

-- Asignación directa
UPDATE Pedidos
SET Id_Tipo_Linea_Producto = (
    SELECT Id FROM Tipos_Linea_Producto WHERE Nombre = 'Linea Nacional')
WHERE Id IN (1, 2, 5, 6, 8, 9);

UPDATE Pedidos 
SET Id_Tipo_Linea_Producto = (
    SELECT Id FROM Tipos_Linea_Producto WHERE Nombre = 'Linea Importadora')
WHERE Id IN (3, 4, 7, 10);