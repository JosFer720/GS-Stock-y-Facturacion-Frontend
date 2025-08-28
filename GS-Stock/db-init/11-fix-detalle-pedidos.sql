-- Asegurar que todos los pedidos tengan un tipo de línea asignado
UPDATE Pedidos 
SET Id_Tipo_Linea_Producto = (
    SELECT Id FROM Tipos_Linea_Producto WHERE Nombre = 'Linea Nacional' LIMIT 1
)
WHERE Id_Tipo_Linea_Producto IS NULL;

-- Crear tabla de estados de envío (faltaba en la estructura original)
DO $ 
BEGIN
    -- Crear tabla de estados de envío si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='estados_envios') THEN
        CREATE TABLE Estados_Envios (
            Id SERIAL PRIMARY KEY,
            Estado VARCHAR(50) NOT NULL UNIQUE
        );
        
        -- Insertar estados básicos
        INSERT INTO Estados_Envios (Estado) VALUES 
        ('Preparando'),
        ('En Ruta'),
        ('Entregado'),
        ('Cancelado')
        ON CONFLICT (Estado) DO NOTHING;
    END IF;
END $;

-- Actualizar tabla de envíos para usar estados correctos
DO $ 
BEGIN
    -- Si la columna Id_Estado_Envio no tiene FK, agregarla
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'envios' AND constraint_type = 'FOREIGN KEY' 
        AND constraint_name LIKE '%estado_envio%'
    ) THEN
        -- Asegurar que Id_Estado_Envio tenga valores válidos
        UPDATE Envios 
        SET Id_Estado_Envio = 1 
        WHERE Id_Estado_Envio NOT IN (SELECT Id FROM Estados_Envios);
        
        -- Agregar FK
        ALTER TABLE Envios 
        ADD CONSTRAINT fk_envios_estado_envio 
        FOREIGN KEY (Id_Estado_Envio) REFERENCES Estados_Envios(Id);
    END IF;
END $;