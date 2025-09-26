-- 1. Crear la tabla nits
CREATE TABLE IF NOT EXISTS nits (
    id SERIAL PRIMARY KEY,
    nit VARCHAR(20) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Crear índice para optimizar búsquedas por NIT
CREATE INDEX IF NOT EXISTS idx_nits_nit ON nits(nit);

-- 3. PRIMERO: Eliminar la vista que depende de la columna nit
DROP VIEW IF EXISTS vista_pedidos_envios CASCADE;

-- 4. AHORA SÍ: Eliminar la columna nit de clientes
ALTER TABLE clientes DROP COLUMN IF EXISTS nit;

-- 5. Agregar la columna id_nit a la tabla clientes
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS id_nit INTEGER REFERENCES nits(id) ON DELETE SET NULL;

-- 6. Crear índice para la relación
CREATE INDEX IF NOT EXISTS idx_clientes_id_nit ON clientes(id_nit);

-- 7. TEMPORAL: La vista se recreará después manualmente
-- Busca en 09-moddify-envios.sql la definición original de vista_pedidos_envios
-- y créala sin usar la columna nit