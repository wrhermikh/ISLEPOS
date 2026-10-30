import { createHash, randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { CreateCustomerBody, CreateSaleBody } from "@workspace/api-zod";
import { pool } from "@workspace/db";
import { logger } from "../lib/logger";
import {
  multiplyLaariByQuantity,
  parseLaari,
  parseQuantityMilli,
  quantityMilliToText,
} from "../lib/money";
import { resolveStaffUser } from "./staff-access";

const router: IRouter = Router();

class SaleError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

type PreparedLine = {
  productId: string;
  quantityMilli: bigint;
  unitPriceLaari: bigint;
  unitCostLaari: bigint;
  lineTotalLaari: bigint;
  cogsLaari: bigint;
};

function saleErrorResponse(error: unknown): { status: number; message: string } | null {
  if (error instanceof SaleError) {
    return { status: error.status, message: error.message };
  }
  if (error instanceof Error && /laari|amount|quantity|discount/i.test(error.message)) {
    return { status: 400, message: error.message };
  }
  return null;
}

router.get("/financial-accounts", async (req, res): Promise<void> => {
  const currentUser = await resolveStaffUser(req, res);
  if (!currentUser) return;

  const result = await pool.query(
    `SELECT id, name, account_type AS "accountType"
     FROM financial_accounts
     WHERE shop_id = $1 AND is_active = true
     ORDER BY account_type, name`,
    [currentUser.shopId],
  );
  res.json(result.rows);
});

router.get("/customers", async (req, res): Promise<void> => {
  const currentUser = await resolveStaffUser(req, res);
  if (!currentUser) return;

  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const pattern = search ? `%${search}%` : null;
  const result = await pool.query(
    `SELECT id, full_name AS "fullName", phone, email
     FROM customers
     WHERE shop_id = $1
       AND ($2::text IS NULL OR full_name ILIKE $2 OR COALESCE(phone, '') ILIKE $2)
     ORDER BY full_name
     LIMIT 100`,
    [currentUser.shopId, pattern],
  );
  res.json(result.rows);
});

router.post("/customers", async (req, res): Promise<void> => {
  const currentUser = await resolveStaffUser(req, res);
  if (!currentUser) return;

  const parsed = CreateCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const fullName = parsed.data.fullName.trim();
  if (!fullName) {
    res.status(400).json({ error: "Enter the customer's name." });
    return;
  }
  const phone = parsed.data.phone?.trim() || null;
  const email = parsed.data.email?.trim().toLowerCase() || null;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const created = await client.query(
      `INSERT INTO customers (shop_id, full_name, phone, email)
       VALUES ($1, $2, $3, $4)
       RETURNING id, full_name AS "fullName", phone, email`,
      [currentUser.shopId, fullName, phone, email],
    );
    const customer = created.rows[0];
    await client.query(
      `INSERT INTO audit_log (
         shop_id, actor_user_id, action, entity_type, entity_id, new_values
       )
       VALUES ($1, $2, 'customer_created', 'customer', $3, $4::jsonb)`,
      [
        currentUser.shopId,
        currentUser.id,
        customer.id,
        JSON.stringify({ fullName, phone, email }),
      ],
    );
    await client.query("COMMIT");
    res.status(201).json(customer);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    logger.error({ err: error }, "Could not create customer");
    res.status(500).json({ error: "We could not save the customer. Please try again." });
  } finally {
    client.release();
  }
});

