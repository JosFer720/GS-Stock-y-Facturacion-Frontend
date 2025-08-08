-- Migración 11: Corregir estructura de Detalle_Pedidos y relaciones

-- 1. Agregar columna Precio_Unitario si no existe
ALTER TABLE Detalle_Pedidos 
ADD COLUMN IF NOT EXISTS Precio_Unitario DECIMAL(10,2) DEFAULT 0.00;

-- 2. Actualizar precios unitarios basados en el precio del zapato
UPDATE Detalle_Pedidos 
SET Precio_Unitario = (
    SELECT COALESCE(z.precio_par, 100.00)
    FROM Zapatos z 
    WHERE z.Id = Detalle_Pedidos.Id_Zapato
)
WHERE Precio_Unitario = 0 OR Precio_Unitario IS NULL;

-- 3. Verificar y actualizar tipos de línea de producto en pedidos existentes
-- Asegurar que todos los pedidos tengan un tipo de línea asignado
UPDATE Pedidos 
SET Id_Tipo_Linea_Producto = (
    SELECT Id FROM Tipos_Linea_Producto WHERE Nombre = 'Linea Nacional' LIMIT 1
)
WHERE Id_Tipo_Linea_Producto IS NULL;

-- 4. Verificar estructura de estados de envío (puede estar faltando)
DO $$ 
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
END $$;

-- 5. Actualizar tabla de envíos para usar estados correctos
DO $$ 
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
END $$;

-- 6. Vista de verificación para debug
CREATE OR REPLACE VIEW Vista_Debug_Pedidos AS
SELECT 
    p.Id as pedido_id,
    p.Id_Tipo_Linea_Producto,
    tlp.Nombre as tipo_linea,
    c.Nombre || ' ' || c.Apellido as cliente,
    p.Total,
    COUNT(dp.Id) as cantidad_productos
FROM Pedidos p
LEFT JOIN Tipos_Linea_Producto tlp ON p.Id_Tipo_Linea_Producto = tlp.Id
LEFT JOIN Clientes c ON p.Id_Cliente = c.Id
LEFT JOIN Detalle_Pedidos dp ON p.Id = dp.Id_Pedido
GROUP BY p.Id, tlp.Nombre, c.Nombre, c.Apellido, p.Total;

-- 7. Mostrar información de debug
SELECT 'DEBUG: Pedidos por tipo de línea' as info;
SELECT tipo_linea, COUNT(*) as cantidad 
FROM Vista_Debug_Pedidos 
GROUP BY tipo_linea;