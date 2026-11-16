import { test } from "node:test";
import assert from "node:assert/strict";

test("runs on a supported Node version", () => {
  assert.ok(Number(process.versions.node.split(".")[0]) >= 20);
});
