-- Inserts para la tabla Clientes
INSERT INTO Clientes (Nombre, Apellido, Id_Direcciones, Empresa) VALUES
('Carlos', 'Pérez', 1, 'Zapatos Pérez'),
('Ana', 'González', 2, 'Zapatería Ana'),
('Luis', 'Martínez', 3, 'Zapatería Martínez'),
('Marta', 'Jiménez', 4, 'Calzado Jiménez'),
('Javier', 'Gutiérrez', 5, 'Gutiérrez Calzados'),
('Sofía', 'Torres', 6, 'Zapatos y Estilo'),
('Roberto', 'Hernández', 7, 'Zapatería Roberta'),
('Patricia', 'Rodríguez', 8, 'Calzado y Confort'),
('Juan', 'López', 9, 'López Zapatos'),
('María', 'Mendoza', 10, 'Mendoza Calzado');

-- Inserts para la tabla Direcciones
INSERT INTO Direcciones (Direccion) VALUES
('Calle 1, Zona 1'),
('Avenida Central 123, Zona 2'),
('Calle Real, Zona 3'),
('Avenida Las Américas, Zona 4'),
('Calle del Sol, Zona 5'),
('Calle 9, Zona 6'),
('Avenida Los Pinos, Zona 7'),
('Calle de la Paz, Zona 8'),
('Avenida San Juan, Zona 9'),
('Calle de la Libertad, Zona 10');

-- Inserts para la tabla Cliente_Direcciones
INSERT INTO Cliente_Direcciones (Id_Cliente, Id_Direccion) VALUES
(1, 1), (2, 2), (3, 3), (4, 4), (5, 5),
(6, 6), (7, 7), (8, 8), (9, 9), (10, 10);

-- Inserts para la tabla Telefonos
INSERT INTO Telefonos (Telefono) VALUES
('555-1234'), ('555-5678'), ('555-8765'), ('555-2345'), ('555-6789'),
('555-3456'), ('555-5432'), ('555-9876'), ('555-3210'), ('555-1111');

-- Inserts para la tabla Cliente_Telefonos
INSERT INTO Cliente_Telefonos (Id_Cliente, Id_Telefono) VALUES
(1, 1), (2, 2), (3, 3), (4, 4), (5, 5),
(6, 6), (7, 7), (8, 8), (9, 9), (10, 10);

-- Inserts para la tabla Cuentas_Por_Cobrar
INSERT INTO Cuentas_Por_Cobrar (Id_Tipo_Cliente, Total_Deuda, Id_Pedido) VALUES
(1, 250.50, 1), (2, 150.00, 2), (3, 300.75, 3), (1, 120.00, 4), (2, 220.30, 5),
(3, 180.50, 6), (1, 350.00, 7), (2, 400.20, 8), (3, 150.90, 9), (1, 500.00, 10);

-- Inserts para la tabla Abonos
INSERT INTO Abonos (Id_Cuenta_Por_Cobrar, Monto_Abono, Id_Metodo_De_Pago) VALUES
(1, 50.00, 1), (2, 30.00, 2), (3, 75.00, 3), (4, 60.00, 1), (5, 100.00, 2),
(6, 40.00, 3), (7, 150.00, 1), (8, 200.00, 2), (9, 70.00, 3), (10, 250.00, 1);

-- Inserts para la tabla Metodos_De_Pago
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
('Sofort', 'Pago mediante Sofort');

-- Inserts para la tabla Tipos_De_Cliente
INSERT INTO Tipos_De_Cliente (Tipo, Descuento) VALUES
('Regular', 0.05), ('Frecuente', 0.10), ('Corporativo', 0.15), ('VIP', 0.20), ('Mayorista', 0.25),
('Distribuidor', 0.30), ('Nuevo', 0.02), ('Descuento Especial', 0.50), ('Residente', 0.10), ('Estudiante', 0.07);

-- Inserts para la tabla Vendedores
INSERT INTO Vendedores (Id_Usuarios, Id_Rutas) VALUES
(1, 1), (2, 2), (3, 3), (4, 4), (5, 5),
(6, 6), (7, 7), (8, 8), (9, 9), (10, 10);

-- Inserts para la tabla Rutas
INSERT INTO Rutas (Locacion) VALUES
('Zona 1 - Ruta A'), ('Zona 2 - Ruta B'), ('Zona 3 - Ruta C'), ('Zona 4 - Ruta D'), ('Zona 5 - Ruta E'),
('Zona 6 - Ruta F'), ('Zona 7 - Ruta G'), ('Zona 8 - Ruta H'), ('Zona 9 - Ruta I'), ('Zona 10 - Ruta J');

