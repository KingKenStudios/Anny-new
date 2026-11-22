/**
 * ANNY — INTELLIGENCE BENCHMARK LAB
 * Permanent benchmark suite measuring reasoning, coding, debugging, and hallucination resistance.
 */

export type BenchmarkCategory = 'reasoning' | 'coding' | 'debugging' | 'hallucination_resistance' | 'planning' | 'verification';

export interface BenchmarkTestCase {
  id: string;
  category: BenchmarkCategory;
  prompt: string;
  expectedKeywords: string[];
  forbiddenKeywords?: string[];
}

export interface BenchmarkResult {
  testId: string;
  category: BenchmarkCategory;
  model: string;
  provider: string;
  success: boolean;
  score: number;
  latencyMs: number;
  reason: string;
  timestamp: string;
}

export class IntelligenceBenchmarkLab {
  private static instance: IntelligenceBenchmarkLab;
  private testCases: BenchmarkTestCase[] = [
    {
      id: 'bench_code_syntax',
      category: 'coding',
      prompt: 'Write a TypeScript function to add two numbers with strict type annotations.',
      expectedKeywords: ['function', 'number', ': number'],
      forbiddenKeywords: ['any']
    },
    {
      id: 'bench_reasoning_logic',
      category: 'reasoning',
      prompt: 'If all ANNY components must run through the canonical kernel, can a tool bypass the kernel?',
      expectedKeywords: ['no', 'kernel', 'transaction'],
      forbiddenKeywords: ['yes', 'bypass easily']
    }
  ];

  private results: BenchmarkResult[] = [];

  private constructor() {}

  public static getInstance(): IntelligenceBenchmarkLab {
    if (!IntelligenceBenchmarkLab.instance) {
      IntelligenceBenchmarkLab.instance = new IntelligenceBenchmarkLab();
    }
    return IntelligenceBenchmarkLab.instance;
  }

  public evaluateResponse(testId: string, model: string, provider: string, responseText: string, latencyMs: number): BenchmarkResult {
    const testCase = this.testCases.find(t => t.id === testId);
    if (!testCase) {
      throw new Error(`Test case not found: ${testId}`);
    }

    const lowerText = responseText.toLowerCase();
    let matchedKeywords = 0;
    for (const kw of testCase.expectedKeywords) {
      if (lowerText.includes(kw.toLowerCase())) matchedKeywords++;
    }

    let forbiddenHit = false;
    if (testCase.forbiddenKeywords) {
      for (const fk of testCase.forbiddenKeywords) {
        if (lowerText.includes(fk.toLowerCase())) {
          forbiddenHit = true;
          break;
        }
      }
    }

    const score = forbiddenHit ? 0 : Math.round((matchedKeywords / testCase.expectedKeywords.length) * 100);
    const success = score >= 60 && !forbiddenHit;

    const result: BenchmarkResult = {
      testId,
      category: testCase.category,
      model,
      provider,
      success,
      score,
      latencyMs,
      reason: success ? `Passed benchmark (${score}/100)` : `Failed benchmark criteria (${score}/100)`,
      timestamp: new Date().toISOString()
    };

    this.results.push(result);
    return result;
  }
}

export const intelligenceBenchmarkLab = IntelligenceBenchmarkLab.getInstance();
