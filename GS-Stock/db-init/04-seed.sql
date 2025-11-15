-- Estados de Pedidos
INSERT INTO Estados_Pedidos (Estado) VALUES
('Pendiente'),
('Despachado')
ON CONFLICT DO NOTHING;

INSERT INTO Tipos_De_Cliente (Tipo, Descuento) VALUES
('Regular', 0.05), 
('Frecuente', 0.10), 
('Corporativo', 0.15), 
('VIP', 0.20), 
('Mayorista', 0.25),
('Distribuidor', 0.30), 
('Nuevo', 0.02), 
('Descuento Especial', 0.50), 
('Residente', 0.10), 
('Estudiante', 0.07)
ON CONFLICT DO NOTHING;

-- Métodos de Pago
INSERT INTO Metodos_De_Pago (Tipo, Detalle) VALUES
('Tarjeta de Crédito', 'Pago con tarjeta de crédito Visa o MasterCard'),
('Efectivo', 'Pago en efectivo en tienda'),
('Transferencia Bancaria', 'Pago mediante transferencia desde cuenta bancaria'),
('Cheque', 'Pago mediante cheque personal o empresarial'),
('PayPal', 'Pago mediante la plataforma de PayPal'),
('Bitcoin', 'Pago mediante criptomonedas'),
('Skrill', 'Pago mediante Skrill'),
('Apple Pay', 'Pago mediante Apple Pay'),
('Google Pay', 'Pago mediante Google Pay'),
('Sofort', 'Pago mediante Sofort')
ON CONFLICT DO NOTHING;