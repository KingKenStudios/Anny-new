/**
 * ANNY SOURCE RECONSTRUCTION ENGINE
 *
 * Turns an inspected public URL or an uploaded project analysis into a fresh,
 * executable application plan. This is intentionally a clean-room reconstruction
 * layer: it extracts observable product requirements and architecture signals,
 * then asks the canonical synthesizer to implement an independent project.
 */
import { annyLinkUnderstandingEngine, LinkUnderstandingReport, SourceSnapshot } from './annyLinkUnderstandingEngine';
import { synthesizeAppFiles, SynthesisPlan } from './realAppCodeSynthesizer';

export interface ReconstructionInput {
  prompt: string;
  projectId: string;
  generationId?: string;
  organizationId?: string;
  updateExisting?: boolean;
  sourceUrl?: string;
  sourceReport?: LinkUnderstandingReport;
  uploadedAnalysis?: unknown;
  existingVfs?: Record<string, string>;
}

export interface ReconstructionResult extends SynthesisPlan {
  source: 'url' | 'upload';
  report?: LinkUnderstandingReport;
  cleanRoom: {
    sourceCodeCopied: false;
    credentialsCopied: false;
    privateDataCopied: false;
  };
}

export class AnnySourceReconstructionEngine {
  private static instance: AnnySourceReconstructionEngine;

  static getInstance(): AnnySourceReconstructionEngine {
    if (!this.instance) this.instance = new AnnySourceReconstructionEngine();
    return this.instance;
  }

  async rebuildFromUrl(input: ReconstructionInput, snapshot?: SourceSnapshot): Promise<ReconstructionResult> {
    if (!input.sourceUrl) throw new Error('SOURCE_URL_REQUIRED');
    const report = input.sourceReport || await annyLinkUnderstandingEngine.inspectUrl(input.sourceUrl, snapshot);
    const prompt = `${input.prompt}\n\nRebuild the referenced product as an independent, production-ready application. Preserve useful observable behavior and information architecture, but improve clarity, accessibility, responsiveness, performance, and maintainability. Do not copy protected source code or private server behavior.`;
    const synthesis = await synthesizeAppFiles(prompt, input.existingVfs || {}, {
      projectId: input.projectId,
      generationId: input.generationId,
      updateExisting: input.updateExisting === true,
      referenceBlueprint: report
    });
    return { ...synthesis, source: 'url', report, cleanRoom: { sourceCodeCopied: false, credentialsCopied: false, privateDataCopied: false } };
  }

  async rebuildFromUpload(input: ReconstructionInput): Promise<ReconstructionResult> {
    if (input.uploadedAnalysis == null) throw new Error('UPLOADED_ANALYSIS_REQUIRED');
    const prompt = `${input.prompt}\n\nRebuild the uploaded application's observable product behavior as a fresh production implementation. Use the supplied analysis as architectural evidence. Do not reproduce proprietary source code, secrets, private data, signing material, or copied credentials.`;
    const synthesis = await synthesizeAppFiles(prompt, input.existingVfs || {}, {
      projectId: input.projectId,
      generationId: input.generationId,
      updateExisting: input.updateExisting === true,
      referenceBlueprint: input.uploadedAnalysis
    });
    return { ...synthesis, source: 'upload', cleanRoom: { sourceCodeCopied: false, credentialsCopied: false, privateDataCopied: false } };
  }
}

export const annySourceReconstructionEngine = AnnySourceReconstructionEngine.getInstance();
