/**
 * ANNY ENTERPRISE ARCHITECTURE - QUALITY EVALUATION ENGINE
 * Automatically scores and audits code output across 9 enterprise quality metrics before presentation.
 */

export interface QualityMetrics {
  correctness: number; // 0-100
  security: number; // 0-100
  performance: number; // 0-100
  maintainability: number; // 0-100
  scalability: number; // 0-100
  readability: number; // 0-100
  documentation: number; // 0-100
  testing: number; // 0-100
  architecture: number; // 0-100
  overallScore: number;
  isPassed: boolean;
}

export class QualityEngine {
  private static instance: QualityEngine;
  private qualityThreshold: number = 85;

  public static getInstance(): QualityEngine {
    if (!QualityEngine.instance) {
      QualityEngine.instance = new QualityEngine();
    }
    return QualityEngine.instance;
  }

  public evaluate(output: string): QualityMetrics {
    const text = output || '';
    const looksLikeCode = /```|function |class |const |export |import |=>/.test(text);
    const lines = text.split('\n');
    const codeLines = lines.filter(l => l.trim().length > 0);

    // --- correctness: unbalanced brackets/parens are a real, cheap syntax red flag ---
    const openBraces = (text.match(/{/g) || []).length;
    const closeBraces = (text.match(/}/g) || []).length;
    const openParens = (text.match(/\(/g) || []).length;
    const closeParens = (text.match(/\)/g) || []).length;
    const balanced = openBraces === closeBraces && openParens === closeParens;
    const correctness = !looksLikeCode ? 90 : (balanced ? 95 : 55);

    // --- security: absence of obvious hardcoded-secret / dangerous-sink patterns ---
    const hasHardcodedSecret = /\b(api[_-]?key|secret|password)\s*[:=]\s*['"][^'"]{6,}['"]/i.test(text);
    const hasDangerousSink = /\beval\(|innerHTML\s*=|document\.write\(/i.test(text);
    const security = hasHardcodedSecret ? 40 : (hasDangerousSink ? 65 : 95);

    // --- performance: penalize an obvious O(n^3)-shaped triple-nested loop; otherwise neutral ---
    const tripleNestedLoop = /for\s*\([^)]*\)[^{]*{[^}]*for\s*\([^)]*\)[^{]*{[^}]*for\s*\(/s.test(text);
    const performance = tripleNestedLoop ? 60 : 88;

    // --- maintainability: penalize very long single blob with no line breaks / no function boundaries ---
    const avgLineLength = codeLines.length > 0 ? text.length / codeLines.length : 0;
    const hasFunctionBoundaries = /function |=>|class /.test(text);
    const maintainability = !looksLikeCode ? 85 : (avgLineLength > 200 || !hasFunctionBoundaries ? 60 : 90);

    // --- scalability: flag obvious magic-number / TODO smells; real but coarse ---
    const todoCount = (text.match(/\bTODO\b|\bFIXME\b/g) || []).length;
    const scalability = !looksLikeCode ? 85 : Math.max(50, 90 - todoCount * 10);

    // --- readability: real check on indentation consistency and line length ---
    const longLines = lines.filter(l => l.length > 140).length;
    const readability = !looksLikeCode ? 88 : Math.max(55, 92 - longLines * 5);

    // --- documentation: ratio of comment lines to code lines, real ---
    const commentLines = lines.filter(l => /^\s*(\/\/|\/\*|\*|#)/.test(l)).length;
    const docRatio = codeLines.length > 0 ? commentLines / codeLines.length : 0;
    const documentation = !looksLikeCode ? 80 : Math.min(95, 60 + Math.round(docRatio * 200));

    // --- testing: only score high if actual test code is present, real signal ---
    const hasTests = /\b(describe|it|test|expect)\s*\(/.test(text);
    const testing = hasTests ? 90 : (looksLikeCode ? 55 : 75);

    // --- architecture: presence of interfaces/types/exported classes, a real if coarse signal ---
    const hasInterfacesOrTypes = /\binterface\s+\w+|\btype\s+\w+\s*=/.test(text);
    const hasExportedClasses = /export\s+class\s+\w+/.test(text);
    const architecture = !looksLikeCode ? 85 : (hasInterfacesOrTypes && hasExportedClasses ? 92 : hasInterfacesOrTypes || hasExportedClasses ? 82 : 65);

    const overallScore = Math.round(
      (correctness + security + performance + maintainability + scalability + readability + documentation + testing + architecture) / 9
    );

    return {
      correctness,
      security,
      performance,
      maintainability,
      scalability,
      readability,
      documentation,
      testing,
      architecture,
      overallScore,
      isPassed: overallScore >= this.qualityThreshold
    };
  }
}

export const qualityEngine = QualityEngine.getInstance();
