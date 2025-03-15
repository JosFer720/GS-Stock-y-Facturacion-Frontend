-- roles
CREATE TABLE roles (
    Id SERIAL PRIMARY KEY,
    rol VARCHAR(50) NOT NULL UNIQUE
);

-- usuarios
CREATE TABLE usuarios (
    Id SERIAL PRIMARY KEY,
    Id_roles INT NOT NULL,
    Nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    FOREIGN KEY (Id_roles) REFERENCES roles(Id)
);

-- Cuentas_de_usuarios
CREATE TABLE Cuentas_de_usuarios (
    Id SERIAL PRIMARY KEY,
    Id_usuarios INT NOT NULL,
    Usuario VARCHAR(100) NOT NULL UNIQUE,
    contraseña VARCHAR(100) NOT NULL,
    FOREIGN KEY (Id_usuarios) REFERENCES usuarios(Id)
);

-- Rutas
CREATE TABLE Rutas (
    Id SERIAL PRIMARY KEY,
    locacion VARCHAR(255) NOT NULL UNIQUE
);

-- Transportes
CREATE TABLE Transportes (
    Id SERIAL PRIMARY KEY,
    Nombre VARCHAR(100) NOT NULL,
    Telefono VARCHAR(50) NULL
);

-- Metodos_de_pago
CREATE TABLE Metodos_de_pago (
    Id SERIAL PRIMARY KEY,
    Tipo VARCHAR(100) NOT NULL,
    detalle VARCHAR(255) NULL
);

-- Tipos_de_cliente
CREATE TABLE Tipos_de_cliente (
    Id SERIAL PRIMARY KEY,
    Tipo VARCHAR(100) NOT NULL UNIQUE,
    descuento DECIMAL(5,2) NOT NULL
);

-- Catalogos
CREATE TABLE Catalogos (
    Id SERIAL PRIMARY KEY,
    "Año" INT NOT NULL,
    catalogo VARCHAR(255) NOT NULL
);

-- Tipos_de_calzados
CREATE TABLE Tipos_de_calzados (
    Id SERIAL PRIMARY KEY,
    tipo VARCHAR(100) NOT NULL UNIQUE
);

-- Tallas
CREATE TABLE Tallas (
    Id SERIAL PRIMARY KEY,
    Talla_us VARCHAR(10) NOT NULL,
    Talla_ue VARCHAR(10) NOT NULL
);

-- Direcciones
CREATE TABLE Direcciones (
    Id SERIAL PRIMARY KEY,
    Direccion VARCHAR(255) NOT NULL UNIQUE
);

-- Clientes
CREATE TABLE Clientes (
    Id SERIAL PRIMARY KEY,
    Nombre VARCHAR(100) NOT NULL,
    Apellido VARCHAR(100) NOT NULL,
    Id_direcciones INT NULL,
    Empresa VARCHAR(255) NULL,
    FOREIGN KEY (Id_direcciones) REFERENCES Direcciones(Id)
);

-- Cliente_Direcciones
CREATE TABLE Cliente_Direcciones (
    Id SERIAL PRIMARY KEY,
    Id_cliente INT NOT NULL,
    Id_direccion INT NOT NULL,
    FOREIGN KEY (Id_cliente) REFERENCES Clientes(Id),
    FOREIGN KEY (Id_direccion) REFERENCES Direcciones(Id),
    UNIQUE (Id_cliente, Id_direccion)
);

-- Telefonos
CREATE TABLE Telefonos (
    Id SERIAL PRIMARY KEY,
    telefono VARCHAR(50) NOT NULL UNIQUE
);

-- Cliente_telefonos
CREATE TABLE Cliente_telefonos (
    Id SERIAL PRIMARY KEY,
    Id_cliente INT NOT NULL,
    Id_telefono INT NOT NULL,
    FOREIGN KEY (Id_cliente) REFERENCES Clientes(Id),
    FOREIGN KEY (Id_telefono) REFERENCES Telefonos(Id),
    UNIQUE (Id_cliente, Id_telefono)
);

-- Estados_pedido
CREATE TABLE Estados_pedido (
    Id SERIAL PRIMARY KEY,
    Estado VARCHAR(50) NOT NULL UNIQUE,
    Fecha_creacion DATE NOT NULL,
    Fecha_actualizacion DATE DEFAULT NULL,
    Activo BOOLEAN NOT NULL DEFAULT TRUE
);

-- Vendedores
CREATE TABLE Vendedores (
    Id SERIAL PRIMARY KEY,
    Id_usuarios INT NOT NULL,
    Id_rutas INT NOT NULL,
    FOREIGN KEY (Id_usuarios) REFERENCES usuarios(Id),
    FOREIGN KEY (Id_rutas) REFERENCES Rutas(Id)
);