-- Inserts para la tabla Envios
INSERT INTO Envios (Id_Pedidos, Fecha_Envio, Fecha_Entrega_Estimada, Transporte, Id_Estado_Envio, Numero_De_Envio) VALUES
(1, '2025-03-01 10:00:00', '2025-03-05', 'Camioneta', 1, 'A12345'),
(2, '2025-03-02 12:00:00', '2025-03-06', 'Moto', 1, 'B12345'),
(3, '2025-03-03 14:00:00', '2025-03-07', 'Camion', 2, 'C12345'),
(4, '2025-03-04 16:00:00', '2025-03-08', 'Camioneta', 2, 'D12345'),
(5, '2025-03-05 18:00:00', '2025-03-09', 'Moto', 3, 'E12345'),
(6, '2025-03-06 20:00:00', '2025-03-10', 'Camion', 3, 'F12345'),
(7, '2025-03-07 08:00:00', '2025-03-11', 'Camioneta', 4, 'G12345'),
(8, '2025-03-08 10:00:00', '2025-03-12', 'Moto', 4, 'H12345'),
(9, '2025-03-09 12:00:00', '2025-03-13', 'Camion', 1, 'I12345'),
(10, '2025-03-10 14:00:00', '2025-03-14', 'Camioneta', 1, 'J12345');

-- Inserts para la tabla Transportes
INSERT INTO Transportes (Nombre, Telefono) VALUES
('Transportes El Sol', '555-0001'),
('Transporte Rápido', '555-0002'),
('Transportes Santa Fe', '555-0003'),
('Transportes Modernos', '555-0004'),
('Transporte La Paz', '555-0005'),
('Transportes Rutas Verdes', '555-0006'),
('Transportes Expreso', '555-0007'),
('Transporte 24h', '555-0008'),
('Transportes Guatemaltecos', '555-0009'),
('Transportes Comodidad', '555-0010');

-- Inserts para la tabla Inventarios
INSERT INTO Inventarios (Cantidad, Id_Zapatos, Fecha_De_Ingreso, Id_Usuarios, Estado) VALUES
(100, 1, '2025-03-01', 1, 'Disponible'),
(150, 2, '2025-03-02', 2, 'Disponible'),
(200, 3, '2025-03-03', 3, 'Disponible'),
(120, 4, '2025-03-04', 4, 'Agotado'),
(180, 5, '2025-03-05', 5, 'Disponible'),
(300, 6, '2025-03-06', 6, 'Disponible'),
(50, 7, '2025-03-07', 7, 'Agotado'),
(80, 8, '2025-03-08', 8, 'Disponible'),
(90, 9, '2025-03-09', 9, 'Disponible'),
(70, 10, '2025-03-10', 10, 'Agotado');

-- Inserts para la tabla Roles
INSERT INTO Roles (Rol) VALUES
('Administrador'),
('Vendedor'),
('Gerente'),
('Cajero'),
('Encargado de Inventario'),
('Contador'),
('Supervisor'),
('Encargado de Envíos'),
('Atención al Cliente'),
('Repartidor');

-- Inserts para la tabla Usuarios
INSERT INTO Usuarios (Id_Roles, Nombre, Apellido) VALUES
(1, 'Carlos', 'Hernández'),
(2, 'Ana', 'Ruiz'),
(3, 'Luis', 'Pérez'),
(4, 'Marta', 'Gómez'),
(5, 'Javier', 'Martínez'),
(6, 'Sofía', 'Rodríguez'),
(7, 'Roberto', 'López'),
(8, 'Patricia', 'González'),
(9, 'Juan', 'Sánchez'),
(10, 'María', 'Torres');

-- Inserts para la tabla Cuentas_Usuarios
INSERT INTO Cuentas_Usuarios (Id_Usuarios, Usuario, Contrasena) VALUES
(1, 'carlos_admin', 'admin123'),
(2, 'ana_vendedor', 'vendedor123'),
(3, 'luis_gerente', 'gerente123'),
(4, 'marta_cajero', 'cajero123'),
(5, 'javier_inventario', 'inventario123'),
(6, 'sofia_contador', 'contador123'),
(7, 'roberto_supervisor', 'supervisor123'),
(8, 'patricia_atencion', 'atencion123'),
(9, 'juan_repartidor', 'repartidor123'),
(10, 'maria_cliente', 'cliente123');

-- Inserts para la tabla Catalogos
INSERT INTO Catalogos (Año, Catalogo) VALUES
(2025, 'Catálogo Invierno 2025'),
(2025, 'Catálogo Verano 2025'),
(2024, 'Catálogo Otoño 2024'),
(2024, 'Catálogo Primavera 2024'),
(2023, 'Catálogo Invierno 2023'),
(2023, 'Catálogo Verano 2023'),
(2022, 'Catálogo Otoño 2022'),
(2022, 'Catálogo Primavera 2022'),
(2021, 'Catálogo Invierno 2021'),
(2021, 'Catálogo Verano 2021');

-- Inserts para la tabla Tipos_De_Calzados
INSERT INTO Tipos_De_Calzados (Tipo) VALUES
('Zapatos de Hombre'),
('Zapatos de Mujer'),
('Zapatos Deportivos'),
('Sandalias'),
('Botas'),
('Botines'),
('Zapatillas'),
('Tacones'),
('Mocasines'),
('Zapatos Casual');

