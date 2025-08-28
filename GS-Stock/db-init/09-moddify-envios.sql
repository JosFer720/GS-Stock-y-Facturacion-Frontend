-- Agregar tabla para tipos de línea de producto
CREATE TABLE Tipos_Linea_Producto (
    Id SERIAL PRIMARY KEY,
    Nombre VARCHAR(50) NOT NULL UNIQUE CHECK (Nombre IN ('Linea Nacional', 'Linea Importadora')),
    Descripcion TEXT,
    Activo BOOLEAN DEFAULT TRUE,
    Fecha_Creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar los tipos de línea predefinidos
INSERT INTO Tipos_Linea_Producto (Nombre, Descripcion) VALUES 
('Linea Nacional', 'Productos de fabricación nacional'),
('Linea Importadora', 'Productos importados');

-- Agregar columna a la tabla de Pedidos para el tipo de línea
ALTER TABLE Pedidos 
ADD COLUMN Id_Tipo_Linea_Producto INT,
ADD FOREIGN KEY (Id_Tipo_Linea_Producto) REFERENCES Tipos_Linea_Producto(Id);

-- Agregar campo adicional a Clientes si no existe (para la plantilla)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='nit') THEN
        ALTER TABLE Clientes ADD COLUMN NIT VARCHAR(50);
    END IF;
END $$;

-- Crear vista para consultar pedidos con información completa para envíos
CREATE OR REPLACE VIEW Vista_Pedidos_Envios AS
SELECT 
    p.Id as pedido_id,
    p.Fecha as fecha_pedido,
    p.Total as total_pedido,
    p.Subtotal as subtotal_pedido,
    
    -- Cliente
    c.Id as cliente_id,
    CONCAT(c.Nombre, ' ', c.Apellido) as cliente_nombre,
    c.Empresa as cliente_empresa,
    c.NIT as cliente_nit,
    
    -- Dirección del cliente (primera dirección)
    (SELECT d.Direccion FROM Direcciones d 
     INNER JOIN Cliente_Direcciones cd ON d.Id = cd.Id_Direccion 
     WHERE cd.Id_Cliente = c.Id LIMIT 1) as cliente_direccion,
    
    -- Teléfono del cliente (primer teléfono)
    (SELECT t.Telefono FROM Telefonos t 
     INNER JOIN Cliente_Telefonos ct ON t.Id = ct.Id_Telefono 
     WHERE ct.Id_Cliente = c.Id LIMIT 1) as cliente_telefono,
    
    -- Vendedor
    v.Id as vendedor_id,
    CONCAT(u.Nombre, ' ', u.Apellido) as vendedor_nombre,
    r.Locacion as vendedor_ruta,
    
    -- Tipo de línea de producto
    tlp.Id as tipo_linea_id,
    tlp.Nombre as tipo_linea_nombre,
    
    -- Estado del pedido
    ep.Estado as estado_pedido,
    
    -- Método de pago
    mp.Tipo as metodo_pago
    
FROM Pedidos p
INNER JOIN Clientes c ON p.Id_Cliente = c.Id
LEFT JOIN Vendedores v ON p.Id_Vendedor = v.Id
LEFT JOIN Usuarios u ON v.Id_Usuarios = u.Id
LEFT JOIN Rutas r ON v.Id_Rutas = r.Id
LEFT JOIN Tipos_Linea_Producto tlp ON p.Id_Tipo_Linea_Producto = tlp.Id
LEFT JOIN Estados_Pedidos ep ON p.Id_Estado_Pedido = ep.Id
LEFT JOIN Metodos_De_Pago mp ON p.Id_Metodo_De_Pago = mp.Id;