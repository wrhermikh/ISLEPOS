const MAX_PG_BIGINT = 9_223_372_036_854_775_807n;
const MAX_NUMERIC_14_3_MILLI = 99_999_999_999_999n;

export function parseLaari(value: unknown, fieldName = "amountLaari"): bigint {
  if (typeof value !== "string" || !/^[0-9]+$/.test(value)) {
    throw new Error(`${fieldName} must be a non-negative integer number of laari.`);
  }

  const amount = BigInt(value);
  if (amount > MAX_PG_BIGINT) {
    throw new Error(`${fieldName} is too large.`);
  }
  return amount;
}

export function parseQuantityMilli(
  value: unknown,
  fieldName = "quantity",
): bigint {
  if (
    typeof value !== "string" ||
    !/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,3})?$/.test(value)
  ) {
    throw new Error(`${fieldName} must be a decimal quantity with up to 3 places.`);
  }

  const [whole, fraction = ""] = value.split(".");
  const quantity = BigInt(whole) * 1_000n + BigInt(fraction.padEnd(3, "0") || "0");
  if (quantity > MAX_NUMERIC_14_3_MILLI) {
    throw new Error(`${fieldName} is too large.`);
  }
  return quantity;
}

export function quantityMilliToText(quantityMilli: bigint): string {
  const sign = quantityMilli < 0n ? "-" : "";
  const absolute = quantityMilli < 0n ? -quantityMilli : quantityMilli;
  const whole = absolute / 1_000n;
  const fraction = (absolute % 1_000n).toString().padStart(3, "0");
  return `${sign}${whole}.${fraction}`;
}

export function multiplyLaariByQuantity(
  unitLaari: bigint,
  quantityMilli: bigint,
): bigint {
  if (unitLaari < 0n || quantityMilli < 0n) {
    throw new Error("Money and quantity must not be negative.");
  }
  const rounded = (unitLaari * quantityMilli + 500n) / 1_000n;
  if (rounded > MAX_PG_BIGINT) throw new Error("Calculated amount is too large.");
  return rounded;
}
