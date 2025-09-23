BEGIN;

-- 1) Add column if it doesn't exist
ALTER TABLE detalle_pedidos
  ADD COLUMN IF NOT EXISTS id_talla INT;

-- 2) Add FK (if not present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.table_name = 'detalle_pedidos'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND tc.constraint_name = 'fk_detalle_pedidos_talla'
  ) THEN
    ALTER TABLE detalle_pedidos
      ADD CONSTRAINT fk_detalle_pedidos_talla
      FOREIGN KEY (id_talla) REFERENCES tallas(id);
  END IF;
END
$$;

-- 3) Helpful index for lookups
CREATE INDEX IF NOT EXISTS idx_detalle_pedidos_id_talla
  ON detalle_pedidos(id_talla);

COMMIT;

ALTER TABLE Pedidos ALTER COLUMN Id_Estado_Pedido SET DEFAULT 1;