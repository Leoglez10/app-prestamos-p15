// Run with: npm run test:backup   (node --test, no framework needed)
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_INTERVAL_HOURS, isBackupDue, parseIntervalHours } from "./backupSchedule.ts";

const HOUR = 60 * 60 * 1000;
const NOW = Date.UTC(2026, 7, 20, 12, 0, 0);

test("parseIntervalHours falls back on garbage", () => {
  assert.equal(parseIntervalHours(undefined), DEFAULT_INTERVAL_HOURS);
  assert.equal(parseIntervalHours(null), DEFAULT_INTERVAL_HOURS);
  assert.equal(parseIntervalHours(""), DEFAULT_INTERVAL_HOURS);
  assert.equal(parseIntervalHours("abc"), DEFAULT_INTERVAL_HOURS);
  assert.equal(parseIntervalHours("0"), DEFAULT_INTERVAL_HOURS);
  assert.equal(parseIntervalHours("-5"), DEFAULT_INTERVAL_HOURS);
});

test("parseIntervalHours clamps to the allowed range", () => {
  assert.equal(parseIntervalHours("6"), 6);
  assert.equal(parseIntervalHours("0.5"), 1);
  assert.equal(parseIntervalHours("100000"), 24 * 7);
});

test("no previous backup is always due", () => {
  assert.equal(isBackupDue(null, 12, NOW), true);
});

test("a backup younger than the interval is not due", () => {
  const elevenHoursAgo = (NOW - 11 * HOUR) / 1000;
  assert.equal(isBackupDue(elevenHoursAgo, 12, NOW), false);
});

test("a backup older than the interval is due", () => {
  const thirteenHoursAgo = (NOW - 13 * HOUR) / 1000;
  assert.equal(isBackupDue(thirteenHoursAgo, 12, NOW), true);
});

test("a backup exactly at the interval is due", () => {
  const twelveHoursAgo = (NOW - 12 * HOUR) / 1000;
  assert.equal(isBackupDue(twelveHoursAgo, 12, NOW), true);
});
