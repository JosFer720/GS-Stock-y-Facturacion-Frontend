-- Agregar columna para la referencia
ALTER TABLE Clientes
ADD COLUMN Id_Cliente_Telefono INT;

-- Establecer la clave foránea
ALTER TABLE Clientes
ADD CONSTRAINT fk_clientes_cliente_telefonos
    FOREIGN KEY (Id_Cliente_Telefono)
    REFERENCES Cliente_Telefonos(Id);

-- Hacer el update para que clientes tenga los datos
UPDATE Clientes
SET Id_Cliente_Telefono = CT.Id
FROM Cliente_Telefonos CT
WHERE Clientes.Id = CT.Id_Cliente;