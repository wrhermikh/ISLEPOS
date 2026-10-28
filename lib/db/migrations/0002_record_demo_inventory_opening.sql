INSERT INTO journal_transactions (id, shop_id, transaction_type, source_type, idempotency_key)
VALUES (
  '00000000-0000-4000-8000-000000000071',
  '00000000-0000-4000-8000-000000000001',
  'opening_balance',
  'migration_seed',
  'initial-demo-inventory'
);

INSERT INTO ledger_entries (transaction_id, account_code, side, amount_laari)
VALUES
  ('00000000-0000-4000-8000-000000000071', 'inventory', 'debit', 77700),
  ('00000000-0000-4000-8000-000000000071', 'owner_capital', 'credit', 77700);
