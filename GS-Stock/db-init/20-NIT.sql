-- 1. Crear la tabla nits
CREATE TABLE IF NOT EXISTS nits (
    id SERIAL PRIMARY KEY,
    nit VARCHAR(20) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Crear índice para optimizar búsquedas por NIT
CREATE INDEX idx_nits_nit ON nits(nit);

-- 3. Eliminar la columna nit de clientes si existe
ALTER TABLE clientes DROP COLUMN IF EXISTS nit;

-- 4. Agregar la columna id_nit a la tabla clientes
ALTER TABLE clientes ADD COLUMN id_nit INTEGER REFERENCES nits(id) ON DELETE SET NULL;

-- 5. Crear índice para la relación
CREATE INDEX idx_clientes_id_nit ON clientes(id_nit);