router.post("/sales", async (req, res): Promise<void> => {
  const currentUser = await resolveStaffUser(req, res);
  if (!currentUser) return;

  const parsed = CreateSaleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const input = parsed.data;
  let discountLaari = 0n;
  try {
    discountLaari = input.discountLaari
      ? parseLaari(input.discountLaari, "discountLaari")
      : 0n;
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "The discount amount is invalid.",
    });
    return;
  }
  if (discountLaari > 0n && currentUser.role !== "owner") {
    res.status(403).json({ error: "Only an owner can approve a sale discount." });
    return;
  }
  const discountReason = input.discountReason?.trim() ?? "";
  if (discountLaari > 0n && !discountReason) {
    res.status(400).json({ error: "A reason is required for a discount." });
    return;
  }

  let normalizedItems: Array<{ productId: string; quantityMilli: bigint }>;
  let payments: Array<{
    accountId: string;
    amountLaari: bigint;
    method: "cash" | "bank_transfer" | "card" | "other";
    reference: string | null;
  }>;
  try {
    const quantities = new Map<string, bigint>();
    for (const item of input.items) {
      const quantity = parseQuantityMilli(item.quantity);
      if (quantity <= 0n) throw new SaleError(400, "Sale quantities must be greater than zero.");
      quantities.set(item.productId, (quantities.get(item.productId) ?? 0n) + quantity);
    }
    normalizedItems = [...quantities.entries()]
      .map(([productId, quantityMilli]) => {
        // Reuse the numeric(14,3) validator after combining repeated product rows.
        parseQuantityMilli(quantityMilliToText(quantityMilli));
        return { productId, quantityMilli };
      })
      .sort((left, right) => left.productId.localeCompare(right.productId));

    payments = (input.payments ?? []).map((payment) => {
      const amountLaari = parseLaari(payment.amountLaari);
      if (amountLaari <= 0n) {
        throw new SaleError(400, "Payment amounts must be greater than zero.");
      }
      return {
        accountId: payment.accountId,
        amountLaari,
        method: payment.method,
        reference: payment.reference?.trim() || null,
      };
    });
  } catch (error) {
    const response = saleErrorResponse(error);
    res.status(response?.status ?? 400).json({
      error: response?.message ?? "Sale quantities or payment amounts are invalid.",
    });
    return;
  }

  const paymentTotalLaari = payments.reduce(
    (total, payment) => total + payment.amountLaari,
    0n,
  );
  try {
    parseLaari(paymentTotalLaari.toString(), "paymentTotalLaari");
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "The payment total is too large.",
    });
    return;
  }
  const requestPayload = {
    items: normalizedItems.map((item) => ({
      productId: item.productId,
      quantity: quantityMilliToText(item.quantityMilli),
    })),
    customerId: input.customerId ?? null,
    discountLaari: discountLaari.toString(),
    discountReason,
    payments: payments.map((payment) => ({
      accountId: payment.accountId,
      amountLaari: payment.amountLaari.toString(),
      method: payment.method,
      reference: payment.reference,
    })),
  };
  const requestHash = createHash("sha256")
    .update(JSON.stringify(requestPayload))
    .digest("hex");

  const client = await pool.connect();
  let receiptResponse: {
    id: string;
    invoiceNumber: string;
    status: "issued" | "partially_paid" | "paid";
    subtotalLaari: string;
    discountLaari: string;
    totalLaari: string;
    paidLaari: string;
    balanceDueLaari: string;
    createdAt: string;
  } | null = null;
  try {
    await client.query("BEGIN");
    // Serialize retries with the same key before checking or creating an invoice.
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      [`${currentUser.shopId}:${input.idempotencyKey}`],
    );

    const existing = await client.query(
      `SELECT id, invoice_number, status, subtotal_laari::text AS subtotal_laari,
              discount_laari::text AS discount_laari, total_laari::text AS total_laari,
              created_at, idempotency_request_hash
       FROM invoices
       WHERE shop_id = $1 AND idempotency_key = $2
       FOR UPDATE`,
      [currentUser.shopId, input.idempotencyKey],
    );
    if (existing.rowCount) {
      const invoice = existing.rows[0];
      if (invoice.idempotency_request_hash !== requestHash) {
        throw new SaleError(409, "This checkout key was already used for different sale data.");
      }

      const paidResult = await client.query(
        `SELECT COALESCE(SUM(amount_laari), 0)::text AS paid_laari
         FROM payment_allocations WHERE invoice_id = $1`,
        [invoice.id],
      );
      const paidLaari = BigInt(paidResult.rows[0].paid_laari);
      await client.query("COMMIT");
      res.status(200).json({
        id: invoice.id,
        invoiceNumber: invoice.invoice_number,
        status: invoice.status,
        subtotalLaari: invoice.subtotal_laari,
        discountLaari: invoice.discount_laari,
        totalLaari: invoice.total_laari,
        paidLaari: paidLaari.toString(),
        balanceDueLaari: (BigInt(invoice.total_laari) - paidLaari).toString(),
        createdAt: new Date(invoice.created_at).toISOString(),
      });
      return;
    }

    const productIds = normalizedItems.map((item) => item.productId);
    const productsResult = await client.query(
      `SELECT id, sku, name, selling_price_laari::text AS selling_price_laari,
              weighted_average_cost_laari::text AS unit_cost_laari
       FROM products
       WHERE shop_id = $1 AND is_active = true AND id = ANY($2::uuid[])
       ORDER BY id
       FOR UPDATE`,
      [currentUser.shopId, productIds],
    );
    if (productsResult.rowCount !== productIds.length) {
      throw new SaleError(400, "One or more products are unavailable in this shop.");
    }

    const stockResult = await client.query(
      `SELECT product_id,
              COALESCE(SUM(quantity * 1000), 0)::bigint::text AS stock_milli
       FROM stock_movements
       WHERE shop_id = $1 AND product_id = ANY($2::uuid[])
       GROUP BY product_id`,
      [currentUser.shopId, productIds],
    );
    const stockById = new Map<string, bigint>(
      stockResult.rows.map((row) => [row.product_id as string, BigInt(row.stock_milli)]),
    );
    const productById = new Map<string, (typeof productsResult.rows)[number]>(
      productsResult.rows.map((product) => [product.id as string, product]),
    );

    const lines: PreparedLine[] = normalizedItems.map((item) => {
      const product = productById.get(item.productId);
      if (!product) throw new SaleError(400, "A product is unavailable in this shop.");
      const stockMilli = stockById.get(item.productId) ?? 0n;
      if (stockMilli < item.quantityMilli) {
        throw new SaleError(
          400,
          `Not enough stock for ${product.name}. Available: ${quantityMilliToText(stockMilli)}.`,
        );
      }

      const unitPriceLaari = parseLaari(product.selling_price_laari, "sellingPriceLaari");
      const unitCostLaari = parseLaari(product.unit_cost_laari, "unitCostLaari");
      return {
        productId: item.productId,
        quantityMilli: item.quantityMilli,
        unitPriceLaari,
        unitCostLaari,
        lineTotalLaari: multiplyLaariByQuantity(unitPriceLaari, item.quantityMilli),
        cogsLaari: multiplyLaariByQuantity(unitCostLaari, item.quantityMilli),
      };
    });

    const subtotalLaari = lines.reduce((sum, line) => sum + line.lineTotalLaari, 0n);
    parseLaari(subtotalLaari.toString(), "subtotalLaari");
    if (discountLaari > subtotalLaari) {
      throw new SaleError(400, "The discount cannot exceed the sale subtotal.");
    }
    const totalLaari = subtotalLaari - discountLaari;
    if (totalLaari === 0n) {
      throw new SaleError(400, "The sale total must be at least 1 laari.");
    }
    if (paymentTotalLaari > totalLaari) {
      throw new SaleError(400, "Payments cannot exceed the sale total.");
    }
    if (paymentTotalLaari < totalLaari && !input.customerId) {
      throw new SaleError(400, "Choose a customer for a partial or credit sale.");
    }

    if (input.customerId) {
      const customerResult = await client.query(
        `SELECT id FROM customers WHERE id = $1 AND shop_id = $2`,
        [input.customerId, currentUser.shopId],
      );
      if (!customerResult.rowCount) {
        throw new SaleError(400, "The selected customer does not belong to this shop.");
      }
    }

    let accounts: Map<string, { account_type: "cash" | "bank" }> = new Map();
    if (payments.length) {
      const accountIds = [...new Set(payments.map((payment) => payment.accountId))];
      const accountResult = await client.query(
        `SELECT id, account_type
         FROM financial_accounts
         WHERE shop_id = $1 AND is_active = true AND id = ANY($2::uuid[])`,
        [currentUser.shopId, accountIds],
      );
      accounts = new Map(
        accountResult.rows.map((account) => [
          account.id as string,
          { account_type: account.account_type as "cash" | "bank" },
        ]),
      );
      if (accounts.size !== accountIds.length) {
        throw new SaleError(400, "Choose an active payment account from this shop.");
      }

      for (const payment of payments) {
        const account = accounts.get(payment.accountId);
        if (
          (payment.method === "cash" && account?.account_type !== "cash") ||
          ((payment.method === "bank_transfer" || payment.method === "card") &&
            account?.account_type !== "bank")
        ) {
          throw new SaleError(400, "The payment method does not match the selected account.");
        }
      }
    }

    const dateResult = await client.query(
      `SELECT to_char((now() AT TIME ZONE 'Indian/Maldives')::date, 'YYYYMMDD') AS business_date`,
    );
    const invoiceNumber = `IS-${dateResult.rows[0].business_date}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const invoiceResult = await client.query(
      `INSERT INTO invoices (
         shop_id, invoice_number, customer_id, status,
         subtotal_laari, discount_laari, total_laari,
         created_by, idempotency_key, idempotency_request_hash
       )
       VALUES ($1, $2, $3, 'issued', $4, $5, $6, $7, $8, $9)
       RETURNING id, created_at`,
      [
        currentUser.shopId,
        invoiceNumber,
        input.customerId ?? null,
        subtotalLaari.toString(),
        discountLaari.toString(),
        totalLaari.toString(),
        currentUser.id,
        input.idempotencyKey,
        requestHash,
      ],
    );
    const invoiceId = invoiceResult.rows[0].id as string;
    const createdAt = new Date(invoiceResult.rows[0].created_at).toISOString();

    const saleJournal = await client.query(
      `INSERT INTO journal_transactions (
         shop_id, transaction_type, source_type, source_id, idempotency_key, created_by
       )
       VALUES ($1, 'sale', 'invoice', $2, $3, $4)
       RETURNING id`,
      [
        currentUser.shopId,
        invoiceId,
        `sale:${input.idempotencyKey}`,
        currentUser.id,
      ],
    );
    const saleTransactionId = saleJournal.rows[0].id as string;

    const saleEntries: Array<[string, string, bigint, string | null]> = [];
    if (totalLaari > 0n) {
      saleEntries.push(["receivables", "debit", totalLaari, null]);
    }
    if (subtotalLaari > 0n) {
      saleEntries.push(["sales", "credit", subtotalLaari, null]);
    }
    if (discountLaari > 0n) {
      saleEntries.push(["discounts", "debit", discountLaari, null]);
    }
    const cogsLaari = lines.reduce((sum, line) => sum + line.cogsLaari, 0n);
    if (cogsLaari > 0n) {
      saleEntries.push(["cost_of_goods_sold", "debit", cogsLaari, null]);
      saleEntries.push(["inventory", "credit", cogsLaari, null]);
    }
    for (const [accountCode, side, amountLaari, accountId] of saleEntries) {
      await client.query(
        `INSERT INTO ledger_entries (transaction_id, account_id, account_code, side, amount_laari)
         VALUES ($1, $2, $3, $4, $5)`,
        [saleTransactionId, accountId, accountCode, side, amountLaari.toString()],
      );
    }

    for (const line of lines) {
      const product = productById.get(line.productId);
      if (!product) throw new SaleError(400, "A product is unavailable in this shop.");
      await client.query(
        `INSERT INTO invoice_lines (
           invoice_id, product_id, description, quantity, unit_price_laari,
           line_total_laari, unit_cost_laari, cogs_laari
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          invoiceId,
          line.productId,
          product.name,
          quantityMilliToText(line.quantityMilli),
          line.unitPriceLaari.toString(),
          line.lineTotalLaari.toString(),
          line.unitCostLaari.toString(),
          line.cogsLaari.toString(),
        ],
      );
      await client.query(
        `INSERT INTO stock_movements (
           shop_id, product_id, movement_type, quantity, unit_cost_laari,
           source_type, source_id, reason, created_by
         )
         VALUES ($1, $2, 'sale', $3, $4, 'invoice', $5, $6, $7)`,
        [
          currentUser.shopId,
          line.productId,
          quantityMilliToText(-line.quantityMilli),
          line.unitCostLaari.toString(),
          invoiceId,
          `Sale ${invoiceNumber}`,
          currentUser.id,
        ],
      );
    }

    for (let index = 0; index < payments.length; index += 1) {
      const payment = payments[index];
      if (!payment) continue;
      const account = accounts.get(payment.accountId);
      if (!account) throw new SaleError(400, "Payment account is unavailable.");
      const paymentIdempotencyKey = `sale:${input.idempotencyKey}:${index}`;
      const paymentJournal = await client.query(
        `INSERT INTO journal_transactions (
           shop_id, transaction_type, source_type, source_id, idempotency_key, created_by
         )
         VALUES ($1, 'payment', 'invoice', $2, $3, $4)
         RETURNING id`,
        [
          currentUser.shopId,
          invoiceId,
          `payment:${input.idempotencyKey}:${index}`,
          currentUser.id,
        ],
      );
      const paymentTransactionId = paymentJournal.rows[0].id as string;
      const paymentResult = await client.query(
        `INSERT INTO payments (
           shop_id, account_id, amount_laari, method, reference, idempotency_key,
           journal_transaction_id, received_by
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          currentUser.shopId,
          payment.accountId,
          payment.amountLaari.toString(),
          payment.method,
          payment.reference,
          paymentIdempotencyKey,
          paymentTransactionId,
          currentUser.id,
        ],
      );
      const paymentId = paymentResult.rows[0].id as string;

      await client.query(
        `INSERT INTO payment_allocations (payment_id, invoice_id, amount_laari)
         VALUES ($1, $2, $3)`,
        [paymentId, invoiceId, payment.amountLaari.toString()],
      );
      await client.query(
        `INSERT INTO ledger_entries (transaction_id, account_id, account_code, side, amount_laari)
         VALUES
           ($1, $2, $3, 'debit', $4),
           ($1, NULL, 'receivables', 'credit', $4)`,
        [
          paymentTransactionId,
          payment.accountId,
          account.account_type,
          payment.amountLaari.toString(),
        ],
      );
    }

    const invoiceStatus: "issued" | "partially_paid" | "paid" =
      paymentTotalLaari >= totalLaari
        ? "paid"
        : paymentTotalLaari > 0n
          ? "partially_paid"
          : "issued";
    await client.query(
      `UPDATE invoices SET status = $1, updated_at = now() WHERE id = $2`,
      [invoiceStatus, invoiceId],
    );

    await client.query(
      `INSERT INTO audit_log (
         shop_id, actor_user_id, action, entity_type, entity_id, new_values
       )
       VALUES ($1, $2, 'sale_created', 'invoice', $3, $4::jsonb)`,
      [
        currentUser.shopId,
        currentUser.id,
        invoiceId,
        JSON.stringify({
          invoiceNumber,
          subtotalLaari: subtotalLaari.toString(),
          discountLaari: discountLaari.toString(),
          totalLaari: totalLaari.toString(),
          paidLaari: paymentTotalLaari.toString(),
        }),
      ],
    );
    if (discountLaari > 0n) {
      await client.query(
        `INSERT INTO audit_log (
           shop_id, actor_user_id, action, entity_type, entity_id, new_values, reason
         )
         VALUES ($1, $2, 'sale_discount_applied', 'invoice', $3, $4::jsonb, $5)`,
        [
          currentUser.shopId,
          currentUser.id,
          invoiceId,
          JSON.stringify({ discountLaari: discountLaari.toString() }),
          discountReason,
        ],
      );
    }

    await client.query("COMMIT");
    receiptResponse = {
      id: invoiceId,
      invoiceNumber,
      status: invoiceStatus,
      subtotalLaari: subtotalLaari.toString(),
      discountLaari: discountLaari.toString(),
      totalLaari: totalLaari.toString(),
      paidLaari: paymentTotalLaari.toString(),
      balanceDueLaari: (totalLaari - paymentTotalLaari).toString(),
      createdAt,
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    const response = saleErrorResponse(error);
    if (response) {
      res.status(response.status).json({ error: response.message });
      return;
    }
    if ((error as { code?: string }).code === "23505") {
      res.status(409).json({ error: "This checkout was already recorded. Refresh sales before retrying." });
      return;
    }
    logger.error({ err: error }, "Could not commit sale");
    res.status(500).json({ error: "We could not complete the sale. No changes were saved." });
    return;
  } finally {
    client.release();
  }

  if (!receiptResponse) {
    res.status(500).json({ error: "The sale was committed, but the receipt could not be prepared." });
    return;
  }
  res.status(201).json(receiptResponse);
});

export default router;
