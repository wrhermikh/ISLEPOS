CREATE TABLE shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  currency char(3) NOT NULL DEFAULT 'MVR' CHECK (currency = 'MVR'),
  timezone text NOT NULL DEFAULT 'Indian/Maldives',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE staff_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
  clerk_user_id text UNIQUE,
  email text NOT NULL,
  full_name text,
  role text NOT NULL CHECK (role IN ('owner', 'cashier')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, email)
);

CREATE INDEX staff_users_shop_role_idx ON staff_users(shop_id, role, status);

CREATE TABLE product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, name)
);

CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
  full_name text NOT NULL,
  phone text,
  email text,
  address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX customers_shop_name_idx ON customers(shop_id, full_name);

CREATE TABLE suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
  name text NOT NULL,
  phone text,
  email text,
  address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX suppliers_shop_name_idx ON suppliers(shop_id, name);

CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
  category_id uuid REFERENCES product_categories(id) ON DELETE RESTRICT,
  sku text NOT NULL,
  barcode text,
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'each',
  selling_price_laari bigint NOT NULL CHECK (selling_price_laari >= 0),
  cost_price_laari bigint NOT NULL DEFAULT 0 CHECK (cost_price_laari >= 0),
  weighted_average_cost_laari bigint NOT NULL DEFAULT 0 CHECK (weighted_average_cost_laari >= 0),
  low_stock_threshold numeric(14, 3) NOT NULL DEFAULT 0 CHECK (low_stock_threshold >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, sku)
);
CREATE UNIQUE INDEX products_shop_barcode_idx ON products(shop_id, barcode) WHERE barcode IS NOT NULL;
CREATE INDEX products_shop_name_idx ON products(shop_id, name);

CREATE TABLE financial_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
  name text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('cash', 'bank')),
  opening_balance_laari bigint NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, name)
);

CREATE TABLE quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
  quotation_number text NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'expired', 'converted', 'cancelled')),
  subtotal_laari bigint NOT NULL DEFAULT 0 CHECK (subtotal_laari >= 0),
  discount_laari bigint NOT NULL DEFAULT 0 CHECK (discount_laari >= 0),
  total_laari bigint NOT NULL DEFAULT 0 CHECK (total_laari >= 0),
  created_by uuid REFERENCES staff_users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, quotation_number),
  CHECK (discount_laari <= subtotal_laari),
  CHECK (total_laari = subtotal_laari - discount_laari)
);

CREATE TABLE quotation_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES quotations(id) ON DELETE RESTRICT,
  product_id uuid REFERENCES products(id) ON DELETE RESTRICT,
  description text NOT NULL,
  quantity numeric(14, 3) NOT NULL CHECK (quantity > 0),
  unit_price_laari bigint NOT NULL CHECK (unit_price_laari >= 0),
  line_total_laari bigint NOT NULL CHECK (line_total_laari >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
  invoice_number text NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE RESTRICT,
  quotation_id uuid REFERENCES quotations(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'partially_paid', 'paid', 'void', 'refunded')),
  subtotal_laari bigint NOT NULL DEFAULT 0 CHECK (subtotal_laari >= 0),
  discount_laari bigint NOT NULL DEFAULT 0 CHECK (discount_laari >= 0),
  total_laari bigint NOT NULL DEFAULT 0 CHECK (total_laari >= 0),
  created_by uuid REFERENCES staff_users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, invoice_number),
  CHECK (discount_laari <= subtotal_laari),
  CHECK (total_laari = subtotal_laari - discount_laari)
);
CREATE INDEX invoices_shop_status_created_idx ON invoices(shop_id, status, created_at);

CREATE TABLE invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  product_id uuid REFERENCES products(id) ON DELETE RESTRICT,
  description text NOT NULL,
  quantity numeric(14, 3) NOT NULL CHECK (quantity > 0),
  unit_price_laari bigint NOT NULL CHECK (unit_price_laari >= 0),
  line_total_laari bigint NOT NULL CHECK (line_total_laari >= 0),
  unit_cost_laari bigint NOT NULL DEFAULT 0 CHECK (unit_cost_laari >= 0),
  cogs_laari bigint NOT NULL DEFAULT 0 CHECK (cogs_laari >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE RESTRICT,
  purchase_number text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'received', 'void')),
  total_laari bigint NOT NULL DEFAULT 0 CHECK (total_laari >= 0),
  created_by uuid REFERENCES staff_users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, purchase_number)
);

