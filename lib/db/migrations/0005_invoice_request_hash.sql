ALTER TABLE invoices
  ADD COLUMN idempotency_request_hash text;
