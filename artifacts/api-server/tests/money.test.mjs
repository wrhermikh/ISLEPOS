import assert from "node:assert/strict";
import test from "node:test";
import {
  multiplyLaariByQuantity,
  parseLaari,
  parseQuantityMilli,
  quantityMilliToText,
} from "../src/lib/money.ts";

test("parses MVR quantities exactly to thousandths without floats", () => {
  assert.equal(parseQuantityMilli("1.25"), 1250n);
  assert.equal(parseQuantityMilli("12"), 12000n);
  assert.equal(quantityMilliToText(1250n), "1.250");
  assert.equal(quantityMilliToText(-1250n), "-1.250");
});

test("rejects quantities with more than three decimal places or zero sale quantity", () => {
  assert.throws(() => parseQuantityMilli("1.0001"));
  assert.equal(parseQuantityMilli("0"), 0n);
});

test("calculates fractional unit totals using integer laari and half-up rounding", () => {
  assert.equal(multiplyLaariByQuantity(2500n, 1500n), 3750n);
  assert.equal(multiplyLaariByQuantity(1n, 500n), 1n);
  assert.equal(multiplyLaariByQuantity(1n, 499n), 0n);
});

test("rejects malformed or overflowing laari values", () => {
  assert.equal(parseLaari("12345"), 12345n);
  assert.throws(() => parseLaari("1.5"));
  assert.throws(() => parseLaari("9223372036854775808"));
});
