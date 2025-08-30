-- TABLAS DE DEVOLUCIONES

-- Métodos de devolución
CREATE TABLE Metodos_Devolucion (
    Id SERIAL PRIMARY KEY,
    Metodo VARCHAR(100) NOT NULL
);

-- Devoluciones 
CREATE TABLE Devoluciones (
    Id SERIAL PRIMARY KEY,
    Id_Pedido INT NOT NULL,
    Motivo TEXT NOT NULL,
    Id_Metodo_Devolucion INT NOT NULL,
    Fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Monto DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (Id_Pedido) REFERENCES Pedidos(Id),
    FOREIGN KEY (Id_Metodo_Devolucion) REFERENCES Metodos_Devolucion(Id)
);

-- INSERTS DE CATÁLOGOS

INSERT INTO Metodos_Devolucion (Metodo) VALUES
('Efectivo'),
('Reembolso a tarjeta'),
('Saldo a favor en tienda'),
('Transferencia bancaria');

-- Vista para búsqueda de clientes y pedidos relacionados
CREATE OR REPLACE VIEW Vista_Clientes_Pedidos AS
SELECT 
    c.Id AS cliente_id,
    CONCAT(c.Nombre, ' ', c.Apellido) AS cliente_nombre,
    c.Empresa AS cliente_empresa,
    p.Id AS pedido_id,
    p.Fecha AS fecha_pedido,
    p.Total AS total_pedido
FROM Clientes c
JOIN Pedidos p ON c.Id = p.Id_Cliente;