-- Zapatos
CREATE TABLE Zapatos (
    Id SERIAL PRIMARY KEY,
    Codigo VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    Id_tipo_de_zapato INT NOT NULL,
    FOREIGN KEY (Id_tipo_de_zapato) REFERENCES Tipos_de_calzados(Id)
);

-- Pedidos
CREATE TABLE Pedidos (
    Id SERIAL PRIMARY KEY,
    Id_cliente INT NOT NULL,
    Id_estado_pedido INT NOT NULL,
    Id_vendedor INT NOT NULL,
    Id_metodo_de_pago INT NOT NULL,
    Fecha DATE NOT NULL,
    Subtotal DECIMAL(10,2) NOT NULL,
    Total DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (Id_cliente) REFERENCES Clientes(Id),
    FOREIGN KEY (Id_estado_pedido) REFERENCES Estados_pedido(Id),
    FOREIGN KEY (Id_vendedor) REFERENCES Vendedores(Id),
    FOREIGN KEY (Id_metodo_de_pago) REFERENCES Metodos_de_pago(Id)
);

-- Detalle_pedidos
CREATE TABLE Detalle_pedidos (
    Id SERIAL PRIMARY KEY,
    Id_pedido INT NOT NULL,
    Cantidad INT NOT NULL,
    Id_zapato INT NOT NULL,
    FOREIGN KEY (Id_pedido) REFERENCES Pedidos(Id),
    FOREIGN KEY (Id_zapato) REFERENCES Zapatos(Id)
);

-- Zapatos_Tallas
CREATE TABLE Zapatos_Tallas (
    Id SERIAL PRIMARY KEY,
    Id_zapato INT NOT NULL,
    Id_talla INT NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    FOREIGN KEY (Id_zapato) REFERENCES Zapatos(Id),
    FOREIGN KEY (Id_talla) REFERENCES Tallas(Id),
    UNIQUE (Id_zapato, Id_talla)
);

-- Cuentas_por_cobrar
CREATE TABLE Cuentas_por_cobrar (
    Id SERIAL PRIMARY KEY,
    Id_tipo_cliente INT NOT NULL,
    Total_deuda DECIMAL(10,2) NOT NULL,
    Fecha_creacion DATE NOT NULL,
    Id_pedido INT NULL,
    FOREIGN KEY (Id_tipo_cliente) REFERENCES Tipos_de_cliente(Id),
    FOREIGN KEY (Id_pedido) REFERENCES Pedidos(Id)
);

-- Abonos
CREATE TABLE Abonos (
    Id SERIAL PRIMARY KEY,
    Id_cuenta_por_cobrar INT NOT NULL,
    Monto_abono DECIMAL(10,2) NOT NULL,
    Fecha_abono DATE NOT NULL,
    Id_metodo_de_pago INT NOT NULL,
    FOREIGN KEY (Id_cuenta_por_cobrar) REFERENCES Cuentas_por_cobrar(Id),
    FOREIGN KEY (Id_metodo_de_pago) REFERENCES Metodos_de_pago(Id)
);

-- Inventarios
CREATE TABLE Inventarios (
    Id SERIAL PRIMARY KEY,
    Cantidad INT NOT NULL,
    Id_zapatos INT NOT NULL,
    Fecha_de_ingreso DATE NOT NULL,
    Id_usuarios INT NOT NULL,
    estado VARCHAR(50) NOT NULL,
    FOREIGN KEY (Id_zapatos) REFERENCES Zapatos(Id),
    FOREIGN KEY (Id_usuarios) REFERENCES usuarios(Id)
);

-- Envios
CREATE TABLE Envios (
    Id SERIAL PRIMARY KEY,
    Id_pedidos INT NOT NULL,
    Fecha_envio DATE NOT NULL,
    Fecha_entrega_estimada DATE NOT NULL,
    Transporte INT NOT NULL,
    Id_estado_envio INT NOT NULL,
    Numero_de_envio VARCHAR(50) NOT NULL,
    FOREIGN KEY (Id_pedidos) REFERENCES Pedidos(Id),
    FOREIGN KEY (Transporte) REFERENCES Transportes(Id)
);

-- Facturas
CREATE TABLE Facturas (
    Id SERIAL PRIMARY KEY,
    Id_pedido INT NOT NULL,
    Fecha_emision DATE NOT NULL,
    Subtotal DECIMAL(10,2) NOT NULL,
    Impuestos DECIMAL(10,2) NOT NULL,
    Total DECIMAL(10,2) NOT NULL,
    estado VARCHAR(50) NOT NULL,
    FOREIGN KEY (Id_pedido) REFERENCES Pedidos(Id)
);
