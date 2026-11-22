#!/usr/bin/env python3
"""ANNY Source Inventory & Comparison Tool.

Read-only, deterministic inventory and byte-exact SHA-256 comparison between
the Primary ANNY source tree (`primary-anny/Anny/src`) and the preserved
Reference ANNY source tree (`reference-anny/src`).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from collections import Counter
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Dict, List, Optional, Sequence, Set, Tuple

EXCLUDED_DIRS: Set[str] = {
    "node_modules",
    "dist",
    "build",
    ".git",
    ".next",
    ".vite",
    ".turbo",
    ".cache",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".ollama",
    "coverage",
    ".venv",
    "venv",
    ".idea",
    ".vscode",
}

EXCLUDED_FILE_NAMES: Set[str] = {
    ".DS_Store",
    "Thumbs.db",
}

EXCLUDED_EXTENSIONS: Set[str] = {
    ".pyc",
    ".pyo",
    ".log",
    ".tmp",
    ".bak",
    ".swp",
    ".swo",
    ".map",
    ".tsbuildinfo",
}

HASH_CHUNK_SIZE = 65536


@dataclass(frozen=True)
class FileEntry:
    rel_path: str
    size_bytes: int
    sha256: str


@dataclass(frozen=True)
class DifferingFileEntry:
    rel_path: str
    primary_size_bytes: int
    reference_size_bytes: int
    primary_sha256: str
    reference_sha256: str


@dataclass(frozen=True)
class TreeInventory:
    root: str
    exists: bool
    file_count: int
    total_bytes: int
    files: Dict[str, FileEntry]


@dataclass(frozen=True)
class ComparisonReport:
    primary_root: str
    reference_root: str
    primary_exists: bool
    reference_exists: bool
    primary_file_count: int
    reference_file_count: int
    primary_total_bytes: int
    reference_total_bytes: int
    only_in_primary: List[FileEntry]
    only_in_reference: List[FileEntry]
    differing_common: List[DifferingFileEntry]
    identical_common: List[FileEntry]
    warnings: List[str]


def _should_exclude_file(file_name: str) -> bool:
    if file_name in EXCLUDED_FILE_NAMES:
        return True
    lower_name = file_name.lower()
    return any(lower_name.endswith(ext) for ext in EXCLUDED_EXTENSIONS)


def compute_sha256(file_path: Path) -> Tuple[str, int]:
    """Stream file bytes to compute exact SHA-256 digest and byte size."""
    hasher = hashlib.sha256()
    total_size = 0
    with file_path.open("rb") as fh:
        while True:
            chunk = fh.read(HASH_CHUNK_SIZE)
            if not chunk:
                break
            hasher.update(chunk)
            total_size += len(chunk)
    return hasher.hexdigest(), total_size


def inventory_tree(
    root: Path,
    excluded_dirs: Set[str] = EXCLUDED_DIRS,
) -> TreeInventory:
    """Recursively inventory files under `root` in deterministic sorted order."""
    normalized_root = root.as_posix()
    if not root.exists() or not root.is_dir():
        return TreeInventory(
            root=normalized_root,
            exists=False,
            file_count=0,
            total_bytes=0,
            files={},
        )

    entries: Dict[str, FileEntry] = {}
    total_bytes = 0

    for current_dir, dir_names, file_names in os.walk(root, topdown=True, followlinks=False):
        # Prune excluded directories deterministically in-place
        dir_names[:] = sorted(d for d in dir_names if d not in excluded_dirs)
        current_path = Path(current_dir)

        for file_name in sorted(file_names):
            if _should_exclude_file(file_name):
                continue
            full_path = current_path / file_name
            if full_path.is_symlink() or not full_path.is_file():
                continue
            rel_path = full_path.relative_to(root).as_posix()
            digest, size_bytes = compute_sha256(full_path)
            entries[rel_path] = FileEntry(
                rel_path=rel_path,
                size_bytes=size_bytes,
                sha256=digest,
            )
            total_bytes += size_bytes

    sorted_entries = dict(sorted(entries.items(), key=lambda kv: kv[0]))
    return TreeInventory(
        root=normalized_root,
        exists=True,
        file_count=len(sorted_entries),
        total_bytes=total_bytes,
        files=sorted_entries,
    )


def compare_inventories(primary: TreeInventory, reference: TreeInventory) -> ComparisonReport:
    """Compare Primary and Reference inventories using exact SHA-256 equality."""
    warnings: List[str] = []
    if not primary.exists:
        warnings.append(f"Primary directory is absent or not a directory: {primary.root}")
    if not reference.exists:
        warnings.append(f"Reference directory is absent or not a directory: {reference.root}")

    primary_keys = set(primary.files.keys())
    reference_keys = set(reference.files.keys())

    only_primary_keys = sorted(primary_keys - reference_keys)
    only_reference_keys = sorted(reference_keys - primary_keys)
    common_keys = sorted(primary_keys & reference_keys)

    only_in_primary = [primary.files[k] for k in only_primary_keys]
    only_in_reference = [reference.files[k] for k in only_reference_keys]
    differing_common: List[DifferingFileEntry] = []
    identical_common: List[FileEntry] = []

    for key in common_keys:
        p_entry = primary.files[key]
        r_entry = reference.files[key]
        if p_entry.sha256 == r_entry.sha256 and p_entry.size_bytes == r_entry.size_bytes:
            identical_common.append(p_entry)
        else:
            differing_common.append(
                DifferingFileEntry(
                    rel_path=key,
                    primary_size_bytes=p_entry.size_bytes,
                    reference_size_bytes=r_entry.size_bytes,
                    primary_sha256=p_entry.sha256,
                    reference_sha256=r_entry.sha256,
                )
            )

    return ComparisonReport(
        primary_root=primary.root,
        reference_root=reference.root,
        primary_exists=primary.exists,
        reference_exists=reference.exists,
        primary_file_count=primary.file_count,
        reference_file_count=reference.file_count,
        primary_total_bytes=primary.total_bytes,
        reference_total_bytes=reference.total_bytes,
        only_in_primary=only_in_primary,
        only_in_reference=only_in_reference,
        differing_common=differing_common,
        identical_common=identical_common,
        warnings=warnings,
    )


def _top_level_bucket(rel_path: str) -> str:
    parts = rel_path.split("/")
    return f"{parts[0]}/" if len(parts) > 1 else "(root)"


def format_markdown_report(report: ComparisonReport) -> str:
    """Render a deterministic, human-readable Markdown comparison report."""
    lines: List[str] = [
        "# ANNY Source Inventory & Comparison Report",
        "",
        "## Summary",
        "",
        "| Metric | Value |",
        "|---|---|",
        f"| Primary Root | `{report.primary_root}` ({'present' if report.primary_exists else 'MISSING'}) |",
        f"| Reference Root | `{report.reference_root}` ({'present' if report.reference_exists else 'MISSING'}) |",
        f"| Primary Source Files | {report.primary_file_count} ({report.primary_total_bytes:,} bytes) |",
        f"| Reference Source Files | {report.reference_file_count} ({report.reference_total_bytes:,} bytes) |",
        f"| Only in Primary | {len(report.only_in_primary)} |",
        f"| Only in Reference | {len(report.only_in_reference)} |",
        f"| Common Files with Differing Contents | {len(report.differing_common)} |",
        f"| Identical Common Files (SHA-256 Verified) | {len(report.identical_common)} |",
        "",
    ]

    if report.warnings:
        lines.append("## Warnings")
        lines.append("")
        for warning in report.warnings:
            lines.append(f"- {warning}")
        lines.append("")

    # Area breakdown for quick architectural scanning
    primary_buckets = Counter(_top_level_bucket(e.rel_path) for e in report.only_in_primary)
    ref_buckets = Counter(_top_level_bucket(e.rel_path) for e in report.only_in_reference)
    diff_buckets = Counter(_top_level_bucket(e.rel_path) for e in report.differing_common)
    ident_buckets = Counter(_top_level_bucket(e.rel_path) for e in report.identical_common)
    all_buckets = sorted(set(primary_buckets) | set(ref_buckets) | set(diff_buckets) | set(ident_buckets))

    if all_buckets:
        lines.extend([
            "## Breakdown by Top-Level Directory",
            "",
            "| Directory | Only in Primary | Only in Reference | Differing Common | Identical Common |",
            "|---|---:|---:|---:|---:|",
        ])
        for bucket in all_buckets:
            lines.append(
                f"| `{bucket}` | {primary_buckets[bucket]} | {ref_buckets[bucket]} | {diff_buckets[bucket]} | {ident_buckets[bucket]} |"
            )
        lines.append("")

    lines.extend([
        f"## Only in Primary ({len(report.only_in_primary)})",
        "",
    ])
    if report.only_in_primary:
        lines.append("| Path | Size (bytes) | SHA-256 (prefix) |")
        lines.append("|---|---:|---|")
        for entry in report.only_in_primary:
            lines.append(f"| `{entry.rel_path}` | {entry.size_bytes:,} | `{entry.sha256[:12]}` |")
    else:
        lines.append("_None._")
    lines.append("")

    lines.extend([
        f"## Only in Reference ({len(report.only_in_reference)})",
        "",
    ])
    if report.only_in_reference:
        lines.append("| Path | Size (bytes) | SHA-256 (prefix) |")
        lines.append("|---|---:|---|")
        for entry in report.only_in_reference:
            lines.append(f"| `{entry.rel_path}` | {entry.size_bytes:,} | `{entry.sha256[:12]}` |")
    else:
        lines.append("_None._")
    lines.append("")

    lines.extend([
        f"## Common Files with Differing Contents ({len(report.differing_common)})",
        "",
    ])
    if report.differing_common:
        lines.append("| Path | Primary Bytes | Reference Bytes | Primary SHA-256 | Reference SHA-256 |")
        lines.append("|---|---:|---:|---|---|")
        for entry in report.differing_common:
            lines.append(
                f"| `{entry.rel_path}` | {entry.primary_size_bytes:,} | {entry.reference_size_bytes:,} | `{entry.primary_sha256[:12]}` | `{entry.reference_sha256[:12]}` |"
            )
    else:
        lines.append("_None._")
    lines.append("")

    lines.extend([
        f"## Identical Common Files ({len(report.identical_common)})",
        "",
        f"Total byte-identical files across Primary and Reference: **{len(report.identical_common)}**.",
        "",
    ])

    return "\n".join(lines)


def format_json_report(report: ComparisonReport) -> str:
    """Render a deterministic JSON comparison report."""
    payload = {
        "primary_root": report.primary_root,
        "reference_root": report.reference_root,
        "primary_exists": report.primary_exists,
        "reference_exists": report.reference_exists,
        "summary": {
            "primary_file_count": report.primary_file_count,
            "reference_file_count": report.reference_file_count,
            "primary_total_bytes": report.primary_total_bytes,
            "reference_total_bytes": report.reference_total_bytes,
            "only_in_primary_count": len(report.only_in_primary),
            "only_in_reference_count": len(report.only_in_reference),
            "differing_common_count": len(report.differing_common),
            "identical_common_count": len(report.identical_common),
        },
        "warnings": report.warnings,
        "only_in_primary": [asdict(e) for e in report.only_in_primary],
        "only_in_reference": [asdict(e) for e in report.only_in_reference],
        "differing_common": [asdict(e) for e in report.differing_common],
        "identical_common": [asdict(e) for e in report.identical_common],
    }
    return json.dumps(payload, indent=2, sort_keys=False) + "\n"


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Inventory and compare ANNY Primary and Reference source trees."
    )
    parser.add_argument(
        "--primary",
        default="primary-anny/Anny/src",
        help="Path to the Primary source tree (default: primary-anny/Anny/src).",
    )
    parser.add_argument(
        "--reference",
        default="reference-anny/src",
        help="Path to the Reference source tree (default: reference-anny/src).",
    )
    parser.add_argument(
        "--format",
        choices=("markdown", "json"),
        default="markdown",
        help="Output report format (default: markdown).",
    )
    parser.add_argument(
        "--output",
        default="",
        help="Optional output file path. Prints to stdout if omitted.",
    )
    return parser


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = build_arg_parser()
    args = parser.parse_args(argv)

    primary_inv = inventory_tree(Path(args.primary))
    reference_inv = inventory_tree(Path(args.reference))
    report = compare_inventories(primary_inv, reference_inv)

    rendered = (
        format_json_report(report)
        if args.format == "json"
        else format_markdown_report(report)
    )

    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(rendered, encoding="utf-8")
    else:
        sys.stdout.write(rendered)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
