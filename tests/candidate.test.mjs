import test from "node:test";
import assert from "node:assert/strict";
import { runValidation } from "../scripts/validate-candidate.mjs";

test("candidate contracts and executable evidence remain internally consistent", () => {
  const report = runValidation();
  assert.equal(report.source_integrity.exact_sha256, "11/11");
  assert.deepEqual(report.fixtures.adversarial, { executed: 22, exact_matches: 22 });
  assert.deepEqual(report.fixtures.positive_controls, { executed: 11, exact_matches: 11 });
  assert.equal(report.admission.decision, "revise");
});
