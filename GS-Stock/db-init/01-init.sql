-- Tabla de Clientes
CREATE TABLE Clientes (
    Id SERIAL PRIMARY KEY,
    Nombre VARCHAR(50) NOT NULL,
    Apellido VARCHAR(50) NOT NULL,
    Id_Direcciones INT,
    Empresa VARCHAR(100)
);

-- Tabla de Direcciones
CREATE TABLE Direcciones (
    Id SERIAL PRIMARY KEY,
    Direccion TEXT NOT NULL
);

-- Tabla Cliente_Direcciones
CREATE TABLE Cliente_Direcciones (
    Id SERIAL PRIMARY KEY,
    Id_Cliente INT NOT NULL,
    Id_Direccion INT NOT NULL,
    FOREIGN KEY (Id_Cliente) REFERENCES Clientes(Id),
    FOREIGN KEY (Id_Direccion) REFERENCES Direcciones(Id)
);

-- Tabla de Telefonos
CREATE TABLE Telefonos (
    Id SERIAL PRIMARY KEY,
    Telefono VARCHAR(20) NOT NULL
);

-- Tabla Cliente_Telefonos
CREATE TABLE Cliente_Telefonos (
    Id SERIAL PRIMARY KEY,
    Id_Cliente INT NOT NULL,
    Id_Telefono INT NOT NULL,
    FOREIGN KEY (Id_Cliente) REFERENCES Clientes(Id),
    FOREIGN KEY (Id_Telefono) REFERENCES Telefonos(Id)
);

-- Tabla de Cuentas por Cobrar
CREATE TABLE Cuentas_Por_Cobrar (
    Id SERIAL PRIMARY KEY,
    Id_Tipo_Cliente INT NOT NULL,
    Total_Deuda DECIMAL(10,2) NOT NULL,
    Fecha_Creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Id_Pedido INT NOT NULL
);

-- Tabla de Abonos
CREATE TABLE Abonos (
    Id SERIAL PRIMARY KEY,
    Id_Cuenta_Por_Cobrar INT NOT NULL,
    Monto_Abono DECIMAL(10,2) NOT NULL,
    Fecha_Abono TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Id_Metodo_De_Pago INT NOT NULL
);

-- Tabla de Métodos de Pago
CREATE TABLE Metodos_De_Pago (
    Id SERIAL PRIMARY KEY,
    Tipo VARCHAR(50) NOT NULL,
    Detalle TEXT
);

-- Tabla de Tipos de Cliente
CREATE TABLE Tipos_De_Cliente (
    Id SERIAL PRIMARY KEY,
    Tipo VARCHAR(50) NOT NULL,
    Descuento DECIMAL(5,2) NOT NULL
);

-- Tabla de Vendedores
CREATE TABLE Vendedores (
    Id SERIAL PRIMARY KEY,
    Id_Usuarios INT NOT NULL,
    Id_Rutas INT NOT NULL
);

-- Tabla de Rutas
CREATE TABLE Rutas (
    Id SERIAL PRIMARY KEY,
    Locacion TEXT NOT NULL
);

-- Tabla de Envíos
CREATE TABLE Envios (
    Id SERIAL PRIMARY KEY,
    Id_Pedidos INT NOT NULL,
    Fecha_Envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Fecha_Entrega_Estimada DATE NOT NULL,
    Transporte VARCHAR(100) NOT NULL,
    Id_Estado_Envio INT NOT NULL,
    Numero_De_Envio VARCHAR(50) NOT NULL
);

-- Tabla de Transportes
CREATE TABLE Transportes (
    Id SERIAL PRIMARY KEY,
    Nombre VARCHAR(100) NOT NULL,
    Telefono VARCHAR(20) NOT NULL
);

-- Tabla de Inventarios
CREATE TABLE Inventarios (
    Id SERIAL PRIMARY KEY,
    Cantidad INT NOT NULL,
    Id_Zapatos INT NOT NULL,
    Fecha_De_Ingreso TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Id_Usuarios INT NOT NULL,
    Estado VARCHAR(50) NOT NULL
);

