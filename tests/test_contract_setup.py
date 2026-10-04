"""Regression checks for the frozen checker's dependency setup, not its semantics."""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / ".github/workflows/quirk-contracts-conformance.yml"


class ContractSetupTests(unittest.TestCase):
    def test_declared_dependency_preserves_existing_range(self):
        path = ROOT / "requirements-contracts.in"
        self.assertTrue(path.is_file(), "Declare the existing dependency outside CI")
        requirements = [line.strip() for line in path.read_text().splitlines()
                        if line.strip() and not line.lstrip().startswith("#")]
        self.assertEqual(requirements, ["jsonschema>=4.23,<5"])

    def test_all_locked_dependencies_have_exact_versions_and_sha256(self):
        path = ROOT / "requirements-contracts.txt"
        self.assertTrue(path.is_file(), "Commit a complete hash-locked dependency resolution")
        entries = []
        pending = ""
        for line in path.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            pending += " " + line.removesuffix("\\").strip()
            if not line.endswith("\\"):
                entries.append(pending.strip())
                pending = ""
        self.assertFalse(pending, "Unterminated lock entry")
        names = set()
        for entry in entries:
            parts = entry.split()
            self.assertRegex(parts[0], r"^[A-Za-z0-9_.-]+==[0-9][A-Za-z0-9_.+!-]*$")
            name, version = parts[0].split("==")
            name = re.sub(r"[-_.]+", "-", name).lower()
            self.assertNotIn(name, names, "Duplicate locked requirement")
            names.add(name)
            self.assertTrue(parts[1:], f"{name} has no artifact hashes")
            for value in parts[1:]:
                self.assertRegex(value, r"^--hash=sha256:[0-9a-f]{64}$")
            if name == "jsonschema":
                major, minor, *_ = map(int, version.split("."))
                self.assertEqual(major, 4)
                self.assertGreaterEqual(minor, 23)
        self.assertTrue({"jsonschema", "attrs", "jsonschema-specifications", "referencing", "rpds-py"} <= names)

    def test_ci_installs_from_the_hash_lock_without_dependency_bypass(self):
        workflow = WORKFLOW.read_text()
        self.assertIn("--require-hashes", workflow)
        self.assertIn("--only-binary=:all:", workflow)
        self.assertIn("-r requirements-contracts.txt", workflow)
        self.assertNotIn("--no-deps", workflow)
        self.assertNotIn("pip install --disable-pip-version-check 'jsonschema", workflow)

    def test_ci_records_interpreter_and_installer_versions(self):
        workflow = WORKFLOW.read_text()
        self.assertIn("python --version", workflow)
        self.assertIn("python -m pip --version", workflow)

    def test_required_gate_still_runs_on_every_pull_request(self):
        workflow = WORKFLOW.read_text()
        self.assertRegex(workflow, r"(?m)^  pull_request:\s*$")
        self.assertNotRegex(workflow, r"(?m)^\s+paths(?:-ignore)?:")
        self.assertIn("name: frozen-contracts-v0.2", workflow)
        self.assertIn("contents: read", workflow)

    def test_existing_checker_and_python_series_are_preserved(self):
        workflow = WORKFLOW.read_text()
        self.assertIn("python-version: '3.12'", workflow)
        self.assertIn("python contracts/v0.2/check-contract-tranche.py", workflow)


if __name__ == "__main__":
    unittest.main()
