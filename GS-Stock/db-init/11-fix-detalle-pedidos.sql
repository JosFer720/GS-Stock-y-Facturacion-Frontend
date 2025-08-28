-- Asegurar que todos los pedidos tengan un tipo de línea asignado
UPDATE Pedidos 
SET Id_Tipo_Linea_Producto = (
    SELECT Id FROM Tipos_Linea_Producto WHERE Nombre = 'Linea Nacional' LIMIT 1
)
WHERE Id_Tipo_Linea_Producto IS NULL;

-- Actualizar tabla de envíos para usar estados correctos (usando Estados_Pedidos existente)
DO $$ 
BEGIN
    -- Si la columna Id_Estado_Envio no tiene FK, agregarla
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'envios' AND constraint_type = 'FOREIGN KEY' 
        AND constraint_name LIKE '%estado_envio%'
    ) THEN
        -- Asegurar que Id_Estado_Envio tenga valores válidos (usar Estados_Pedidos)
        UPDATE Envios 
        SET Id_Estado_Envio = 1 
        WHERE Id_Estado_Envio NOT IN (SELECT Id FROM Estados_Pedidos);
        
        -- Agregar FK hacia Estados_Pedidos
        ALTER TABLE Envios 
        ADD CONSTRAINT fk_envios_estado_pedido 
        FOREIGN KEY (Id_Estado_Envio) REFERENCES Estados_Pedidos(Id);
    END IF;
END $$;