-- Create payment status table
CREATE TABLE pedidos_estado_pago (
    Id SERIAL PRIMARY KEY,
    Estado VARCHAR(20) NOT NULL UNIQUE CHECK (Estado IN ('pendiente', 'pagado'))
);

-- Insert the predefined statuses
INSERT INTO pedidos_estado_pago (Estado) VALUES 
('pendiente'),
('pagado')
ON CONFLICT (Estado) DO NOTHING;

-- Create payments table
CREATE TABLE pagos_pedidos (
    Id SERIAL PRIMARY KEY,
    Id_Pedido INT NOT NULL,
    total_pedido DECIMAL(10,2),
    Id_Metodos_De_Pago INT NOT NULL,
    Monto_Pagado DECIMAL(10,2) NOT NULL CHECK (Monto_Pagado >= 0),
    Vuelto DECIMAL(10,2) DEFAULT NULL CHECK (Vuelto >= 0),
    Observaciones TEXT,
    Fecha_De_Pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (Id_Pedido) REFERENCES Pedidos(Id),
    FOREIGN KEY (Id_Metodos_De_Pago) REFERENCES metodos_de_pago(Id)
);


-- Add payment status column to pedidos table
ALTER TABLE Pedidos 
ADD COLUMN Id_Pedido_Estado_Pago INT;

-- Add foreign key constraint
ALTER TABLE Pedidos
ADD CONSTRAINT fk_pedidos_estado_pago
    FOREIGN KEY (Id_Pedido_Estado_Pago)
    REFERENCES pedidos_estado_pago(Id);


-- Update existing pedidos with specific payment status assignments
UPDATE Pedidos 
SET Id_Pedido_Estado_Pago = 2  -- pagado
WHERE Id IN (1, 3, 5, 7, 9);  -- Odd-numbered pedidos

UPDATE Pedidos 
SET Id_Pedido_Estado_Pago = 1  -- pendiente
WHERE Id IN (2, 4, 6, 8, 10); -- Even-numbered pedidos