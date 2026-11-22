/**
 * ANNY — FORENSIC AUDIT SCRIPT
 * Scans the codebase for simulations, mocks, and placeholders.
 * Classifies findings as LEGITIMATE_TEST_SUPPORT or PRODUCTION_SIMULATION.
 */

import fs from 'fs';
import path from 'path';

const BANNED_KEYWORDS = [
  'mock', 'mocked', 'simulation', 'simulated', 'fake', 'dummy', 
  'placeholder', 'sample', 'seedWorkers', 'BigBuckBunny', 'SoundHelix'
];

const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', 'public'];
const TEST_FILE_PATTERNS = ['test', 'spec', 'Suite'];

interface Finding {
  file: string;
  line: number;
  keyword: string;
  context: string;
  classification: 'LEGITIMATE_TEST_SUPPORT' | 'PRODUCTION_SIMULATION';
}

export function performForensicAudit(rootPath: string): Finding[] {
  const findings: Finding[] = [];

  function scanDir(currentPath: string) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        if (!IGNORE_DIRS.includes(entry.name)) {
          scanDir(fullPath);
        }
        continue;
      }

      if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');
        const isTestFile = TEST_FILE_PATTERNS.some(p => entry.name.includes(p));

        lines.forEach((line, index) => {
          for (const keyword of BANNED_KEYWORDS) {
            if (line.toLowerCase().includes(keyword.toLowerCase())) {
              findings.push({
                file: fullPath,
                line: index + 1,
                keyword,
                context: line.trim(),
                classification: isTestFile ? 'LEGITIMATE_TEST_SUPPORT' : 'PRODUCTION_SIMULATION'
              });
            }
          }
        });
      }
    }
  }

  scanDir(rootPath);
  return findings;
}

// For manual execution if needed
if (process.argv[1].includes('forensic_audit')) {
  const root = path.join(process.cwd(), 'src');
  const results = performForensicAudit(root);
  console.log(JSON.stringify(results, null, 2));
}
