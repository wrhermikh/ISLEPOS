import { Router, type IRouter } from "express";
import { CreateProductBody } from "@workspace/api-zod";
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

router.get("/products", async (req, res): Promise<void> => {
  const currentUser = await resolveStaffUser(req, res);
  if (!currentUser) return;

  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const pattern = search ? `%${search}%` : null;
  const result = await pool.query(
    `SELECT
       p.id,
       p.sku,
       p.barcode,
       p.name,
       c.name AS "categoryName",
       p.unit,
       p.selling_price_laari::text AS "sellingPriceLaari",
       p.cost_price_laari::text AS "costPriceLaari",
       COALESCE(SUM(sm.quantity), 0)::text AS "stockOnHand",
       p.low_stock_threshold::text AS "lowStockThreshold",
       p.is_active AS "isActive"
     FROM products p
     LEFT JOIN product_categories c ON c.id = p.category_id
     LEFT JOIN stock_movements sm
       ON sm.product_id = p.id AND sm.shop_id = p.shop_id
     WHERE p.shop_id = $1
       AND p.is_active = true
       AND (
         $2::text IS NULL
         OR p.name ILIKE $2
         OR p.sku ILIKE $2
         OR COALESCE(p.barcode, '') ILIKE $2
       )
     GROUP BY p.id, c.name
     ORDER BY p.name ASC
     LIMIT 100`,
    [currentUser.shopId, pattern],
  );

  res.json(result.rows);
});

router.post("/products", async (req, res): Promise<void> => {
  const currentUser = await resolveStaffUser(req, res);
  if (!currentUser) return;
  if (currentUser.role !== "owner") {
    res.status(403).json({ error: "Owner role required to add products or opening stock." });
    return;
  }

  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const input = parsed.data;
  const sku = input.sku.trim();
  const name = input.name.trim();
  const barcode = input.barcode?.trim() || null;
  const categoryName = input.categoryName?.trim() || null;
  const unit = input.unit?.trim() || "each";

  if (!sku || !name || !unit) {
    res.status(400).json({ error: "SKU, product name, and unit are required." });
    return;
  }

  let sellingPriceLaari: bigint;
  let costPriceLaari: bigint;
  let openingQuantityMilli: bigint;
  let lowStockThresholdMilli: bigint;
  try {
    sellingPriceLaari = parseLaari(input.sellingPriceLaari, "sellingPriceLaari");
    costPriceLaari = parseLaari(input.costPriceLaari, "costPriceLaari");
    openingQuantityMilli = parseQuantityMilli(input.openingQuantity, "openingQuantity");
    lowStockThresholdMilli = parseQuantityMilli(
      input.lowStockThreshold,
      "lowStockThreshold",
    );
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Product amounts are invalid.",
    });
    return;
  }

  if (openingQuantityMilli > 0n && costPriceLaari === 0n) {
    res.status(400).json({
      error: "Enter a non-zero cost price when recording opening stock.",
    });
    return;
  }

  const openingValueLaari = multiplyLaariByQuantity(
    costPriceLaari,
    openingQuantityMilli,
  );
  if (openingQuantityMilli > 0n && openingValueLaari === 0n) {
    res.status(400).json({
      error: "Opening stock must have a value of at least 1 laari.",
    });
    return;
  }
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    let categoryId: string | null = null;
    if (categoryName) {
      const category = await client.query(
        `INSERT INTO product_categories (shop_id, name)
         VALUES ($1, $2)
         ON CONFLICT (shop_id, name)
         DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [currentUser.shopId, categoryName],
      );
      categoryId = category.rows[0].id;
    }

    const created = await client.query(
      `INSERT INTO products (
         shop_id, category_id, sku, barcode, name, unit,
         selling_price_laari, cost_price_laari, weighted_average_cost_laari,
         low_stock_threshold
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $9)
       RETURNING id`,
      [
        currentUser.shopId,
        categoryId,
        sku,
        barcode,
        name,
        unit,
        sellingPriceLaari.toString(),
        costPriceLaari.toString(),
        quantityMilliToText(lowStockThresholdMilli),
      ],
    );
    const productId = created.rows[0].id as string;

    if (openingQuantityMilli > 0n) {
      const journal = await client.query(
        `INSERT INTO journal_transactions (
           shop_id, transaction_type, source_type, source_id,
           idempotency_key, created_by
         )
         VALUES ($1, 'opening_balance', 'product_opening', $2, $3, $4)
         RETURNING id`,
        [
          currentUser.shopId,
          productId,
          `product-opening:${productId}`,
          currentUser.id,
        ],
      );
      const transactionId = journal.rows[0].id as string;

      await client.query(
        `INSERT INTO stock_movements (
           shop_id, product_id, movement_type, quantity, unit_cost_laari,
           source_type, source_id, reason, created_by
         )
         VALUES ($1, $2, 'opening', $3, $4, 'journal_transaction', $5, $6, $7)`,
        [
          currentUser.shopId,
          productId,
          quantityMilliToText(openingQuantityMilli),
          costPriceLaari.toString(),
          transactionId,
          input.openingReason.trim(),
          currentUser.id,
        ],
      );

      await client.query(
        `INSERT INTO ledger_entries (transaction_id, account_code, side, amount_laari)
         VALUES
           ($1, 'inventory', 'debit', $2),
           ($1, 'owner_capital', 'credit', $2)`,
        [transactionId, openingValueLaari.toString()],
      );
    }

    await client.query(
      `INSERT INTO audit_log (
         shop_id, actor_user_id, action, entity_type, entity_id, new_values, reason
       )
       VALUES ($1, $2, 'product_created', 'product', $3, $4::jsonb, $5)`,
      [
        currentUser.shopId,
        currentUser.id,
        productId,
        JSON.stringify({
          sku,
          name,
          sellingPriceLaari: sellingPriceLaari.toString(),
          openingQuantity: quantityMilliToText(openingQuantityMilli),
          openingValueLaari: openingValueLaari.toString(),
        }),
        openingQuantityMilli > 0n ? input.openingReason.trim() : null,
      ],
    );

    await client.query("COMMIT");
    res.status(201).json({
      id: productId,
      sku,
      barcode,
      name,
      categoryName,
      unit,
      sellingPriceLaari: sellingPriceLaari.toString(),
      costPriceLaari: costPriceLaari.toString(),
      stockOnHand: quantityMilliToText(openingQuantityMilli),
      lowStockThreshold: quantityMilliToText(lowStockThresholdMilli),
      isActive: true,
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    const code = (error as { code?: string }).code;
    if (code === "23505") {
      res.status(409).json({ error: "That SKU or barcode is already in use." });
      return;
    }
    logger.error({ err: error }, "Could not create product");
    res.status(500).json({ error: "We could not save the product. Please try again." });
  } finally {
    client.release();
  }
});

export default router;