-- Tabla de Roles
CREATE TABLE Roles (
    Id SERIAL PRIMARY KEY,
    Rol VARCHAR(50) NOT NULL
);

-- Tabla de Usuarios
CREATE TABLE Usuarios (
    Id SERIAL PRIMARY KEY,
    Id_Roles INT NOT NULL,
    Nombre VARCHAR(50) NOT NULL,
    Apellido VARCHAR(50) NOT NULL
);

-- Tabla de Cuentas de Usuarios
CREATE TABLE Cuentas_Usuarios (
    Id SERIAL PRIMARY KEY,
    Id_Usuarios INT NOT NULL,
    Usuario VARCHAR(50) NOT NULL UNIQUE,
    Contrasena VARCHAR(255) NOT NULL
);

-- Tabla de Catálogos
CREATE TABLE Catalogos (
    Id SERIAL PRIMARY KEY,
    Año INT NOT NULL,
    Catalogo TEXT NOT NULL
);

-- Tabla de Tipos de Calzados
CREATE TABLE Tipos_De_Calzados (
    Id SERIAL PRIMARY KEY,
    Tipo VARCHAR(50) NOT NULL
);

-- Tabla de Zapatos
CREATE TABLE Zapatos (
    Id SERIAL PRIMARY KEY,
    Codigo VARCHAR(50) NOT NULL UNIQUE,
    Nombre VARCHAR(100) NOT NULL,
    Id_Tipo_De_Zapato INT NOT NULL
);

-- Tabla de Tallas
CREATE TABLE Tallas (
    Id SERIAL PRIMARY KEY,
    Talla_EU INT NOT NULL,
    Talla_US INT NOT NULL
);

-- Tabla de Zapatos_Tallas
CREATE TABLE Zapatos_Tallas (
    Id SERIAL PRIMARY KEY,
    Id_Zapato INT NOT NULL,
    Id_Talla INT NOT NULL,
    Stock INT NOT NULL
);

-- Tabla de Pedidos
CREATE TABLE Pedidos (
    Id SERIAL PRIMARY KEY,
    Id_Cliente INT NOT NULL,
    Id_Estado_Pedido INT NOT NULL DEFAULT 1,
    Id_Vendedor INT NOT NULL,
    Id_Metodo_De_Pago INT NOT NULL,
    Fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Subtotal DECIMAL(10,2),
    Total DECIMAL(10,2)
);

-- Tabla de Detalle de Pedidos
CREATE TABLE Detalle_Pedidos (
    Id SERIAL PRIMARY KEY,
    Cantidad INT NOT NULL,
    Id_Zapato INT NOT NULL,
    Id_Pedido INT NOT NULL
);

-- Tabla de Estados de Pedidos
CREATE TABLE Estados_Pedidos (
    Id SERIAL PRIMARY KEY,
    Estado VARCHAR(50) NOT NULL UNIQUE CHECK (Estado IN ('En Bodega', 'Empacado', 'En Ruta', 'Entregado'))
);

-- Tabla de Estados Pedido Histórico
CREATE TABLE Estados_Pedido_Historico (
    Id SERIAL PRIMARY KEY,
    Id_Pedido INT NOT NULL,
    Id_Estado_Pedido INT NOT NULL,
    Id_Usuario INT NOT NULL,
    Fecha_Actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Observacion TEXT NULL
);

-- Tabla de Facturas
CREATE TABLE Facturas (
    Id SERIAL PRIMARY KEY,
    Id_Pedido INT NOT NULL,
    Fecha_Emision TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Subtotal DECIMAL(10,2),
    Impuestos DECIMAL(10,2),
    Total DECIMAL(10,2),
    Estado VARCHAR(50) NOT NULL
);

-- Tabla de tokens para recuperación de contraseña
CREATE TABLE password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES usuarios(id),
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);