-- Inserts para la tabla Zapatos
INSERT INTO Zapatos (Codigo, Nombre, Id_Tipo_De_Zapato) VALUES
('Z001', 'Zapato Clásico Negro', 1),
('Z002', 'Zapato Deportivo Azul', 3),
('Z003', 'Sandalia Verano', 4),
('Z004', 'Bota Cuero Marrón', 5),
('Z005', 'Botín Negro', 6),
('Z006', 'Zapatilla de Running', 7),
('Z007', 'Tacón Alto Rojo', 8),
('Z008', 'Mocasín de Hombre', 9),
('Z009', 'Zapato Casual Azul', 10),
('Z010', 'Zapato Elegante Hombre', 1);

-- Inserts para la tabla Tallas
INSERT INTO Tallas (Talla_EU, Talla_US) VALUES
(36, 6),
(37, 7),
(38, 8),
(39, 9),
(40, 10),
(41, 11),
(42, 12),
(43, 13),
(44, 14),
(45, 15);

-- Inserts para la tabla Zapatos_Tallas
INSERT INTO Zapatos_Tallas (Id_Zapato, Id_Talla, Stock) VALUES
(1, 1, 20),
(1, 2, 30),
(2, 3, 40),
(3, 4, 15),
(4, 5, 25),
(5, 6, 10),
(6, 7, 50),
(7, 8, 60),
(8, 9, 70),
(9, 10, 80);

-- Inserts para la tabla Pedidos
INSERT INTO Pedidos (Id_Cliente, Id_Estado_Pedido, Id_Vendedor, Id_Metodo_De_Pago, Subtotal, Total) VALUES
(1, 1, 1, 1, 250.50, 300.00),
(2, 2, 2, 2, 150.00, 180.00),
(3, 3, 3, 3, 300.75, 350.00),
(4, 4, 4, 4, 120.00, 140.00),
(5, 5, 5, 5, 220.30, 250.00),
(6, 6, 6, 6, 180.50, 200.00),
(7, 7, 7, 7, 350.00, 400.00),
(8, 8, 8, 8, 400.20, 450.00),
(9, 9, 9, 9, 150.90, 170.00),
(10, 10, 10, 10, 500.00, 550.00);

-- Inserts para la tabla Detalle_Pedidos
INSERT INTO Detalle_Pedidos (Cantidad, Id_Zapato, Id_Pedido) VALUES
(2, 1, 1),
(1, 2, 2),
(3, 3, 3),
(1, 4, 4),
(2, 5, 5),
(4, 6, 6),
(5, 7, 7),
(2, 8, 8),
(1, 9, 9),
(3, 10, 10);

-- Inserts para la tabla Estados_Pedidos
INSERT INTO Estados_Pedidos (Estado) VALUES
('En Bodega'),
('Empacado'),
('En Ruta'),
('Entregado');

-- Inserts para la tabla Estados_Pedido_Historico
INSERT INTO Estados_Pedido_Historico (Id_Pedido, Id_Estado_Pedido, Id_Usuario, Fecha_Actualizacion, Observacion) VALUES
(1, 1, 1, '2025-03-01 10:00:00', 'Pedido en bodega'),
(2, 2, 2, '2025-03-02 12:00:00', 'Pedido empacado'),
(3, 3, 3, '2025-03-03 14:00:00', 'Pedido en ruta'),
(4, 4, 4, '2025-03-04 16:00:00', 'Pedido entregado'),
(5, 1, 5, '2025-03-05 18:00:00', 'Pedido en bodega'),
(6, 2, 6, '2025-03-06 20:00:00', 'Pedido empacado'),
(7, 3, 7, '2025-03-07 08:00:00', 'Pedido en ruta'),
(8, 4, 8, '2025-03-08 10:00:00', 'Pedido entregado'),
(9, 1, 9, '2025-03-09 12:00:00', 'Pedido en bodega'),
(10, 2, 10, '2025-03-10 14:00:00', 'Pedido empacado');

-- Inserts para la tabla Facturas
INSERT INTO Facturas (Id_Pedido, Subtotal, Impuestos, Total, Estado) VALUES
(1, 250.50, 49.50, 300.00, 'Pagada'),
(2, 150.00, 30.00, 180.00, 'Pendiente'),
(3, 300.75, 49.25, 350.00, 'Pendiente'),
(4, 120.00, 20.00, 140.00, 'Pagada'),
(5, 220.30, 29.70, 250.00, 'Pagada'),
(6, 180.50, 19.50, 200.00, 'Pendiente'),
(7, 350.00, 50.00, 400.00, 'Pagada'),
(8, 400.20, 49.80, 450.00, 'Pendiente'),
(9, 150.90, 19.10, 170.00, 'Pagada'),
(10, 500.00, 50.00, 550.00, 'Pendiente');
