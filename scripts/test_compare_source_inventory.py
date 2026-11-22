#!/usr/bin/env python3
"""Unit tests for ANNY Source Inventory & Comparison Tool."""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

# Ensure scripts directory is importable regardless of working directory or unittest invocation style
SCRIPTS_DIR = Path(__file__).resolve().parent
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

import compare_source_inventory as csi


class TestCompareSourceInventory(unittest.TestCase):
    def setUp(self) -> None:
        self._tmpdir = tempfile.TemporaryDirectory()
        self.root = Path(self._tmpdir.name)
        self.primary = self.root / "primary-src"
        self.reference = self.root / "reference-src"
        self.primary.mkdir()
        self.reference.mkdir()

    def tearDown(self) -> None:
        self._tmpdir.cleanup()

    def _write(self, base: Path, rel: str, content: bytes) -> Path:
        target = base / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
        return target

    def test_classifies_only_primary_only_reference_differing_and_identical(self) -> None:
        # Identical text and binary files
        self._write(self.primary, "shared/same.ts", b"export const x = 1;\n")
        self._write(self.reference, "shared/same.ts", b"export const x = 1;\n")
        self._write(self.primary, "assets/icon.bin", b"\x89PNG\r\n\x1a\n\x00\x01\xff")
        self._write(self.reference, "assets/icon.bin", b"\x89PNG\r\n\x1a\n\x00\x01\xff")

        # Differing common files (including subtle single-byte / line-ending differences)
        self._write(self.primary, "core/engine.ts", b"export const v = 2;\n")
        self._write(self.reference, "core/engine.ts", b"export const v = 1;\n")
        self._write(self.primary, "core/eol.ts", b"line1\nline2\n")
        self._write(self.reference, "core/eol.ts", b"line1\r\nline2\r\n")

        # Only in Primary
        self._write(self.primary, "creative/newStudio.ts", b"export const studio = true;\n")

        # Only in Reference
        self._write(self.reference, "legacy/oldWidget.tsx", b"export const old = true;\n")

        p_inv = csi.inventory_tree(self.primary)
        r_inv = csi.inventory_tree(self.reference)
        report = csi.compare_inventories(p_inv, r_inv)

        self.assertTrue(report.primary_exists)
        self.assertTrue(report.reference_exists)
        self.assertEqual(report.warnings, [])
        self.assertEqual([e.rel_path for e in report.only_in_primary], ["creative/newStudio.ts"])
        self.assertEqual([e.rel_path for e in report.only_in_reference], ["legacy/oldWidget.tsx"])
        self.assertEqual(
            [e.rel_path for e in report.differing_common],
            ["core/engine.ts", "core/eol.ts"],
        )
        self.assertEqual(
            [e.rel_path for e in report.identical_common],
            ["assets/icon.bin", "shared/same.ts"],
        )

    def test_excludes_build_artifacts_node_modules_and_caches(self) -> None:
        self._write(self.primary, "App.tsx", b"export default function App() {}\n")
        self._write(self.primary, "node_modules/pkg/index.js", b"module.exports = {};\n")
        self._write(self.primary, "dist/bundle.js", b"console.log('built');\n")
        self._write(self.primary, "__pycache__/mod.cpython-312.pyc", b"\x00\x01")
        self._write(self.primary, "components/.DS_Store", b"junk")
        self._write(self.primary, "components/App.tsx.bak", b"backup")
        self._write(self.primary, "components/App.js.map", b"{}")
        self._write(self.primary, ".vite/deps/chunk.js", b"cache")
        self._write(self.primary, "debug.log", b"log")

        p_inv = csi.inventory_tree(self.primary)
        self.assertEqual(list(p_inv.files.keys()), ["App.tsx"])
        self.assertEqual(p_inv.file_count, 1)

    def test_handles_absent_directories_safely_without_false_equivalence(self) -> None:
        missing_primary = self.root / "does-not-exist-primary"
        missing_reference = self.root / "does-not-exist-reference"
        self._write(self.reference, "onlyRef.ts", b"export const r = 1;\n")

        # Absent primary, present reference
        report_missing_p = csi.compare_inventories(
            csi.inventory_tree(missing_primary),
            csi.inventory_tree(self.reference),
        )
        self.assertFalse(report_missing_p.primary_exists)
        self.assertTrue(report_missing_p.reference_exists)
        self.assertEqual(len(report_missing_p.warnings), 1)
        self.assertEqual([e.rel_path for e in report_missing_p.only_in_reference], ["onlyRef.ts"])
        self.assertEqual(report_missing_p.identical_common, [])

        # Both absent
        report_both_missing = csi.compare_inventories(
            csi.inventory_tree(missing_primary),
            csi.inventory_tree(missing_reference),
        )
        self.assertFalse(report_both_missing.primary_exists)
        self.assertFalse(report_both_missing.reference_exists)
        self.assertEqual(len(report_both_missing.warnings), 2)
        md = csi.format_markdown_report(report_both_missing)
        self.assertIn("MISSING", md)
        self.assertIn("## Warnings", md)

    def test_does_not_modify_source_trees_and_output_is_deterministic(self) -> None:
        p_file = self._write(self.primary, "a/alpha.ts", b"alpha\n")
        self._write(self.primary, "b/beta.ts", b"beta-v2\n")
        r_file = self._write(self.reference, "b/beta.ts", b"beta-v1\n")
        self._write(self.reference, "c/gamma.ts", b"gamma\n")

        before_p = p_file.read_bytes()
        before_r = r_file.read_bytes()

        report1 = csi.compare_inventories(
            csi.inventory_tree(self.primary),
            csi.inventory_tree(self.reference),
        )
        report2 = csi.compare_inventories(
            csi.inventory_tree(self.primary),
            csi.inventory_tree(self.reference),
        )

        md1 = csi.format_markdown_report(report1)
        md2 = csi.format_markdown_report(report2)
        json1 = csi.format_json_report(report1)
        json2 = csi.format_json_report(report2)

        self.assertEqual(md1, md2)
        self.assertEqual(json1, json2)
        self.assertEqual(p_file.read_bytes(), before_p)
        self.assertEqual(r_file.read_bytes(), before_r)

    def test_cli_writes_markdown_and_json_reports(self) -> None:
        self._write(self.primary, "views/Home.tsx", b"export const Home = () => null;\n")
        self._write(self.reference, "views/Home.tsx", b"export const Home = () => 1;\n")
        self._write(self.primary, "services/newService.ts", b"export const svc = 1;\n")

        md_out = self.root / "out" / "inventory.md"
        json_out = self.root / "out" / "inventory.json"

        rc_md = csi.main([
            "--primary", str(self.primary),
            "--reference", str(self.reference),
            "--format", "markdown",
            "--output", str(md_out),
        ])
        rc_json = csi.main([
            "--primary", str(self.primary),
            "--reference", str(self.reference),
            "--format", "json",
            "--output", str(json_out),
        ])

        self.assertEqual(rc_md, 0)
        self.assertEqual(rc_json, 0)

        md_text = md_out.read_text(encoding="utf-8")
        self.assertIn("# ANNY Source Inventory & Comparison Report", md_text)
        self.assertIn("`services/newService.ts`", md_text)
        self.assertIn("`views/Home.tsx`", md_text)

        parsed = json.loads(json_out.read_text(encoding="utf-8"))
        self.assertEqual(parsed["summary"]["only_in_primary_count"], 1)
        self.assertEqual(parsed["summary"]["differing_common_count"], 1)
        self.assertEqual(parsed["summary"]["identical_common_count"], 0)


if __name__ == "__main__":
    unittest.main()
