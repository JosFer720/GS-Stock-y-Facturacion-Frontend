BEGIN;

ALTER TABLE Detalle_Pedidos
  ADD COLUMN IF NOT EXISTS precio_unitario NUMERIC(10,2);

UPDATE Detalle_Pedidos dp
SET precio_unitario = z.precio_par
FROM Zapatos z
WHERE dp.id_zapato = z.id
  AND (dp.precio_unitario IS NULL OR dp.precio_unitario = 0);

COMMIT;
