ALTER TABLE invoices
  ADD COLUMN idempotency_key text;

CREATE UNIQUE INDEX invoices_shop_idempotency_idx
  ON invoices(shop_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
