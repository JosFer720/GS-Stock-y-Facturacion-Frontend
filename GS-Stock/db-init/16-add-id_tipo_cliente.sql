BEGIN;

DO $$
DECLARE general_id INT;
BEGIN
  SELECT id INTO general_id
  FROM tipos_de_cliente
  WHERE lower(tipo) = 'general'
  LIMIT 1;

  IF general_id IS NULL THEN
    INSERT INTO tipos_de_cliente(tipo, descuento)
    VALUES ('General', 0.0)
    RETURNING id INTO general_id;
  END IF;
END
$$;

-- 1) Agregar columna en clientes si no existe
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS id_tipo_cliente INT;

-- 2) Rellenar nulos con 'General'
UPDATE clientes c
SET id_tipo_cliente = (
  SELECT id FROM tipos_de_cliente WHERE lower(tipo) = 'general' LIMIT 1
)
WHERE c.id_tipo_cliente IS NULL;

-- 3) Agregar FK si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.table_name = 'clientes'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND tc.constraint_name = 'fk_clientes_tipo_cliente'
  ) THEN
    ALTER TABLE clientes
      ADD CONSTRAINT fk_clientes_tipo_cliente
      FOREIGN KEY (id_tipo_cliente) REFERENCES tipos_de_cliente(id);
  END IF;
END
$$;

-- 4) Índice
CREATE INDEX IF NOT EXISTS idx_clientes_id_tipo_cliente
  ON clientes(id_tipo_cliente);

COMMIT;