CREATE TABLE purchase_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES purchases(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity numeric(14, 3) NOT NULL CHECK (quantity > 0),
  unit_cost_laari bigint NOT NULL CHECK (unit_cost_laari >= 0),
  line_total_laari bigint NOT NULL CHECK (line_total_laari >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE journal_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
  transaction_type text NOT NULL CHECK (transaction_type IN (
    'sale', 'payment', 'refund', 'expense', 'purchase', 'transfer',
    'owner_capital', 'owner_withdrawal', 'loan_received', 'loan_repayment',
    'stock_adjustment', 'opening_balance', 'correction'
  )),
  source_type text NOT NULL,
  source_id uuid,
  idempotency_key text NOT NULL,
  reversal_of uuid REFERENCES journal_transactions(id) ON DELETE RESTRICT,
  correction_reason text,
  created_by uuid REFERENCES staff_users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, idempotency_key),
  CHECK (reversal_of IS NULL OR correction_reason IS NOT NULL)
);

CREATE TABLE ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES journal_transactions(id) ON DELETE RESTRICT,
  account_id uuid REFERENCES financial_accounts(id) ON DELETE RESTRICT,
  account_code text NOT NULL CHECK (account_code IN (
    'cash', 'bank', 'receivables', 'payables', 'sales', 'discounts',
    'inventory', 'cost_of_goods_sold', 'expenses', 'owner_capital',
    'owner_withdrawals', 'loans'
  )),
  side text NOT NULL CHECK (side IN ('debit', 'credit')),
  amount_laari bigint NOT NULL CHECK (amount_laari > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ledger_entries_transaction_idx ON ledger_entries(transaction_id);
CREATE INDEX ledger_entries_account_idx ON ledger_entries(account_id, created_at);

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
  account_id uuid NOT NULL REFERENCES financial_accounts(id) ON DELETE RESTRICT,
  amount_laari bigint NOT NULL CHECK (amount_laari > 0),
  method text NOT NULL CHECK (method IN ('cash', 'bank_transfer', 'card', 'other')),
  reference text,
  idempotency_key text NOT NULL,
  journal_transaction_id uuid NOT NULL REFERENCES journal_transactions(id) ON DELETE RESTRICT,
  received_by uuid REFERENCES staff_users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, idempotency_key)
);

CREATE TABLE payment_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  amount_laari bigint NOT NULL CHECK (amount_laari > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (payment_id, invoice_id)
);

CREATE TABLE expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
  account_id uuid NOT NULL REFERENCES financial_accounts(id) ON DELETE RESTRICT,
  category text NOT NULL,
  description text NOT NULL,
  amount_laari bigint NOT NULL CHECK (amount_laari > 0),
  journal_transaction_id uuid NOT NULL REFERENCES journal_transactions(id) ON DELETE RESTRICT,
  created_by uuid REFERENCES staff_users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE account_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
  source_account_id uuid NOT NULL REFERENCES financial_accounts(id) ON DELETE RESTRICT,
  destination_account_id uuid NOT NULL REFERENCES financial_accounts(id) ON DELETE RESTRICT,
  amount_laari bigint NOT NULL CHECK (amount_laari > 0),
  reason text NOT NULL,
  idempotency_key text NOT NULL,
  journal_transaction_id uuid NOT NULL REFERENCES journal_transactions(id) ON DELETE RESTRICT,
  created_by uuid REFERENCES staff_users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, idempotency_key),
  CHECK (source_account_id <> destination_account_id)
);

CREATE TABLE refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  amount_laari bigint NOT NULL CHECK (amount_laari > 0),
  reason text NOT NULL,
  idempotency_key text NOT NULL,
  journal_transaction_id uuid NOT NULL REFERENCES journal_transactions(id) ON DELETE RESTRICT,
  approved_by uuid NOT NULL REFERENCES staff_users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, idempotency_key)
);

CREATE TABLE stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  movement_type text NOT NULL CHECK (movement_type IN ('opening', 'purchase', 'sale', 'refund', 'adjustment', 'reversal')),
  quantity numeric(14, 3) NOT NULL CHECK (quantity <> 0),
  unit_cost_laari bigint NOT NULL CHECK (unit_cost_laari >= 0),
  source_type text NOT NULL,
  source_id uuid,
  reason text NOT NULL,
  created_by uuid REFERENCES staff_users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX stock_movements_product_date_idx ON stock_movements(product_id, created_at);

CREATE TABLE cash_closings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
  account_id uuid NOT NULL REFERENCES financial_accounts(id) ON DELETE RESTRICT,
  business_date date NOT NULL,
  opening_cash_laari bigint NOT NULL,
  cash_received_laari bigint NOT NULL DEFAULT 0,
  cash_paid_out_laari bigint NOT NULL DEFAULT 0,
  expected_closing_laari bigint NOT NULL,
  counted_closing_laari bigint NOT NULL,
  difference_laari bigint GENERATED ALWAYS AS (counted_closing_laari - expected_closing_laari) STORED,
  note text,
  closed_by uuid REFERENCES staff_users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, business_date),
  CHECK (expected_closing_laari = opening_cash_laari + cash_received_laari - cash_paid_out_laari)
);

CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
  actor_user_id uuid REFERENCES staff_users(id) ON DELETE RESTRICT,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_shop_created_idx ON audit_log(shop_id, created_at DESC);

CREATE TABLE app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
  setting_key text NOT NULL,
  setting_value jsonb NOT NULL,
  updated_by uuid REFERENCES staff_users(id) ON DELETE RESTRICT,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, setting_key)
);

CREATE OR REPLACE FUNCTION reject_append_only_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Records in % are append-only; record a reversal or correction instead', TG_TABLE_NAME;
END;
$$;

CREATE TRIGGER journal_transactions_append_only
  BEFORE UPDATE OR DELETE ON journal_transactions
  FOR EACH ROW EXECUTE FUNCTION reject_append_only_mutation();
CREATE TRIGGER ledger_entries_append_only
  BEFORE UPDATE OR DELETE ON ledger_entries
  FOR EACH ROW EXECUTE FUNCTION reject_append_only_mutation();
CREATE TRIGGER payments_append_only
  BEFORE UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION reject_append_only_mutation();
CREATE TRIGGER refunds_append_only
  BEFORE UPDATE OR DELETE ON refunds
  FOR EACH ROW EXECUTE FUNCTION reject_append_only_mutation();
CREATE TRIGGER account_transfers_append_only
  BEFORE UPDATE OR DELETE ON account_transfers
  FOR EACH ROW EXECUTE FUNCTION reject_append_only_mutation();
CREATE TRIGGER stock_movements_append_only
  BEFORE UPDATE OR DELETE ON stock_movements
  FOR EACH ROW EXECUTE FUNCTION reject_append_only_mutation();
CREATE TRIGGER cash_closings_append_only
  BEFORE UPDATE OR DELETE ON cash_closings
  FOR EACH ROW EXECUTE FUNCTION reject_append_only_mutation();
CREATE TRIGGER audit_log_append_only
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION reject_append_only_mutation();

INSERT INTO shops (id, name, currency, timezone)
VALUES ('00000000-0000-4000-8000-000000000001', 'Maldives Demo Shop', 'MVR', 'Indian/Maldives');

INSERT INTO financial_accounts (id, shop_id, name, account_type, opening_balance_laari)
VALUES
  ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000001', 'Cash drawer', 'cash', 0),
  ('00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000001', 'Bank', 'bank', 0);

INSERT INTO product_categories (id, shop_id, name)
VALUES
  ('00000000-0000-4000-8000-000000000021', '00000000-0000-4000-8000-000000000001', 'Groceries'),
  ('00000000-0000-4000-8000-000000000022', '00000000-0000-4000-8000-000000000001', 'Household');

INSERT INTO suppliers (id, shop_id, name, phone, address)
VALUES ('00000000-0000-4000-8000-000000000031', '00000000-0000-4000-8000-000000000001', 'Demo Island Wholesale', '+960 700 0000', 'Malé, Maldives');

INSERT INTO customers (id, shop_id, full_name, phone)
VALUES ('00000000-0000-4000-8000-000000000041', '00000000-0000-4000-8000-000000000001', 'Demo Customer', '+960 700 0001');

INSERT INTO products (id, shop_id, category_id, sku, name, selling_price_laari, cost_price_laari, weighted_average_cost_laari, low_stock_threshold)
VALUES
  ('00000000-0000-4000-8000-000000000051', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000021', 'TEA-001', 'Ceylon tea 100g', 2500, 1750, 1750, 4),
  ('00000000-0000-4000-8000-000000000052', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000021', 'RICE-001', 'Basmati rice 1kg', 4800, 3900, 3900, 5),
  ('00000000-0000-4000-8000-000000000053', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000022', 'SOAP-001', 'Coconut soap', 1800, 1200, 1200, 6);

INSERT INTO stock_movements (id, shop_id, product_id, movement_type, quantity, unit_cost_laari, source_type, source_id, reason)
VALUES
  ('00000000-0000-4000-8000-000000000061', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000051', 'opening', 12, 1750, 'demo_seed', '00000000-0000-4000-8000-000000000071', 'Initial demo inventory'),
  ('00000000-0000-4000-8000-000000000062', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000052', 'opening', 9, 3900, 'demo_seed', '00000000-0000-4000-8000-000000000071', 'Initial demo inventory'),
  ('00000000-0000-4000-8000-000000000063', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000053', 'opening', 18, 1200, 'demo_seed', '00000000-0000-4000-8000-000000000071', 'Initial demo inventory');
