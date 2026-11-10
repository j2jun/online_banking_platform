import assert from "node:assert/strict";
import { test } from "node:test";

import {
  countTransactionCategories,
  decodeId,
  encodeId,
  extractCustomerIdFromUrl,
  formatAmount,
  formatDateTime,
  getTransactionStatus,
  removeSpecialCharacters,
} from "./utils.ts";

const tx = (category: string) => ({ category }) as Transaction;

test("countTransactionCategories counts and sorts by frequency", () => {
  assert.deepEqual(countTransactionCategories([tx("Travel"), tx("Food"), tx("Food")]), [
    { name: "Food", count: 2, totalCount: 3 },
    { name: "Travel", count: 1, totalCount: 3 },
  ]);
  assert.deepEqual(countTransactionCategories([]), []);
  assert.deepEqual(countTransactionCategories(undefined), []);
});

test("formatAmount formats USD", () => {
  assert.equal(formatAmount(2460.45), "$2,460.45");
  assert.equal(formatAmount(-5), "-$5.00");
});

test("formatDateTime", () => {
  const f = formatDateTime(new Date(2023, 9, 25, 8, 30));
  assert.equal(f.dateOnly, "Oct 25, 2023");
  assert.equal(f.dateDay, "Wed, 10/25/2023");
  assert.match(f.timeOnly, /^8:30\sAM$/);
});

test("getTransactionStatus: recent is Processing, older is Success", () => {
  assert.equal(getTransactionStatus(new Date()), "Processing");
  assert.equal(getTransactionStatus(new Date(Date.now() - 3 * 864e5)), "Success");
});

test("small string helpers", () => {
  assert.equal(decodeId(encodeId("acct_123")), "acct_123");
  assert.equal(extractCustomerIdFromUrl("https://api.dwolla.com/customers/abc-123"), "abc-123");
  assert.equal(removeSpecialCharacters("Uber *Trip! #42"), "Uber Trip 42");
});
